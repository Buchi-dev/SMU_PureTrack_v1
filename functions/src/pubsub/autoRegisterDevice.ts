/**
 * Auto Register Device - Pub/Sub Trigger
 *
 * MEDIUM PRIORITY: Automatically registers new devices on first connection
 *
 * @module pubsub/autoRegisterDevice
 *
 * Functionality:
 * - Listens to Pub/Sub topic "iot-device-registration"
 * - Auto-registers devices when they first connect to the system
 * - Creates device profile in Firestore
 * - Initializes Realtime Database structure for sensor data
 * - Updates lastSeen timestamp for existing devices
 *
 * Migration Notes:
 * - Ported from src/pubsub/autoRegisterDevice.ts
 * - Enhanced with validation and error handling
 * - Uses modular constants and types
 */

import * as admin from "firebase-admin";
import type { CloudEvent } from "firebase-functions/v2";
import { logger } from "firebase-functions/v2";
import type { MessagePublishedData } from "firebase-functions/v2/pubsub";
import { onMessagePublished } from "firebase-functions/v2/pubsub";

import { db, rtdb } from "../config/firebase";
import { COLLECTIONS } from "../constants/database.constants";
import { PUBSUB_TOPICS } from "../constants/pubsub.constants";
import { isValidDeviceId } from "../utils/validators";

/**
 * Device registration information from MQTT
 */
export interface DeviceRegistrationInfo {
  deviceId: string;
  name?: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
}

/**
 * Device document structure
 */
export interface Device {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
  status: "online" | "offline" | "unknown";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registeredAt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastSeen: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

/**
 * Auto-register devices when they first connect
 *
 * Trigger: MQTT Bridge → Pub/Sub Topic → This Function
 * Topic: iot-device-registration
 *
 * Process:
 * 1. Extract device information from message
 * 2. Check if device already exists
 * 3. If exists, update lastSeen timestamp
 * 4. If new, create device profile in Firestore
 * 5. Initialize Realtime Database structure
 *
 * @param {*} event - Pub/Sub CloudEvent with device registration info
 *
 * @example
 * // Published by MQTT bridge when device connects:
 * pubsub.topic('iot-device-registration').publish({
 *   json: {
 *     deviceId: 'device123',
 *     name: 'Water Sensor A',
 *     type: 'water_quality',
 *     firmwareVersion: '1.0.0'
 *   }
 * });
 */
export const autoRegisterDevice = onMessagePublished(
  {
    topic: PUBSUB_TOPICS.DEVICE_REGISTRATION,
    region: "us-central1",
    retry: true,
    minInstances: 0,
    maxInstances: 2,
  },
  async (event: CloudEvent<MessagePublishedData<DeviceRegistrationInfo>>): Promise<void> => {
    try {
      const deviceInfo = event.data.message.json;
      if (!deviceInfo || !deviceInfo.deviceId) {
        logger.error("Invalid device registration data");
        return; // Don't retry for invalid data
      }

      const deviceId = deviceInfo.deviceId;

      // Validate device ID format
      if (!isValidDeviceId(deviceId)) {
        logger.error(`Invalid device ID format: ${deviceId}`);
        return; // Don't retry for invalid device ID
      }

      logger.info(`Device registration request: ${deviceId}`);

      // Check if device already exists
      const deviceRef = db.collection(COLLECTIONS.DEVICES).doc(deviceId);
      const doc = await deviceRef.get();

      if (doc.exists) {
        logger.info(`Device ${deviceId} already registered, updating last seen`);
        await deviceRef.update({
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          status: "online",
        });
        return;
      }

      // Register new device
      const newDevice: Device = {
        deviceId: deviceId,
        name: deviceInfo.name || deviceId,
        type: deviceInfo.type || "water_quality",
        firmwareVersion: deviceInfo.firmwareVersion,
        macAddress: deviceInfo.macAddress,
        ipAddress: deviceInfo.ipAddress,
        sensors: deviceInfo.sensors || ["turbidity", "tds", "ph"],
        status: "online",
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {},
      };

      await deviceRef.set(newDevice);

      // Initialize Realtime Database structure
      await rtdb.ref(`sensorReadings/${deviceId}`).set({
        deviceId: deviceId,
        latestReading: null,
        status: "waiting_for_data",
      });

      logger.info(`Device registered successfully: ${deviceId}`);
    } catch (error) {
      logger.error("Error registering device:", error);
      throw error; // Trigger retry for unexpected errors
    }
  }
);
