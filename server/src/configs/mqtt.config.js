/**
 * MQTT Configuration for HiveMQ
 * Handles connection settings and topic definitions
 */

const mqtt = require('mqtt');

// MQTT Broker Configuration
const MQTT_CONFIG = {
  // HiveMQ Cloud Cluster Configuration
  BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtts://0331c5286d084675b9198021329c7573.s1.eu.hivemq.cloud:8883',
  CLIENT_ID: process.env.MQTT_CLIENT_ID || `water-quality-server-${Date.now()}`,

  // Connection Options
  OPTIONS: {
    // Only include username/password if they are actually set
    ...(process.env.MQTT_USERNAME && { username: process.env.MQTT_USERNAME }),
    ...(process.env.MQTT_PASSWORD && { password: process.env.MQTT_PASSWORD }),
    clean: true, // Clean session - start fresh each time
    connectTimeout: 30000, // 30 second timeout for cloud connection
    reconnectPeriod: 10000,  // 10 second reconnect period (increased to avoid rapid reconnects)
    keepalive: 30, // 30 second keepalive - shorter interval for faster detection
    protocolVersion: 4, // MQTT v3.1.1
    // SSL/TLS options for HiveMQ Cloud
    rejectUnauthorized: true, // Validate HiveMQ certificates properly
    // NO Last Will Testament - Using server polling mode instead
  },

  // Quality of Service
  QOS: {
    AT_MOST_ONCE: 0,    // Fire and forget
    AT_LEAST_ONCE: 1,   // Guaranteed delivery
    EXACTLY_ONCE: 2,    // Guaranteed delivery with no duplicates
  },

  // Topic Structure
  TOPICS: {
    // Device publishes sensor data to these topics
    DEVICE_DATA: 'devices/+/data',           // devices/{deviceId}/data
    DEVICE_REGISTER: 'devices/+/register',   // devices/{deviceId}/register

    // Server publishes commands to these topics
    DEVICE_COMMANDS: 'devices/+/commands',   // devices/{deviceId}/commands

    // Presence detection topics (ACTIVE - Server Polling Mode)
    PRESENCE_QUERY: 'presence/query',         // Server asks "who is online?"
    PRESENCE_RESPONSE: 'presence/response',   // Devices respond "I'm online"
    DEVICE_PRESENCE: 'devices/+/presence',    // Individual device presence (NOT retained)

    // Wildcard subscriptions for server
    ALL_DEVICE_DATA: 'devices/+/data',
    ALL_DEVICE_REGISTER: 'devices/+/register',
    ALL_DEVICE_PRESENCE: 'devices/+/presence',
    ALL_PRESENCE_RESPONSES: 'presence/response',
  },

  // Message Types
  MESSAGE_TYPES: {
    SENSOR_DATA: 'sensor_data',
    DEVICE_STATUS: 'device_status',
    REGISTRATION: 'registration',
    COMMAND: 'command',
  },

  // Commands that server can send to devices
  COMMANDS: {
    GO: 'go',
    WAIT: 'wait',
    DEREGISTER: 'deregister',
    RESTART: 'restart',
  },
};

// Helper functions for topic generation
const generateTopics = {
  // Topics where devices publish
  deviceData: (deviceId) => `devices/${deviceId}/data`,
  deviceRegister: (deviceId) => `devices/${deviceId}/register`,
  devicePresence: (deviceId) => `devices/${deviceId}/presence`,

  // Topics where server publishes commands
  deviceCommands: (deviceId) => `devices/${deviceId}/commands`,
};

module.exports = {
  MQTT_CONFIG,
  generateTopics,
};