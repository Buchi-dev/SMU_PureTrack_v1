const mqtt = require('mqtt');
const {PubSub} = require('@google-cloud/pubsub');
const express = require('express');

// Initialize Pub/Sub client
const pubsub = new PubSub();

// MQTT Configuration - MUST be provided via environment variables
// Store credentials in Google Secret Manager and inject via Cloud Run
const MQTT_CONFIG = {
  broker: process.env.MQTT_BROKER,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  clientId: `bridge_${Math.random().toString(16).slice(3)}`,
};

// Validate required environment variables at startup
function validateEnvironment() {
  const required = ['MQTT_BROKER', 'MQTT_USERNAME', 'MQTT_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please configure these variables in Cloud Run service settings.');
    console.error('See .env.example for required configuration.');
    process.exit(1);
  }
  
  console.log('✓ Environment variables validated');
}

// Validate environment on startup
validateEnvironment();

// Topic mappings: MQTT → Pub/Sub
const TOPIC_MAPPINGS = {
  'device/sensordata/+': 'iot-sensor-readings',
  'device/registration/+': 'iot-device-registration',
  'device/status/+': 'iot-device-status',
};

// Reverse mappings: Pub/Sub → MQTT (for commands)
const COMMAND_SUBSCRIPTION = 'device-commands-sub';

// Phase 3: Message buffering configuration
const BUFFER_INTERVAL_MS = 60000; // Buffer messages for 60 seconds
const messageBuffer = {
  'iot-sensor-readings': [],
  'iot-device-registration': [],
  'iot-device-status': []
};

let mqttClient = null;
let bufferFlushTimer = null;

// Phase 3: Flush buffered messages to Pub/Sub
async function flushMessageBuffer() {
  for (const [pubsubTopicName, messages] of Object.entries(messageBuffer)) {
    if (messages.length === 0) continue;
    
    console.log(`\n📤 Flushing ${messages.length} messages to ${pubsubTopicName}...`);
    
    try {
      const topic = pubsub.topic(pubsubTopicName);
      
      // Publish all buffered messages in batch
      const publishPromises = messages.map(message => 
        topic.publishMessage(message)
      );
      
      await Promise.all(publishPromises);
      
      console.log(`✓ Successfully published ${messages.length} messages to ${pubsubTopicName}`);
      
      // Clear buffer after successful publish
      messageBuffer[pubsubTopicName] = [];
    } catch (error) {
      console.error(`Error flushing buffer for ${pubsubTopicName}:`, error);
      // Keep messages in buffer for retry on next flush
    }
  }
}

// Start periodic buffer flushing
function startBufferFlushTimer() {
  if (bufferFlushTimer) {
    clearInterval(bufferFlushTimer);
  }
  
  bufferFlushTimer = setInterval(async () => {
    await flushMessageBuffer();
  }, BUFFER_INTERVAL_MS);
  
  console.log(`✓ Buffer flush timer started (${BUFFER_INTERVAL_MS / 1000}s interval)`);
}

// Connect to MQTT Broker
function connectMQTT() {
  console.log('Connecting to MQTT broker...');
  
  mqttClient = mqtt.connect(MQTT_CONFIG.broker, {
    clientId: MQTT_CONFIG.clientId,
    username: MQTT_CONFIG.username,
    password: MQTT_CONFIG.password,
    clean: true,
    keepalive: 60,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  });

  mqttClient.on('connect', () => {
    console.log('✓ Connected to MQTT broker');
    
    // Subscribe to all device topics
    Object.keys(TOPIC_MAPPINGS).forEach(topic => {
      mqttClient.subscribe(topic, {qos: 1}, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`✓ Subscribed to MQTT topic: ${topic}`);
        }
      });
    });
    
    // Phase 3: Start buffer flush timer
    startBufferFlushTimer();
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      console.log(`Message received on ${topic}`);
      
      // Find matching Pub/Sub topic
      const pubsubTopic = findPubSubTopic(topic);
      if (!pubsubTopic) {
        console.warn(`No mapping found for MQTT topic: ${topic}`);
        return;
      }

      // Parse message
      const payload = JSON.parse(message.toString());
      
      // Extract device ID from topic (e.g., device/sensordata/arduino_uno_r4_001)
      const deviceId = extractDeviceId(topic);

      // Phase 3: Buffer messages for batch publishing
      // Registration and status messages should be immediate (low frequency)
      const shouldBufferMessage = pubsubTopic === 'iot-sensor-readings';
      
      if (shouldBufferMessage) {
        // Add to buffer
        messageBuffer[pubsubTopic].push({
          json: payload,
          attributes: {
            mqtt_topic: topic,
            device_id: deviceId,
            timestamp: Date.now().toString(),
          },
        });
        console.log(`📦 Buffered message for ${pubsubTopic} (${messageBuffer[pubsubTopic].length} in buffer)`);
      } else {
        // Publish immediately for registration and status
        await pubsub.topic(pubsubTopic).publishMessage({
          json: payload,
          attributes: {
            mqtt_topic: topic,
            device_id: deviceId,
            timestamp: Date.now().toString(),
          },
        });
        console.log(`✓ Forwarded immediately to Pub/Sub topic: ${pubsubTopic}`);
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('MQTT Error:', error);
  });

  mqttClient.on('reconnect', () => {
    console.log('Reconnecting to MQTT broker...');
  });

  mqttClient.on('offline', () => {
    console.log('MQTT client offline');
  });
}

// Find Pub/Sub topic for MQTT topic pattern
function findPubSubTopic(mqttTopic) {
  for (const [pattern, pubsubTopic] of Object.entries(TOPIC_MAPPINGS)) {
    const regex = new RegExp('^' + pattern.replace('+', '[^/]+').replace('#', '.*') + '$');
    if (regex.test(mqttTopic)) {
      return pubsubTopic;
    }
  }
  return null;
}

// Extract device ID from MQTT topic
function extractDeviceId(topic) {
  const parts = topic.split('/');
  return parts[parts.length - 1];
}

// Listen to Pub/Sub for commands to send to devices
async function startCommandListener() {
  console.log('Starting Pub/Sub command listener...');
  
  const subscription = pubsub.subscription(COMMAND_SUBSCRIPTION);

  subscription.on('message', (message) => {
    try {
      const command = message.attributes;
      const mqttTopic = command.mqtt_topic;
      const payload = message.data.toString();

      if (mqttClient && mqttClient.connected) {
        mqttClient.publish(mqttTopic, payload, {qos: 1}, (err) => {
          if (err) {
            console.error('Failed to publish command to MQTT:', err);
            message.nack(); // Retry
          } else {
            console.log(`✓ Published command to MQTT: ${mqttTopic}`);
            message.ack();
          }
        });
      } else {
        console.warn('MQTT client not connected, nacking message');
        message.nack();
      }
    } catch (error) {
      console.error('Error processing Pub/Sub command:', error);
      message.nack();
    }
  });

  subscription.on('error', (error) => {
    console.error('Pub/Sub subscription error:', error);
  });

  console.log('✓ Command listener active');
}

// Health check endpoint for Cloud Run
const app = express();
const PORT = 8080;

app.get('/health', (req, res) => {
  const status = mqttClient && mqttClient.connected ? 'healthy' : 'unhealthy';
  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    mqtt_connected: mqttClient ? mqttClient.connected : false,
    uptime: process.uptime(),
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Phase 3: Flush remaining buffered messages before shutdown
  if (bufferFlushTimer) {
    clearInterval(bufferFlushTimer);
  }
  
  console.log('Flushing remaining messages...');
  await flushMessageBuffer();
  
  if (mqttClient) {
    mqttClient.end();
  }
  
  process.exit(0);
});

// Start the bridge
app.listen(PORT, () => {
  console.log(`MQTT Bridge running on port ${PORT}`);
  connectMQTT();
  startCommandListener();
});