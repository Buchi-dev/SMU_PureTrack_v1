/**
 * Auto Register Device - Pub/Sub Trigger
 *
 * STRICT VALIDATION MODE: Rejects auto-registration, requires manual admin registration
 *
 * @module pubsub/autoRegisterDevice
 *
 * Functionality:
 * - Listens to Pub/Sub topic "iot-device-registration"
 * - REJECTS new device registration attempts (must be registered via UI with location)
 * - Updates lastSeen timestamp for existing registered devices only
 * - Logs unregistered device connection attempts for admin awareness
 *
 * Security Policy:
 * - Only manually registered devices (with location metadata) can collect sensor data
 * - Auto-registration is DISABLED to enforce proper device onboarding
 * - All devices MUST be registered through admin UI before sensor data collection
 *
 * Migration Notes:
 * - Ported from src/pubsub/autoRegisterDevice.ts
 * - Enhanced with strict validation and location requirements
 * - Disabled auto-registration to enforce manual registration workflow
 */

import type {CloudEvent} from "firebase-functions/v2";
import {logger} from "firebase-functions/v2";
import type {MessagePublishedData} from "firebase-functions/v2/pubsub";
import {onMessagePublished} from "firebase-functions/v2/pubsub";

import {db} from "../config/firebase";
import {COLLECTIONS} from "../constants/database.constants";
import {PUBSUB_TOPICS} from "../constants/PubSub.Constants";
import {isValidDeviceId} from "../utils/validators";

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
  status: "online" | "offline";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registeredAt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastSeen: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

/**
 * Handle device registration requests (STRICT VALIDATION MODE)
 *
 * Trigger: MQTT Bridge → Pub/Sub Topic → This Function
 * Topic: iot-device-registration
 *
 * STRICT VALIDATION Process:
 * 1. Extract device information from message
 * 2. Check if device already exists in Firestore
 * 3. If exists AND has location → Update lastSeen timestamp (connection acknowledgment)
 * 4. If exists BUT missing location → Log warning (incomplete registration)
 * 5. If NEW device → REJECT and log (must be registered via admin UI first)
 *
 * SECURITY POLICY:
 * - Auto-registration is DISABLED
 * - Only manually registered devices with location can operate
 * - Unregistered device attempts are logged for admin review
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
 * // Result: Rejected if device123 not manually registered via admin UI
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

      // Try to get deviceId from attributes first (for backward compatibility with bridge)
      const deviceId = event.data.message.attributes?.device_id ||
                       event.data.message.attributes?.deviceId ||
                       deviceInfo?.deviceId;

      if (!deviceId) {
        logger.error("Invalid device registration data - missing deviceId");
        return; // Don't retry for invalid data
      }

      // Validate device ID format
      if (!isValidDeviceId(deviceId)) {
        logger.error(`Invalid device ID format: ${deviceId}`);
        return; // Don't retry for invalid device ID
      }

      logger.info(`Device registration request received: ${deviceId}`);

      // Check if device is manually registered in Firestore
      const deviceRef = db.collection(COLLECTIONS.DEVICES).doc(deviceId);
      const doc = await deviceRef.get();

      if (doc.exists) {
        // Device is already registered - verify it has proper location metadata
        const deviceData = doc.data();
        const hasLocation = deviceData?.metadata?.location?.building &&
                           deviceData?.metadata?.location?.floor;

        if (hasLocation) {
          logger.info(
            `✅ Device ${deviceId} is properly registered with location - connection acknowledged`
          );
          // NOTE: Status and lastSeen will be updated by processSensorData
          // when actual sensor data arrives (maintains single source of truth)
          return;
        } else {
          logger.warn(
            `⚠️ Device ${deviceId} exists but MISSING LOCATION - sensor data will be rejected`,
            {
              deviceId,
              hasMetadata: !!deviceData?.metadata,
              hasLocation: !!deviceData?.metadata?.location,
              location: deviceData?.metadata?.location,
            }
          );
          return;
        }
      }

      // NEW DEVICE - REJECT (Auto-registration is DISABLED)
      logger.error(
        `❌ REJECTED: Device ${deviceId} is NOT registered - must be registered via admin UI first`,
        {
          deviceId,
          deviceInfo,
          reason: "Auto-registration disabled - requires manual admin registration with location",
          action: "Admin must register device via UI with building and floor location before use",
        }
      );

      // Do NOT create the device - this is intentional
      // Admins must manually register devices via the UI with proper location metadata
      return;
    } catch (error) {
      logger.error("Error processing device registration request:", error);
      throw error; // Trigger retry for unexpected errors
    }
  }
);
