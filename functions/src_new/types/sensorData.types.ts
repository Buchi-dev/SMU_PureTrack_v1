/**
 * Sensor Data Types
 * Type definitions for IoT sensor data processing
 *
 * @module types/sensorData.types
 *
 * Purpose: Define interfaces for sensor readings and batch data from MQTT bridge
 */

import * as admin from "firebase-admin";

/**
 * Raw sensor data from MQTT bridge
 * Published to Pub/Sub topic by MQTT-to-PubSub bridge
 */
export interface SensorData {
  /** Turbidity measurement in NTU (Nephelometric Turbidity Units) */
  turbidity: number;

  /** TDS measurement in ppm (Total Dissolved Solids in parts per million) */
  tds: number;

  /** pH level (0-14 scale) */
  ph: number;

  /** Unix timestamp in milliseconds when reading was taken */
  timestamp: number;
}

/**
 * Sensor reading with device context
 * Stored in Realtime Database for real-time access and historical analysis
 */
export interface SensorReading {
  /** Device ID that produced this reading */
  deviceId: string;

  /** Turbidity measurement in NTU */
  turbidity: number;

  /** TDS measurement in ppm */
  tds: number;

  /** pH level (0-14 scale) */
  ph: number;

  /** Unix timestamp in milliseconds when reading was taken */
  timestamp: number;

  /** Server timestamp when reading was received (RTDB ServerValue) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  receivedAt?: any;
}

/**
 * Batch sensor data message
 * Supports batch processing for optimized function execution
 */
export interface BatchSensorData {
  /** Array of sensor readings */
  readings: SensorData[];
}

/**
 * Device status information
 */
export interface DeviceStatus {
  /** Device ID */
  deviceId: string;

  /** Current device status */
  status: "online" | "offline" | "unknown";

  /** Last seen timestamp */
  lastSeen: admin.firestore.Timestamp;

  /** Device name */
  name?: string;

  /** Device location metadata */
  metadata?: {
    location?: {
      building?: string;
      floor?: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}
