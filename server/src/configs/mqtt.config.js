/**
 * MQTT Configuration for HiveMQ (Backend Server)
 * 
 * SECURITY ARCHITECTURE:
 * - Backend: FULL ACCESS (read all topics, write commands)
 * - Frontend: READ ONLY (subscribes to data/presence, NO publish rights)
 * - Devices: LIMITED (publish data, subscribe to commands for own deviceId)
 * 
 * See MQTT_PERMISSIONS.md for complete security setup guide
 */

const mqtt = require('mqtt');

// MQTT Broker Configuration
const MQTT_CONFIG = {
  // HiveMQ Cloud Cluster Configuration
  BROKER_URL: process.env.MQTT_BROKER_URL,
  // Generate unique client ID with timestamp to prevent conflicts
  CLIENT_ID: `water-quality-server-${Date.now()}`,

  // Connection Options (Optimized for HiveMQ Cloud stability)
  OPTIONS: {
    // Only include username/password if they are actually set
    ...(process.env.MQTT_USERNAME && { username: process.env.MQTT_USERNAME }),
    ...(process.env.MQTT_PASSWORD && { password: process.env.MQTT_PASSWORD }),
    clean: true, // Clean session - start fresh each time
    connectTimeout: 30000, // 30 second timeout for cloud connection
    reconnectPeriod: 5000,  // 5 second reconnect period (faster recovery)
    keepalive: 60, // 60 second keepalive (HiveMQ Cloud recommended: longer is more stable)
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

  // Commands that backend server can send to devices via MQTT
  // ✅ SECURITY: Frontend calls REST API, backend validates & sends commands
  // ✅ All commands are logged and require admin authentication
  COMMANDS: {
    GO: 'go',                 // Approve device - sent by backend during device approval
    DEREGISTER: 'deregister', // Revoke approval - sent by backend during device deletion
    RESTART: 'restart',       // Restart device - sent by backend via /api/v1/devices/:id/command
    SEND_NOW: 'send_now',     // Force data transmission - sent by backend via /api/v1/devices/:id/command
    // REMOVED: 'wait' - Device has no handler
    // REMOVED: 'update_config' - Never implemented
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