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

  // Device errors
  DEVICE_NOT_FOUND: "Device not found",
  DEVICE_ALREADY_EXISTS: "Device already exists",

  // Operation errors
  ADD_DEVICE_FAILED: "Failed to add device",
  UPDATE_DEVICE_FAILED: "Failed to update device",
  DELETE_DEVICE_FAILED: "Failed to delete device",

  // Database errors
  FIRESTORE_ERROR: "Firestore operation failed",
  RTDB_ERROR: "Realtime Database operation failed",
} as const;

// ===========================
// SUCCESS MESSAGES
// ===========================

/**
 * Standardized success messages for device management
 * Use these constants for consistent success responses
 */
export const DEVICE_MANAGEMENT_MESSAGES = {
  DEVICE_ADDED: "Device added successfully",
  DEVICE_UPDATED: "Device updated successfully",
  DEVICE_DELETED: "Device deleted successfully",
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
  REGISTRATION_PREFIX: "device/registration/",
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
  /** Topic for device registration messages from MQTT bridge */
  DEVICE_REGISTRATION: "iot-device-registration",

  /** Topic for sensor data from MQTT bridge */
  SENSOR_DATA: "iot-sensor-readings",
} as const;
