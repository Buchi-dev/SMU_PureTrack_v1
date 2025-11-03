/**
 * Monitor Device Status - Pub/Sub Trigger
 *
 * MEDIUM PRIORITY: Tracks device online/offline status changes
 *
 * @module pubsub/monitorDeviceStatus
 *
 * Functionality:
 * - Listens to Pub/Sub topic "iot-device-status"
 * - Updates device status in Firestore
 * - Tracks lastSeen timestamp
 * - Monitors device health metrics
 *
 * Migration Notes:
 * - Ported from src/pubsub/monitorDeviceStatus.ts
 * - Enhanced with validation and constants
 * - Uses modular database constants
 */

import * as admin from "firebase-admin";
import type { CloudEvent } from "firebase-functions/v2";
import { logger } from "firebase-functions/v2";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import type { MessagePublishedData } from "firebase-functions/v2/pubsub";

import { db } from "../config/firebase";
import { COLLECTIONS } from "../constants/database.constants";
import { isValidDeviceId } from "../utils/validators";

/**
 * Device status message
 */
export interface DeviceStatusMessage {
  status: "online" | "offline" | "unknown";
  reason?: string;
}

/**
 * Monitor device status changes
 *
 * Trigger: MQTT Bridge → Pub/Sub Topic → This Function
 * Topic: iot-device-status
 *
 * Process:
 * 1. Extract device ID from message attributes
 * 2. Extract status from message data
 * 3. Update device document in Firestore
 * 4. Update lastSeen timestamp
 *
 * @param {*} event - Pub/Sub CloudEvent with device status
 *
 * @example
 * // Published by MQTT bridge or device:
 * pubsub.topic('iot-device-status').publish({
 *   attributes: { device_id: 'device123' },
 *   json: { status: 'online' }
 * });
 */

import { PUBSUB_TOPICS } from "../constants/pubsub.constants";

export const monitorDeviceStatus = onMessagePublished(
  {
    topic: PUBSUB_TOPICS.DEVICE_STATUS,
    region: "us-central1",
    retry: false, // Status updates are informational, no retry needed
    minInstances: 0,
    maxInstances: 2,
  },
  async (event: CloudEvent<MessagePublishedData<DeviceStatusMessage>>): Promise<void> => {
    try {
      const deviceId = event.data.message.attributes?.device_id;
      const statusData = event.data.message.json;
      const status = statusData?.status || "unknown";

      if (!deviceId) {
        logger.error("No device_id in status message");
        return;
      }

      // Validate device ID format
      if (!isValidDeviceId(deviceId)) {
        logger.error(`Invalid device ID format: ${deviceId}`);
        return;
      }

      logger.info(`Device ${deviceId} status update: ${status}`);

      // Update Firestore with device status
      await db.collection(COLLECTIONS.DEVICES).doc(deviceId).update({
        status: status,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`Device status updated: ${deviceId} -> ${status}`);
    } catch (error) {
      logger.error("Error monitoring device status:", error);
      // Don't throw - status updates are informational only
    }
  }
);
