import {onMessagePublished, MessagePublishedData} from "firebase-functions/v2/pubsub";
import type {CloudEvent} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {db} from "../config/firebase";

/**
 * Monitor device status changes
 * Triggered by: device/status/+ → Bridge → Pub/Sub
 */
export const monitorDeviceStatus = onMessagePublished(
  {
    topic: "iot-device-status",
    region: "us-central1",
    retry: false,
    minInstances: 0,
    maxInstances: 2,
  },
  async (event: CloudEvent<MessagePublishedData<{status: string}>>): Promise<void> => {
    try {
      const deviceId = event.data.message.attributes?.device_id;
      const statusData = event.data.message.json;
      const status = statusData?.status || "unknown";

      if (!deviceId) {
        console.error("No device_id in status message");
        return;
      }

      console.log(`Device ${deviceId} status update: ${status}`);

      // Update Firestore with device status
      await db.collection("devices").doc(deviceId).update({
        status: status,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Device status updated: ${deviceId} -> ${status}`);
    } catch (error) {
      console.error("Error monitoring device status:", error);
      // Don't throw - status updates are informational only
    }
  }
);
