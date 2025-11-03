/**
 * Device Management Constants
 * Error messages, success messages, and validation rules
 *
 * @module constants/deviceManagement.constants
 */

// ===========================
// ERROR MESSAGES
// ===========================

/**
 * Standardized error messages for device management
 * Use these constants for consistent error handling
 */
export const DEVICE_MANAGEMENT_ERRORS = {
  // Validation errors
  MISSING_ACTION: "Action is required",
  INVALID_ACTION: "Invalid action specified",
  MISSING_DEVICE_ID: "Device ID is required",
  MISSING_DEVICE_DATA: "Device data is required",
  MISSING_COMMAND: "Command is required",

  // Device errors
  DEVICE_NOT_FOUND: "Device not found",
  DEVICE_ALREADY_EXISTS: "Device already exists",
  DEVICE_OFFLINE: "Device is offline",

  // Operation errors
  DISCOVERY_FAILED: "Failed to send discovery message",
  COMMAND_SEND_FAILED: "Failed to send command to device",
  ADD_DEVICE_FAILED: "Failed to add device",
  UPDATE_DEVICE_FAILED: "Failed to update device",
  DELETE_DEVICE_FAILED: "Failed to delete device",
  GET_DEVICE_FAILED: "Failed to retrieve device",
  LIST_DEVICES_FAILED: "Failed to list devices",

  // Sensor errors
  NO_SENSOR_READINGS: "No sensor readings found for this device",
  NO_SENSOR_HISTORY: "No sensor history found for this device",
  GET_READINGS_FAILED: "Failed to retrieve sensor readings",
  GET_HISTORY_FAILED: "Failed to retrieve sensor history",

  // Database errors
  FIRESTORE_ERROR: "Firestore operation failed",
  RTDB_ERROR: "Realtime Database operation failed",
  PUBSUB_ERROR: "Pub/Sub operation failed",
} as const;

// ===========================
// SUCCESS MESSAGES
// ===========================

/**
 * Standardized success messages for device management
 * Use these constants for consistent success responses
 */
export const DEVICE_MANAGEMENT_MESSAGES = {
  DISCOVERY_SENT: "Discovery message sent to devices",
  COMMAND_SENT: "Command sent to device successfully",
  DEVICE_ADDED: "Device added successfully",
  DEVICE_UPDATED: "Device updated successfully",
  DEVICE_DELETED: "Device deleted successfully",
  DEVICE_RETRIEVED: "Device retrieved successfully",
  DEVICES_LISTED: "Devices listed successfully",
  READINGS_RETRIEVED: "Sensor readings retrieved successfully",
  HISTORY_RETRIEVED: "Sensor history retrieved successfully",
} as const;

// ===========================
// DEFAULT VALUES
// ===========================

/**
 * Default configuration values for device management
 */
export const DEVICE_DEFAULTS = {
  TYPE: "Arduino UNO R4 WiFi",
  FIRMWARE_VERSION: "1.0.0",
  SENSORS: ["turbidity", "tds", "ph"] as string[],
  STATUS: "online" as const,
  HISTORY_LIMIT: 50,
  MAX_HISTORY_LIMIT: 500,
};

// ===========================
// MQTT TOPICS
// ===========================

/**
 * MQTT topic patterns for device communication
 * CRITICAL: Must match Arduino device topics exactly (case-sensitive)
 */
export const MQTT_TOPICS = {
  DISCOVERY_REQUEST: "device/discovery/request",
  DISCOVERY_RESPONSE: "device/discovery/response",
  REGISTRATION_PREFIX: "device/registration/",
  COMMAND_PREFIX: "device/command/",
  STATUS_PREFIX: "device/status/",
  SENSOR_DATA_PREFIX: "device/sensordata/", // Must be lowercase to match Arduino
} as const;

// ===========================
// PUBSUB TOPICS
// ===========================

/**
 * Google Cloud Pub/Sub topics for device management
 * CRITICAL: Must match mqtt-bridge TOPIC_MAPPINGS and pubsub.constants.ts
 * 
 * NOTE: These constants are duplicated here for backward compatibility.
 * The canonical source of truth is pubsub.constants.ts
 * Import from there if possible: import { PUBSUB_TOPICS } from '../constants/pubsub.constants'
 */
export const PUBSUB_TOPICS = {
  /** Topic for sending commands to devices (via MQTT bridge) */
  DEVICE_COMMANDS: "device-commands",
  
  /** Topic for device registration messages from MQTT bridge */
  DEVICE_REGISTRATION: "iot-device-registration",
  
  /** Topic for device status updates from MQTT bridge */
  DEVICE_STATUS: "iot-device-status",
  
  /** Topic for sensor data from MQTT bridge */
  SENSOR_DATA: "iot-sensor-readings",
} as const;
