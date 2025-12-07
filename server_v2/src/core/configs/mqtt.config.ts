/**
 * MQTT Configuration for HiveMQ Cloud
 * Handles connection settings, topic definitions, and QoS levels
 * Optimized for heavy load with proper reconnection and keepalive strategies
 */

import { IClientOptions } from 'mqtt';

/**
 * MQTT Quality of Service Levels
 */
export enum MQTTQoS {
  AT_MOST_ONCE = 0, // Fire and forget - no guarantee of delivery
  AT_LEAST_ONCE = 1, // Guaranteed delivery, may have duplicates
  EXACTLY_ONCE = 2, // Guaranteed delivery with no duplicates (highest overhead)
}

/**
 * MQTT Command types that server can send to devices
 */
export enum MQTTCommand {
  GO = 'go', // Start sensor readings
  WAIT = 'wait', // Pause sensor readings
  DEREGISTER = 'deregister', // Remove device registration
  RESTART = 'restart', // Restart device
}

/**
 * MQTT Message types
 */
export enum MQTTMessageType {
  SENSOR_DATA = 'sensor_data',
  DEVICE_STATUS = 'device_status',
  REGISTRATION = 'registration',
  COMMAND = 'command',
  PRESENCE = 'presence',
}

/**
 * MQTT Topic structure
 */
export const MQTT_TOPICS = {
  // Device publishes to these topics
  DEVICE_DATA: 'devices/+/data', // devices/{deviceId}/data
  DEVICE_REGISTER: 'devices/+/register', // devices/{deviceId}/register
  DEVICE_PRESENCE: 'devices/+/presence', // devices/{deviceId}/presence
  DEVICE_STATUS: 'devices/+/status', // devices/{deviceId}/status (LWT - Last Will Testament)

  // Server publishes commands to these topics
  DEVICE_COMMANDS: 'devices/+/commands', // devices/{deviceId}/commands

  // Presence detection topics (Server Polling Mode)
  PRESENCE_QUERY: 'presence/query', // Server asks "who is online?"
  PRESENCE_RESPONSE: 'presence/response', // Devices respond "I'm online"

  // Wildcard subscriptions for server
  ALL_DEVICE_DATA: 'devices/+/data',
  ALL_DEVICE_REGISTER: 'devices/+/register',
  ALL_DEVICE_PRESENCE: 'devices/+/presence',
  ALL_DEVICE_STATUS: 'devices/+/status',
  ALL_PRESENCE_RESPONSES: 'presence/response',
} as const;

/**
 * Topic generation helpers
 */
export const generateTopic = {
  deviceData: (deviceId: string): string => `devices/${deviceId}/data`,
  deviceRegister: (deviceId: string): string => `devices/${deviceId}/register`,
  devicePresence: (deviceId: string): string => `devices/${deviceId}/presence`,
  deviceStatus: (deviceId: string): string => `devices/${deviceId}/status`,
  deviceCommands: (deviceId: string): string => `devices/${deviceId}/commands`,
};

/**
 * MQTT Connection Configuration
 * Optimized for HiveMQ Cloud with proper error handling and reconnection
 */
interface MQTTConfig {
  brokerUrl: string;
  clientId: string;
  options: IClientOptions;
  qos: {
    atMostOnce: MQTTQoS.AT_MOST_ONCE;
    atLeastOnce: MQTTQoS.AT_LEAST_ONCE;
    exactlyOnce: MQTTQoS.EXACTLY_ONCE;
  };
}

/**
 * Create MQTT configuration with environment-based settings
 */
const createMQTTConfig = (): MQTTConfig => {
  const brokerUrl = process.env.MQTT_BROKER_URL || '';
  
  const clientId =  `PureTrack Server-${Date.now()}`;

  // Build connection options
  const options: IClientOptions = {
    // Clean session - start fresh each time to avoid stale subscriptions
    clean: true,

    // Connection timeouts (increased for cloud latency)
    connectTimeout: 30000, // 30 seconds for initial connection
    reconnectPeriod: 10000, // 10 seconds between reconnection attempts
    
    // Keepalive (shorter interval for faster offline detection)
    keepalive: 30, // 30 seconds - good balance for cloud and reliability

    // Protocol version (MQTT v3.1.1 for broad compatibility)
    protocolVersion: 4,

    // SSL/TLS for HiveMQ Cloud
    rejectUnauthorized: true, // Validate certificates properly

    // Authentication (conditionally add if provided)
    ...(process.env.MQTT_USERNAME && { username: process.env.MQTT_USERNAME }),
    ...(process.env.MQTT_PASSWORD && { password: process.env.MQTT_PASSWORD }),

    // No Last Will Testament - using server polling mode for presence
    // This prevents ghost online statuses when connections drop unexpectedly
  };

  return {
    brokerUrl,
    clientId,
    options,
    qos: {
      atMostOnce: MQTTQoS.AT_MOST_ONCE,
      atLeastOnce: MQTTQoS.AT_LEAST_ONCE,
      exactlyOnce: MQTTQoS.EXACTLY_ONCE,
    },
  };
};

/**
 * Export singleton MQTT configuration
 */
export const mqttConfig = createMQTTConfig();

/**
 * Type definitions for MQTT messages
 */

/**
 * Sensor data message structure
 */
export interface SensorDataMessage {
  deviceId: string;
  timestamp: string | Date;
  sensors: {
    pH?: number;
    turbidity?: number;
    tds?: number;
  };
  metadata?: {
    firmwareVersion?: string;
    signalStrength?: number;
    batteryLevel?: number;
  };
}

/**
 * Device registration message structure
 */
export interface DeviceRegistrationMessage {
  deviceId: string;
  deviceName?: string;
  macAddress?: string;
  ipAddress?: string;
  firmwareVersion?: string;
  sensors?: string[];
  location?: string;
  metadata?: Record<string, any>;
}

/**
 * Device presence message structure
 */
export interface DevicePresenceMessage {
  deviceId: string;
  status: 'online' | 'offline';
  timestamp: string | Date;
}

/**
 * Command message structure
 */
export interface CommandMessage {
  command: MQTTCommand;
  timestamp: string | Date;
  parameters?: Record<string, any>;
}

/**
 * Presence query message structure
 */
export interface PresenceQueryMessage {
  queryId: string;
  timestamp: string | Date;
}

/**
 * Presence response message structure
 */
export interface PresenceResponseMessage {
  deviceId: string;
  queryId: string;
  status: 'online';
  timestamp: string | Date;
}

export default mqttConfig;
