/**
 * Pub/Sub Constants
 * Configuration values for Pub/Sub triggers and operations
 *
 * @module constants/pubsub.constants
 */

/**
 * Pub/Sub topic names
 */
export const PUBSUB_TOPICS = {
  /** Topic for sensor data from MQTT bridge */
  SENSOR_DATA: "iot-sensor-readings",

  /** Topic for device registration from MQTT bridge */
  DEVICE_REGISTRATION: "iot-device-registration",

  /** Topic for system events (future use) */
  SYSTEM_EVENTS: "system-events",
} as const;

/**
 * Default Pub/Sub function configuration
 */
export const PUBSUB_DEFAULT_CONFIG = {
  /** Firebase region */
  region: "us-central1",

  /** Enable retry on failure */
  retry: true,

  /** Minimum instances */
  minInstances: 0,

  /** Maximum concurrent instances */
  maxInstances: 10,
} as const;

/**
 * Error messages for Pub/Sub operations
 */
export const PUBSUB_ERRORS = {
  INVALID_MESSAGE: "Invalid Pub/Sub message format",
  MISSING_ATTRIBUTES: "Missing required message attributes",
  PROCESSING_FAILED: "Failed to process Pub/Sub message",
  PUBLISH_FAILED: "Failed to publish message to Pub/Sub",
} as const;

/**
 * Success messages for Pub/Sub operations
 */
export const PUBSUB_MESSAGES = {
  MESSAGE_PROCESSED: "Pub/Sub message processed successfully",
  MESSAGE_PUBLISHED: "Message published to Pub/Sub successfully",
} as const;
