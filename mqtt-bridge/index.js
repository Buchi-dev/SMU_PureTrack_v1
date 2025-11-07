require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const { PubSub } = require('@google-cloud/pubsub');
const pino = require('pino');
const compression = require('compression');
const { backOff } = require('exponential-backoff');
const CircuitBreaker = require('opossum');
const promClient = require('prom-client');
const { v4: uuidv4 } = require('uuid');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LOGGER CONFIGURATION (Minimal - errors only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const logger = pino({
  level: process.env.LOG_LEVEL || 'error', // Only critical errors logged
  formatters: { level: (label) => ({ level: label.toUpperCase() }) }
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
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
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
  
  // Hardcoded Memory Monitoring (reduced frequency)
  MEMORY_CHECK_INTERVAL: 60000, // Increased from 30s to 60s to reduce overhead
  MEMORY_WARNING_PERCENT: 90, // Degraded state threshold (90-95%)
  MEMORY_CRITICAL_PERCENT: 95, // Unhealthy state threshold (95-100%)
  
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
//  PROMETHEUS METRICS (Lightweight - only essential metrics)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const register = new promClient.Registry();
// Removed collectDefaultMetrics to save ~10-15MB - add only if needed for monitoring
// promClient.collectDefaultMetrics({ register, prefix: 'nodejs_' });

const messageLatency = new promClient.Histogram({
  name: 'mqtt_message_latency_seconds',
  help: 'End-to-end message processing latency',
  labelNames: ['topic_type'],
  buckets: [0.01, 0.1, 0.5, 1, 5], // Reduced buckets from 8 to 5 for less memory
  registers: [register]
});

const bufferUtilization = new promClient.Gauge({
  name: 'mqtt_buffer_utilization_percent',
  help: 'Message buffer utilization percentage',
  labelNames: ['topic'],
  registers: [register]
});

const publishSuccess = new promClient.Counter({
  name: 'mqtt_publish_success_total',
  help: 'Successful Pub/Sub publishes',
  labelNames: ['topic'],
  registers: [register]
});

const publishFailure = new promClient.Counter({
  name: 'mqtt_publish_failure_total',
  help: 'Failed Pub/Sub publishes',
  labelNames: ['topic', 'error_type'],
  registers: [register]
});

const messagesBuffered = new promClient.Counter({
  name: 'mqtt_messages_buffered_total',
  help: 'Total messages buffered',
  labelNames: ['topic'],
  registers: [register]
});

// Removed messagesDropped counter - not actively used, saves memory

const circuitBreakerStatus = new promClient.Gauge({
  name: 'mqtt_circuit_breaker_open',
  help: 'Circuit breaker status (1=open, 0=closed)',
  registers: [register]
});

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
  messageBuffer: new Map(),
  isShuttingDown: false,
  startTime: Date.now()
};

const metrics = {
  received: 0,
  published: 0,
  failed: 0,
  commands: 0,
  flushes: 0,
  messagesInDLQ: 0,
  circuitBreakerOpen: false
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
  // Circuit breaker opened - tracked by metrics
  metrics.circuitBreakerOpen = true;
  circuitBreakerStatus.set(1);
});

publishBreaker.on('halfOpen', () => {
  // Circuit breaker testing recovery - tracked by metrics
  circuitBreakerStatus.set(0.5);
});

publishBreaker.on('close', () => {
  // Circuit breaker closed - tracked by metrics
  metrics.circuitBreakerOpen = false;
  circuitBreakerStatus.set(0);
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

const addToBuffer = (topicName, message, priority = 'normal') => {
  if (!state.messageBuffer.has(topicName)) {
    state.messageBuffer.set(topicName, []);
  }

  const buffer = state.messageBuffer.get(topicName);
  buffer.push({ ...message, priority });
  metrics.received++;
  messagesBuffered.labels(topicName).inc();

  // Adaptive flush at threshold
  const utilization = buffer.length / CONFIG.MAX_BUFFER_SIZE;
  if (utilization >= CONFIG.BUFFER_FLUSH_THRESHOLD) {
    // Removed info logger - flushing is tracked by metrics
    flushMessageBuffer(topicName);
  }

  // Check total across all buffers
  const totalMessages = Array.from(state.messageBuffer.values())
    .reduce((sum, buf) => sum + buf.length, 0);
  if (totalMessages >= CONFIG.MAX_BUFFER_SIZE) {
    flushAllBuffers();
  }
};

const flushMessageBuffer = async (topicName) => {
  const messages = state.messageBuffer.get(topicName) || [];
  if (messages.length === 0) return;

  const chunkSize = 100; // Reduced from 500 to process smaller batches (less memory peaks)
  // Removed info logger - not critical
  metrics.flushes++;

  try {
    const topic = pubSubClient.topic(topicName);

    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);

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
              // Removed warn logger - retry is expected behavior
              return true;
            }
          }
        );

        publishSuccess.labels(topicName).inc(chunk.length);
        metrics.published += chunk.length;
        
        // Clear chunk from memory immediately after successful publish
        chunk.length = 0;
      } catch (error) {
        publishFailure.labels(topicName, error.name).inc(chunk.length);
        metrics.failed += chunk.length;
        logger.error(
          { topic: topicName, error: error.message },
          'Chunk publish failed'
        );
        throw error;
      }
    }

    // Clear buffer and help GC by setting to new array
    state.messageBuffer.set(topicName, []);
    // Removed info logger - success is tracked by metrics
  } catch (error) {
    logger.error({ topic: topicName, error: error.message }, 'Flush failed');
  }
};

const flushAllBuffers = async () => {
  const topics = Array.from(state.messageBuffer.keys());
  await Promise.allSettled(topics.map(flushMessageBuffer));
};

const startBufferFlusher = () => {
  state.bufferIntervalId = setInterval(() => {
    if (!state.isShuttingDown) {
      flushAllBuffers();
    }
  }, CONFIG.BUFFER_INTERVAL_MS);
  // Removed info logger - startup is tracked by health endpoint
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MEMORY MONITORING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const startMemoryMonitoring = () => {
  state.memoryCheckIntervalId = setInterval(() => {
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (memPercent > CONFIG.MEMORY_CRITICAL_PERCENT) {
      logger.error(
        { memPercent: Math.round(memPercent), rss: Math.round(memUsage.rss / 1024 / 1024) },
        'Critical memory usage detected'
      );
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      // Emergency buffer flush to free memory
      flushAllBuffers().catch(err => logger.error({ err: err.message }, 'Emergency flush failed'));
    }
    // Removed warn logger for high memory - tracked by /health endpoint
  }, CONFIG.MEMORY_CHECK_INTERVAL);
  // Removed info logger - startup is tracked by health endpoint
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DEAD LETTER QUEUE - REMOVED (Not used, saves memory)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DLQ functionality removed as it's never called in the codebase
// This saves the overhead of maintaining DLQ topic connections

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MQTT HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const handleMQTTMessage = (topic, message) => {
  // Removed uuid generation for correlation ID to save memory/CPU
  const startTime = Date.now();

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
      // Removed warn logger - unmatched topics are not critical errors
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
        // Removed correlationId to save memory
      }
    };

    addToBuffer(pubSubTopic, messageData, priority);

    const processingTime = Date.now() - startTime;
    messageLatency.labels(isRegistration ? 'registration' : 'telemetry').observe(processingTime / 1000);
    // Removed debug logger - message buffering is tracked by metrics
  } catch (error) {
    logger.error({ topic, error: error.message }, 'Message handling failed');
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

  // Removed info logger - connection status tracked by /health endpoint
  state.mqttClient = mqtt.connect(CONFIG.MQTT_BROKER_URL, options);

  state.mqttClient.on('connect', () => {
    // Removed info logger - connection status tracked by /health endpoint

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
        }
        // Removed info logger - subscription success is not critical
      });
    });

    startBufferFlusher();
    startMemoryMonitoring();
  });

  state.mqttClient.on('message', handleMQTTMessage);
  state.mqttClient.on('error', (error) => logger.error({ error: error.message }, 'MQTT error'));
  // Removed warn loggers for reconnect/close/offline - tracked by /health endpoint
  state.mqttClient.on('reconnect', () => {});
  state.mqttClient.on('close', () => {});
  state.mqttClient.on('offline', () => {});
};

// Command subscription removed - not used in UI

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HTTP SERVER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const app = express();
app.disable('x-powered-by');

// CORS Configuration - Whitelist production and development origins
const allowedOrigins = [
  'https://my-app-da530.web.app',
  'https://my-app-da530.firebaseapp.com', // Firebase also provides this URL
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Removed warn logger - CORS blocking is not critical to log
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
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

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
        percent: Math.round(memPercent)
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

  // Determine health status
  if (!state.mqttClient?.connected) {
    health.status = 'unhealthy';
  } else if (memPercent > CONFIG.MEMORY_CRITICAL_PERCENT) {
    health.status = 'unhealthy';
  } else if (
    memPercent > CONFIG.MEMORY_WARNING_PERCENT ||
    Object.values(health.checks.buffers).some(b => b.utilization > 80)
  ) {
    health.status = 'degraded';
  }

  //res status must be 200 event its degraded or unhealthy
  res.status(200).json(health);
});

app.get('/metrics', async (req, res) => {
  // Update current metrics
  for (const [topicName, buffer] of state.messageBuffer.entries()) {
    const utilization = (buffer.length / CONFIG.MAX_BUFFER_SIZE) * 100;
    bufferUtilization.set({ topic: topicName }, utilization);
  }

  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/status', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
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
  // Removed info logger - shutdown is expected behavior
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

    // Flush remaining messages (no logger - expected behavior)
    await Promise.race([
      flushAllBuffers(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Flush timeout')), 5000)
      )
    ]);

    // Close MQTT connection (no logger - expected behavior)
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
    // Removed info logger - shutdown complete is expected
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
    // Removed startup info loggers - not critical
    validateConfig();

    initializeBuffers();
    initializeMQTTClient();

    const server = app.listen(CONFIG.PORT, '0.0.0.0', () => {
      // Removed info loggers - server status tracked by /health endpoint
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