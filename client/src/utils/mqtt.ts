/**
 * MQTT WebSocket Client Utility
 *
 * Manages real-time connection to HiveMQ MQTT broker via WebSockets
 * Replaces SSE for better real-time updates and scalability
 * Handles authentication, reconnection, and topic subscriptions
 *
 * @module utils/mqtt
 */

import mqtt from 'mqtt';

// MQTT Broker Configuration for WebSocket connection
const MQTT_CONFIG = {
  BROKER_URL: import.meta.env.VITE_MQTT_BROKER_URL || 'ws://0331c5286d084675b9198021329c7573.s1.eu.hivemq.cloud:8884/mqtt',
  CLIENT_ID: `water-quality-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  OPTIONS: {
    username: import.meta.env.VITE_MQTT_USERNAME || undefined,
    password: import.meta.env.VITE_MQTT_PASSWORD || undefined,
    clean: true,
    connectTimeout: 15000,
    reconnectPeriod: 5000,
    keepalive: 60,
    protocolVersion: 4 as 4, // MQTT v3.1.1
    rejectUnauthorized: false,
  },
};

// MQTT Topics for client subscriptions
export const MQTT_TOPICS = {
  // Device-published topics that frontend subscribes to
  DEVICE_DATA: 'devices/+/data',
  DEVICE_STATUS: 'devices/+/status',

  // Command topic for publishing
  DEVICE_COMMANDS: 'devices/+/commands',
};

// MQTT Client instance
let client: mqtt.MqttClient | null = null;

// Connection state
let isConnecting = false;
let isConnected = false;

// Event listeners registry
// Map: topic -> array of callback functions
const topicListeners = new Map<string, Array<(topic: string, message: any) => void>>();

/**
 * Initialize MQTT WebSocket connection
 */
export async function initializeMQTT(): Promise<void> {
  if (client && isConnected) {
    console.log('[MQTT] Already connected');
    return;
  }

  if (isConnecting) {
    console.log('[MQTT] Connection already in progress');
    return;
  }

  isConnecting = true;

  try {
    console.log('[MQTT] Connecting to broker:', MQTT_CONFIG.BROKER_URL.replace(/\/\/.*@/, '//[CREDENTIALS]@'));

    client = mqtt.connect(MQTT_CONFIG.BROKER_URL, {
      ...MQTT_CONFIG.OPTIONS,
      clientId: MQTT_CONFIG.CLIENT_ID,
    });

    return new Promise((resolve, reject) => {
      if (!client) {
        reject(new Error('Failed to create MQTT client'));
        return;
      }

      client.on('connect', () => {
        console.log('[MQTT] Connected successfully');
        isConnected = true;
        isConnecting = false;

        resolve();
      });

      client.on('error', (error) => {
        console.error('[MQTT] Connection error:', error);
        isConnecting = false;
        reject(error);
      });

      client.on('offline', () => {
        console.log('[MQTT] Connection offline');
        isConnected = false;
      });

      client.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
      });

      client.on('message', (topic, message) => {
        try {
          const messageStr = message.toString();
          const data = JSON.parse(messageStr);

          console.log('[MQTT] Received message:', { topic, data: messageStr.substring(0, 100) + '...' });

          // Notify topic listeners
          const listeners = topicListeners.get(topic) || [];
          listeners.forEach(callback => callback(topic, data));

          // Also notify wildcard listeners
          topicListeners.forEach((listeners, subscribedTopic) => {
            if (subscribedTopic.includes('+') || subscribedTopic.includes('#')) {
              // Simple wildcard matching for + wildcard
              const pattern = subscribedTopic.replace(/\+/g, '[^/]+').replace(/#/g, '.*');
              const regex = new RegExp(`^${pattern}$`);
              if (regex.test(topic)) {
                listeners.forEach(callback => callback(topic, data));
              }
            }
          });

        } catch (error) {
          console.error('[MQTT] Error processing message:', { topic, error: error instanceof Error ? error.message : String(error) });
        }
      });
    });

  } catch (error) {
    console.error('[MQTT] Failed to initialize connection:', error);
    isConnecting = false;
    throw error;
  }
}

/**
 * Disconnect from MQTT broker
 */
export function disconnectMQTT(): void {
  if (client) {
    console.log('[MQTT] Disconnecting...');
    client.end();
    client = null;
    isConnected = false;
    isConnecting = false;
  }
}

/**
 * Subscribe to an MQTT topic
 */
export function subscribeToTopic(topic: string, callback: (topic: string, message: any) => void): void {
  if (!client || !isConnected) {
    console.warn('[MQTT] Cannot subscribe - not connected');
    return;
  }

  // Add listener to registry
  if (!topicListeners.has(topic)) {
    topicListeners.set(topic, []);
  }
  topicListeners.get(topic)!.push(callback);

  // Subscribe to topic
  client.subscribe(topic, { qos: 1 }, (error) => {
    if (error) {
      console.error('[MQTT] Failed to subscribe to topic:', topic, error);
    } else {
      console.log('[MQTT] Subscribed to topic:', topic);
    }
  });
}

/**
 * Unsubscribe from an MQTT topic
 */
export function unsubscribeFromTopic(topic: string, callback?: (topic: string, message: any) => void): void {
  if (!client || !isConnected) {
    console.warn('[MQTT] Cannot unsubscribe - not connected');
    return;
  }

  if (callback) {
    // Remove specific callback
    const listeners = topicListeners.get(topic) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    if (listeners.length === 0) {
      topicListeners.delete(topic);
      client.unsubscribe(topic);
    }
  } else {
    // Remove all listeners for this topic
    topicListeners.delete(topic);
    client.unsubscribe(topic);
  }

  console.log('[MQTT] Unsubscribed from topic:', topic);
}

/**
 * Publish message to MQTT topic
 */
export function publishToTopic(topic: string, message: any, options = {}): void {
  if (!client || !isConnected) {
    console.warn('[MQTT] Cannot publish - not connected');
    return;
  }

  try {
    client.publish(topic, JSON.stringify(message), options);
    console.log('[MQTT] Published to topic:', topic);
  } catch (error) {
    console.error('[MQTT] Failed to publish to topic:', topic, error);
  }
}

/**
 * Send command to specific device
 */
export function sendDeviceCommand(deviceId: string, command: string, data: any = {}): void {
  const topic = `devices/${deviceId}/commands`;
  const message = {
    command,
    timestamp: new Date().toISOString(),
    ...data,
  };

  publishToTopic(topic, message, { qos: 1 });
}