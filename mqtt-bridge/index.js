require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const { PubSub } = require('@google-cloud/pubsub');
const pino = require('pino');
const compression = require('compression');
const { backOff } = require('exponential-backoff');
const CircuitBreaker = require('opossum');
const os = require('os');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LOGGER CONFIGURATION (Structured logging with levels)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const logger = pino({
  level: process.env.LOG_LEVEL,
  formatters: { 
    level: (label) => ({ level: label.toUpperCase() }),
    bindings: (bindings) => ({ pid: bindings.pid, hostname: bindings.hostname })
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIG = {
  // Environment Variables (Credentials & Sensitive Only)
  PROJECT_ID: process.env.GCP_PROJECT_ID,
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL,
  MQTT_USERNAME: process.env.MQTT_USERNAME,
  MQTT_PASSWORD: process.env.MQTT_PASSWORD,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  
  // CORS Configuration (from environment)
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  
  // Hardcoded Pub/Sub Topics
  PUBSUB_TOPIC: 'iot-sensor-readings',
  PUBSUB_DEVICE_REGISTRATION_TOPIC: 'iot-device-registration',
  PUBSUB_DLQ_TOPIC: 'iot-failed-messages-dlq',
  
  // Hardcoded Buffer Settings (optimized for 10-15 devices, memory-efficient)
  BUFFER_INTERVAL_MS: 5000, // Reduced from 10s to flush faster (less memory retention)
  MAX_BUFFER_SIZE: 100, // Reduced from 200 to lower memory footprint
  BUFFER_FLUSH_THRESHOLD: 0.7, // Flush earlier to prevent memory buildup
  
  // Hardcoded MQTT Settings
  MQTT_KEEPALIVE: 120,
  MQTT_RECONNECT_PERIOD: 5000,
  QOS_SENSOR_DATA: 0,
  QOS_REGISTRATION: 1,
  
  // Hardcoded Pub/Sub Batching Settings (memory-optimized)
  PUBSUB_MAX_MESSAGES: 100, // Reduced from 500 to minimize buffer allocation
  PUBSUB_MAX_MILLIS: 100, // Increased from 50ms to batch efficiently with fewer messages
  PUBSUB_MAX_BYTES: 1 * 1024 * 1024, // Reduced from 5MB to 1MB
  
  // Hardcoded Memory Monitoring (RSS-based for Cloud Run 256MB limit)
  MEMORY_CHECK_INTERVAL: 60000, // Increased from 30s to 60s to reduce overhead
  RSS_WARNING_PERCENT: 90, // Degraded state threshold (90-95% of 256MB)
  RSS_CRITICAL_PERCENT: 95, // Unhealthy state threshold (95-100% of 256MB)
  RAM_LIMIT_BYTES: 256 * 1024 * 1024, // 256MB Cloud Run limit
  
  // Hardcoded CPU Monitoring
  CPU_CHECK_INTERVAL: 5000, // Check CPU every 5 seconds
  CPU_WARNING_PERCENT: 70, // Degraded state threshold (70-85%)
  CPU_CRITICAL_PERCENT: 85, // Unhealthy state threshold (85-100%)
  
  // Hardcoded Graceful Shutdown
  SHUTDOWN_GRACE_PERIOD: 8000
};

const validateConfig = () => {
  const required = {
    PROJECT_ID: 'GCP_PROJECT_ID',
    MQTT_BROKER_URL: 'MQTT_BROKER_URL',
    MQTT_USERNAME: 'MQTT_USERNAME',
    MQTT_PASSWORD: 'MQTT_PASSWORD'
  };
  const missing = Object.entries(required)
    .filter(([key]) => !CONFIG[key])
    .map(([, envVar]) => envVar);
  
  if (missing.length > 0) {
    logger.error({ missing }, 'Missing required environment variables');
    throw new Error(`Missing: ${missing.join(', ')}`);
  }
};


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CLIENTS INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const pubSubClient = new PubSub({
  projectId: CONFIG.PROJECT_ID,
  batching: {
    maxMessages: CONFIG.PUBSUB_MAX_MESSAGES,
    maxMilliseconds: CONFIG.PUBSUB_MAX_MILLIS,
    maxBytes: CONFIG.PUBSUB_MAX_BYTES
  }
});

const TOPIC_MAPPINGS = {
  'device/sensordata/+': CONFIG.PUBSUB_TOPIC,
  'device/registration/+': CONFIG.PUBSUB_DEVICE_REGISTRATION_TOPIC
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STATE MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const state = {
  mqttClient: null,
  bufferIntervalId: null,
  memoryCheckIntervalId: null,
  cpuCheckIntervalId: null,
  messageBuffer: new Map(),
  isShuttingDown: false,
  startTime: Date.now(),
  lastCpuUsage: null,
  lastCpuCheck: null,
  flushInProgress: new Map() // Track ongoing flushes per topic
};

const metrics = {
  received: 0,
  published: 0,
  failed: 0,
  flushes: 0,
  droppedUnmatched: 0,
  droppedBufferFull: 0,
  circuitBreakerOpen: false
};

const cpuMetrics = {
  current: 0,
  average: 0,
  peak: 0,
  samples: []
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CIRCUIT BREAKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const publishBreaker = new CircuitBreaker(
  async (topic, messages) => {
    return await Promise.all(messages.map(msg => topic.publishMessage(msg)));
  },
  {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    name: 'pub-sub-publish'
  }
);

publishBreaker.on('open', () => {
  metrics.circuitBreakerOpen = true;
  logger.error({ 
    breaker: 'pub-sub-publish',
    state: 'open' 
  }, 'Circuit breaker opened - Pub/Sub publishing halted');
});

publishBreaker.on('halfOpen', () => {
  logger.warn({ 
    breaker: 'pub-sub-publish',
    state: 'half-open' 
  }, 'Circuit breaker testing recovery');
});

publishBreaker.on('close', () => {
  metrics.circuitBreakerOpen = false;
  logger.info({ 
    breaker: 'pub-sub-publish',
    state: 'closed' 
  }, 'Circuit breaker closed - Pub/Sub publishing resumed');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BUFFER MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const initializeBuffers = () => {
  const uniqueTopics = new Set(Object.values(TOPIC_MAPPINGS));
  uniqueTopics.forEach(topic => {
    if (!state.messageBuffer.has(topic)) {
      state.messageBuffer.set(topic, []);
    }
  });
};

const addToBuffer = async (topicName, message, priority = 'normal') => {
  if (!state.messageBuffer.has(topicName)) {
    state.messageBuffer.set(topicName, []);
  }

  const buffer = state.messageBuffer.get(topicName);
  
  // Check if buffer is full - drop message with metrics
  if (buffer.length >= CONFIG.MAX_BUFFER_SIZE) {
    metrics.droppedBufferFull++;
    logger.error({ 
      topic: topicName, 
      bufferSize: buffer.length,
      droppedTotal: metrics.droppedBufferFull 
    }, 'Buffer full - message dropped (DATA LOSS)');
    return;
  }
  
  buffer.push({ ...message, priority });
  metrics.received++;

  // Adaptive flush at threshold - AWAIT to prevent race conditions
  const utilization = buffer.length / CONFIG.MAX_BUFFER_SIZE;
  if (utilization >= CONFIG.BUFFER_FLUSH_THRESHOLD && !state.flushInProgress.get(topicName)) {
    logger.info({ 
      topic: topicName, 
      bufferSize: buffer.length, 
      utilization: Math.round(utilization * 100) 
    }, 'Buffer threshold reached - triggering flush');
    await flushMessageBuffer(topicName);
  }

  // Check total across all buffers
  const totalMessages = Array.from(state.messageBuffer.values())
    .reduce((sum, buf) => sum + buf.length, 0);
  if (totalMessages >= CONFIG.MAX_BUFFER_SIZE) {
    await flushAllBuffers();
  }
};

const flushMessageBuffer = async (topicName) => {
  // Prevent concurrent flushes of same topic (race condition fix)
  if (state.flushInProgress.get(topicName)) {
    logger.debug({ topic: topicName }, 'Flush already in progress - skipping');
    return;
  }
  
  const messages = state.messageBuffer.get(topicName) || [];
  if (messages.length === 0) return;

  state.flushInProgress.set(topicName, true);
  const messageCount = messages.length;
  const chunkSize = 100;
  
  logger.info({ 
    topic: topicName, 
    messageCount 
  }, 'Starting buffer flush');
  
  metrics.flushes++;

  try {
    const topic = pubSubClient.topic(topicName);
    
    // Take snapshot of messages and clear buffer immediately (prevents duplicates)
    const messagesToPublish = [...messages];
    state.messageBuffer.set(topicName, []);

    for (let i = 0; i < messagesToPublish.length; i += chunkSize) {
      const chunk = messagesToPublish.slice(i, i + chunkSize);

      // Use circuit breaker with retry
      try {
        await backOff(
          async () => {
            return await publishBreaker.fire(topic, chunk);
          },
          {
            delayFirstAttempt: false,
            startingDelay: 100,
            timeMultiple: 2,
            maxDelay: 5000,
            numOfAttempts: 3,
            jitter: 'full',
            retry: (error, attemptNumber) => {
              logger.warn({ 
                topic: topicName, 
                attempt: attemptNumber, 
                error: error.message 
              }, 'Publish retry attempt');
              return true;
            }
          }
        );

        metrics.published += chunk.length;
      } catch (error) {
        metrics.failed += chunk.length;
        logger.error(
          { topic: topicName, chunkSize: chunk.length, error: error.message },
          'Chunk publish failed after retries (DATA LOSS)'
        );
        // NOTE: Messages are lost here - no DLQ implemented
        // Consider implementing persistence layer for production
      }
    }

    logger.info({ 
      topic: topicName, 
      published: messageCount - metrics.failed,
      failed: metrics.failed 
    }, 'Buffer flush completed');
  } catch (error) {
    logger.error({ topic: topicName, error: error.message, stack: error.stack }, 'Flush failed');
  } finally {
    state.flushInProgress.set(topicName, false);
  }
};

const flushAllBuffers = async () => {
  const topics = Array.from(state.messageBuffer.keys());
  await Promise.allSettled(topics.map(flushMessageBuffer));
};

const startBufferFlusher = () => {
  state.bufferIntervalId = setInterval(async () => {
    if (!state.isShuttingDown) {
      await flushAllBuffers();
    }
  }, CONFIG.BUFFER_INTERVAL_MS);
  logger.info({ 
    intervalMs: CONFIG.BUFFER_INTERVAL_MS 
  }, 'Buffer flusher started');
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MEMORY MONITORING (RSS-based)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const startMemoryMonitoring = () => {
  state.memoryCheckIntervalId = setInterval(async () => {
    const memUsage = process.memoryUsage();
    
    // Calculate RSS percentage against Cloud Run 256MB limit
    const RAM_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB
    const rssPercent = (memUsage.rss / RAM_LIMIT_BYTES) * 100;
    
    // Use RSS-based thresholds for monitoring
    const RSS_WARNING_PERCENT = 90;
    const RSS_CRITICAL_PERCENT = 95;

    if (rssPercent > RSS_CRITICAL_PERCENT) {
      logger.error(
        { 
          rssPercent: Math.round(rssPercent), 
          rssMB: Math.round(memUsage.rss / 1024 / 1024),
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          bufferCount: Array.from(state.messageBuffer.values()).reduce((sum, buf) => sum + buf.length, 0)
        },
        'Critical RSS memory usage - flushing buffers'
      );
      
      // Emergency buffer flush to free memory (removed manual GC call)
      await flushAllBuffers().catch(err => 
        logger.error({ err: err.message }, 'Emergency flush failed')
      );
    } else if (rssPercent > RSS_WARNING_PERCENT) {
      logger.warn(
        { 
          rssPercent: Math.round(rssPercent), 
          rssMB: Math.round(memUsage.rss / 1024 / 1024) 
        },
        'High RSS memory usage detected'
      );
    }
  }, CONFIG.MEMORY_CHECK_INTERVAL);
  
  logger.info({ 
    intervalMs: CONFIG.MEMORY_CHECK_INTERVAL,
    limitMB: 256 
  }, 'Memory monitoring started');
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CPU MONITORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const calculateCpuUsage = () => {
  const cpuUsage = process.cpuUsage(state.lastCpuUsage);
  const currentTime = Date.now();
  
  if (state.lastCpuCheck) {
    const timeDiff = (currentTime - state.lastCpuCheck) * 1000; // Convert to microseconds
    
    // Calculate CPU percentage (user + system time / elapsed time)
    const totalCpuTime = cpuUsage.user + cpuUsage.system;
    const cpuPercentPerCore = (totalCpuTime / timeDiff) * 100;
    
    // FIXED: Normalize by number of CPU cores for accurate system CPU usage
    const numCores = os.cpus().length;
    const actualCpuPercent = cpuPercentPerCore / numCores;
    
    // Update CPU metrics
    cpuMetrics.current = Math.min(Math.round(actualCpuPercent * 100) / 100, 100); // Round to 2 decimals, cap at 100
    
    // Track samples for average (keep last 12 samples = 1 minute at 5s intervals)
    cpuMetrics.samples.push(cpuMetrics.current);
    if (cpuMetrics.samples.length > 12) {
      cpuMetrics.samples.shift();
    }
    
    // Calculate average
    cpuMetrics.average = Math.round(
      (cpuMetrics.samples.reduce((a, b) => a + b, 0) / cpuMetrics.samples.length) * 100
    ) / 100;
    
    // Track peak
    if (cpuMetrics.current > cpuMetrics.peak) {
      cpuMetrics.peak = cpuMetrics.current;
    }
    
    // Log critical CPU usage
    if (cpuMetrics.current > CONFIG.CPU_CRITICAL_PERCENT) {
      logger.error(
        { 
          cpuPercent: cpuMetrics.current, 
          average: cpuMetrics.average,
          cores: numCores 
        },
        'Critical CPU usage detected'
      );
    } else if (cpuMetrics.current > CONFIG.CPU_WARNING_PERCENT) {
      logger.warn(
        { 
          cpuPercent: cpuMetrics.current, 
          average: cpuMetrics.average 
        },
        'High CPU usage detected'
      );
    }
  }
  
  // Update state for next calculation
  state.lastCpuUsage = process.cpuUsage();
  state.lastCpuCheck = currentTime;
};

const startCpuMonitoring = () => {
  // Initialize baseline
  state.lastCpuUsage = process.cpuUsage();
  state.lastCpuCheck = Date.now();
  
  state.cpuCheckIntervalId = setInterval(() => {
    if (!state.isShuttingDown) {
      calculateCpuUsage();
    }
  }, CONFIG.CPU_CHECK_INTERVAL);
  
  logger.info({ 
    intervalMs: CONFIG.CPU_CHECK_INTERVAL,
    cores: os.cpus().length 
  }, 'CPU monitoring started');
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DEAD LETTER QUEUE - REMOVED (Not used, saves memory)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DLQ functionality removed as it's never called in the codebase
// This saves the overhead of maintaining DLQ topic connections

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MQTT HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const handleMQTTMessage = async (topic, message) => {
  try {
    let data = message.toString();
    try {
      data = JSON.parse(data);
    } catch {}

    const matchedTopic = Object.keys(TOPIC_MAPPINGS).find(pattern => {
      const regex = new RegExp(`^${pattern.replace(/\+/g, '[^/]+')}$`);
      return regex.test(topic);
    });

    if (!matchedTopic) {
      metrics.droppedUnmatched++;
      logger.warn({ 
        topic, 
        droppedTotal: metrics.droppedUnmatched 
      }, 'Unmatched MQTT topic - message dropped');
      return;
    }

    const pubSubTopic = TOPIC_MAPPINGS[matchedTopic];
    const deviceId = topic.split('/').pop();
    const isRegistration = pubSubTopic === CONFIG.PUBSUB_DEVICE_REGISTRATION_TOPIC;
    const priority = isRegistration ? 'urgent' : 'normal';

    const messageData = {
      data: Buffer.from(JSON.stringify(data)),
      attributes: {
        device_id: deviceId,          // snake_case for Pub/Sub compatibility
        deviceId: deviceId,            // Keep camelCase for backward compatibility
        topic: topic,
        timestamp: new Date().toISOString(),
        source: 'mqtt-bridge'
      }
    };

    await addToBuffer(pubSubTopic, messageData, priority);
  } catch (error) {
    logger.error({ topic, error: error.message, stack: error.stack }, 'Message handling failed');
  }
};

const initializeMQTTClient = () => {
  const options = {
    username: CONFIG.MQTT_USERNAME,
    password: CONFIG.MQTT_PASSWORD,
    clientId: `mqtt_bridge_${Date.now()}_${process.pid}`,
    reconnectPeriod: CONFIG.MQTT_RECONNECT_PERIOD,
    keepalive: CONFIG.MQTT_KEEPALIVE,
    protocolVersion: 4, // Changed from v5 to v4 - less memory overhead
    clean: true,
    rejectUnauthorized: true,
    will: {
      topic: 'bridge/status',
      payload: JSON.stringify({
        status: 'offline',
        timestamp: Date.now(),
        reason: 'connection-lost'
      }),
      qos: 1,
      retain: true
    }
  };

  logger.info({ 
    broker: CONFIG.MQTT_BROKER_URL,
    clientId: options.clientId 
  }, 'Connecting to MQTT broker');
  
  state.mqttClient = mqtt.connect(CONFIG.MQTT_BROKER_URL, options);

  state.mqttClient.on('connect', () => {
    logger.info({ 
      broker: CONFIG.MQTT_BROKER_URL,
      clientId: options.clientId 
    }, 'MQTT connected successfully');

    // Publish bridge status
    state.mqttClient.publish(
      'bridge/status',
      JSON.stringify({
        status: 'online',
        timestamp: Date.now(),
        clientId: options.clientId,
        config: {
          bufferInterval: CONFIG.BUFFER_INTERVAL_MS,
          maxBufferSize: CONFIG.MAX_BUFFER_SIZE,
          keepalive: CONFIG.MQTT_KEEPALIVE
        }
      }),
      { qos: 1, retain: true }
    );

    // Subscribe to topics
    Object.keys(TOPIC_MAPPINGS).forEach(topic => {
      const qos = topic.includes('registration') ? CONFIG.QOS_REGISTRATION : CONFIG.QOS_SENSOR_DATA;
      state.mqttClient.subscribe(topic, { qos }, (err) => {
        if (err) {
          logger.error({ topic, error: err.message }, 'Subscription failed');
        } else {
          logger.info({ topic, qos }, 'Subscribed to MQTT topic');
        }
      });
    });

    startBufferFlusher();
    startMemoryMonitoring();
    startCpuMonitoring();
  });

  state.mqttClient.on('message', handleMQTTMessage);
  state.mqttClient.on('error', (error) => 
    logger.error({ error: error.message }, 'MQTT error')
  );
  state.mqttClient.on('reconnect', () => 
    logger.warn('MQTT reconnecting...')
  );
  state.mqttClient.on('close', () => 
    logger.warn('MQTT connection closed')
  );
  state.mqttClient.on('offline', () => 
    logger.warn('MQTT offline')
  );
};

// Command subscription removed - not used in UI

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HTTP SERVER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const app = express();
app.disable('x-powered-by');

// CORS Configuration - Origins from environment variable
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (CONFIG.ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ 
        origin, 
        allowedOrigins: CONFIG.ALLOWED_ORIGINS 
      }, 'CORS blocked request from unauthorized origin');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.use(compression());
app.use(express.json());

app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  
  // Calculate RSS percentage against Cloud Run 256MB limit
  const RAM_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB
  const rssPercent = (memUsage.rss / RAM_LIMIT_BYTES) * 100;

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      mqtt: {
        connected: state.mqttClient?.connected || false,
        clientId: state.mqttClient?.options.clientId || 'not-initialized'
      },
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        rssPercent: Math.round(rssPercent), // RSS-based percentage
        percent: Math.round(rssPercent) // Use RSS percent for health calculations
      },
      cpu: {
        current: cpuMetrics.current,
        average: cpuMetrics.average,
        peak: cpuMetrics.peak,
        percent: Math.round(cpuMetrics.current)
      },
      buffers: {}
    },
    metrics
  };

  // Buffer utilization checks
  for (const [topicName, buffer] of state.messageBuffer.entries()) {
    const utilization = (buffer.length / CONFIG.MAX_BUFFER_SIZE) * 100;
    health.checks.buffers[topicName] = {
      messages: buffer.length,
      utilization: Math.round(utilization)
    };
  }

  // Determine health status based on RSS memory and CPU usage
  // RSS thresholds: 90% warning, 95% critical (for 256MB limit)
  const RSS_WARNING_PERCENT = 90;
  const RSS_CRITICAL_PERCENT = 95;
  
  let httpStatusCode = 200;
  
  if (!state.mqttClient?.connected) {
    health.status = 'unhealthy';
    httpStatusCode = 503;
  } else if (
    rssPercent > RSS_CRITICAL_PERCENT ||
    cpuMetrics.current > CONFIG.CPU_CRITICAL_PERCENT ||
    metrics.circuitBreakerOpen
  ) {
    health.status = 'unhealthy';
    httpStatusCode = 503;
  } else if (
    rssPercent > RSS_WARNING_PERCENT ||
    cpuMetrics.current > CONFIG.CPU_WARNING_PERCENT ||
    Object.values(health.checks.buffers).some(b => b.utilization > 80)
  ) {
    health.status = 'degraded';
    httpStatusCode = 200; // Degraded still returns 200 (service operational but stressed)
  }

  // FIXED: Return proper HTTP status codes for health checks
  // 200 = healthy/degraded, 503 = unhealthy (triggers load balancer failover)
  res.status(httpStatusCode).json(health);
});

app.get('/status', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: {
      current: cpuMetrics.current,
      average: cpuMetrics.average,
      peak: cpuMetrics.peak
    },
    metrics,
    buffers: Object.fromEntries(
      Array.from(state.messageBuffer.entries()).map(([k, v]) => [k, v.length])
    ),
    mqtt: {
      connected: state.mqttClient?.connected || false
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GRACEFUL SHUTDOWN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const gracefulShutdown = async (signal) => {
  logger.info({ signal }, 'Graceful shutdown initiated');
  state.isShuttingDown = true;

  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, CONFIG.SHUTDOWN_GRACE_PERIOD);

  try {
    // Stop accepting new messages
    if (state.bufferIntervalId) {
      clearInterval(state.bufferIntervalId);
      state.bufferIntervalId = null;
    }

    if (state.memoryCheckIntervalId) {
      clearInterval(state.memoryCheckIntervalId);
      state.memoryCheckIntervalId = null;
    }

    if (state.cpuCheckIntervalId) {
      clearInterval(state.cpuCheckIntervalId);
      state.cpuCheckIntervalId = null;
    }

    // Flush remaining messages
    logger.info('Flushing remaining buffers before shutdown');
    await Promise.race([
      flushAllBuffers(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Flush timeout')), 5000)
      )
    ]);

    // Close MQTT connection
    logger.info('Closing MQTT connection');
    if (state.mqttClient?.connected) {
      state.mqttClient.publish(
        'bridge/status',
        JSON.stringify({
          status: 'offline',
          timestamp: Date.now(),
          reason: 'graceful-shutdown'
        }),
        { qos: 1, retain: true }
      );

      await new Promise((resolve) => {
        state.mqttClient.end(false, resolve);
      });
    }

    clearTimeout(shutdownTimeout);
    logger.info({ 
      signal,
      uptime: process.uptime(),
      metrics 
    }, 'Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Shutdown error');
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STARTUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const start = async () => {
  try {
    logger.info({ 
      nodeVersion: process.version,
      platform: process.platform,
      env: CONFIG.NODE_ENV 
    }, 'MQTT Bridge starting');
    
    validateConfig();
    
    logger.info({ 
      projectId: CONFIG.PROJECT_ID,
      topics: TOPIC_MAPPINGS 
    }, 'Configuration validated');

    initializeBuffers();
    initializeMQTTClient();

    const server = app.listen(CONFIG.PORT, '0.0.0.0', () => {
      logger.info({ 
        port: CONFIG.PORT,
        allowedOrigins: CONFIG.ALLOWED_ORIGINS,
        bufferConfig: {
          intervalMs: CONFIG.BUFFER_INTERVAL_MS,
          maxSize: CONFIG.MAX_BUFFER_SIZE,
          flushThreshold: CONFIG.BUFFER_FLUSH_THRESHOLD
        }
      }, 'HTTP server listening - MQTT Bridge ready');
      
      // DATA LOSS WARNING
      logger.warn({
        qosSensorData: CONFIG.QOS_SENSOR_DATA,
        bufferIntervalMs: CONFIG.BUFFER_INTERVAL_MS,
        maxBufferSize: CONFIG.MAX_BUFFER_SIZE
      }, 'WARNING: No message persistence layer - data loss possible on crash (up to buffer size)');
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error({ error: error.message }, 'Server error');
      process.exit(1);
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Startup failed');
    process.exit(1);
  }
};

start();