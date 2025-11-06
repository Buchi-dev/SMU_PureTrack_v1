/**
 * Sensor Data Constants
 * Configuration values for sensor data processing
 *
 * @module constants/sensorData.constants
 */

/**
 * Alert debouncing cooldown period (5 minutes in milliseconds)
 * Prevents duplicate alerts for the same parameter within this time window
 */
export const ALERT_COOLDOWN_MS = 300000;

/**
 * History storage interval
 * Only stores every Nth reading to reduce Realtime Database writes by 80%
 * Example: Value of 5 means store 1 out of every 5 readings
 */
export const HISTORY_STORAGE_INTERVAL = 5;

/**
 * Firestore lastSeen update threshold (5 minutes in milliseconds)
 * Only updates device lastSeen timestamp if older than this threshold
 * Reduces Firestore writes by 80%
 */
export const LASTSEEN_UPDATE_THRESHOLD_MS = 300000;

/**
 * Sensor value constraints for validation
 */
export const SENSOR_CONSTRAINTS = {
  turbidity: {
    min: 0,
    max: 1000,
    unit: "NTU",
  },
  tds: {
    min: 0,
    max: 10000,
    unit: "ppm",
  },
  ph: {
    min: 0,
    max: 14,
    unit: "",
  },
} as const;

/**
 * Error messages for sensor data processing
 */
export const SENSOR_DATA_ERRORS = {
  NO_DEVICE_ID: "No device_id in message attributes",
  NO_SENSOR_DATA: "No sensor data in message",
  INVALID_SENSOR_DATA: "Invalid sensor data values",
  PROCESSING_FAILED: "Error processing sensor data",
  DEVICE_NOT_FOUND: "Device not found",
  THRESHOLD_CHECK_FAILED: "Failed to check thresholds",
  ALERT_CREATION_FAILED: "Failed to create alert",
} as const;

/**
 * Success messages for sensor data processing
 */
export const SENSOR_DATA_MESSAGES = {
  PROCESSING_COMPLETE: "Sensor data processing completed",
  READING_STORED: "Sensor reading stored successfully",
  ALERT_CREATED: "Alert created for threshold violation",
  TREND_DETECTED: "Trend detected and alert created",
} as const;

/**
 * Pub/Sub configuration for sensor data processing
 */
export const SENSOR_DATA_PUBSUB_CONFIG = {
  /** Pub/Sub topic name for sensor data */
  TOPIC: "iot-sensor-readings",

  /** Firebase region */
  REGION: "us-central1",

  /** Enable retry on failure */
  RETRY: true,

  /** Minimum instances (0 for cold start) */
  MIN_INSTANCES: 0,

  /** Maximum concurrent instances */
  MAX_INSTANCES: 5,
} as const;

/**
 * Realtime Database paths
 */
export const RTDB_PATHS = {
  LATEST_READING: (deviceId: string) => `sensorReadings/${deviceId}/latestReading`,
  HISTORY: (deviceId: string) => `sensorReadings/${deviceId}/history`,
} as const;
