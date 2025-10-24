import {onMessagePublished, MessagePublishedData} from "firebase-functions/v2/pubsub";
import type {CloudEvent} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {db, rtdb} from "../config/firebase";
import type {DeviceRegistrationInfo, Device} from "../types";

/**
 * Auto-register devices
 * Triggered by: device/registration/+ → Bridge → Pub/Sub
 */
export const autoRegisterDevice = onMessagePublished(
  {
    topic: "iot-device-registration",
    region: "us-central1",
    retry: true,
    minInstances: 0,
    maxInstances: 2,
  },
  async (event: CloudEvent<MessagePublishedData<DeviceRegistrationInfo>>): Promise<void> => {
    try {
      const deviceInfo = event.data.message.json;
      if (!deviceInfo || !deviceInfo.deviceId) {
        console.error("Invalid device registration data");
        return;
      }

      const deviceId = deviceInfo.deviceId;
      console.log(`Device registration request: ${deviceId}`);

      // Check if device already exists
      const deviceRef = db.collection("devices").doc(deviceId);
      const doc = await deviceRef.get();

      if (doc.exists) {
        console.log(`Device ${deviceId} already registered, updating last seen`);
        await deviceRef.update({
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          status: "online",
        });
        return;
      }

      // Register new device
      const newDevice: Device = {
        deviceId: deviceId,
        name: deviceInfo.name,
        type: deviceInfo.type,
        firmwareVersion: deviceInfo.firmwareVersion,
        macAddress: deviceInfo.macAddress,
        ipAddress: deviceInfo.ipAddress,
        sensors: deviceInfo.sensors,
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

      console.log(`Device registered successfully: ${deviceId}`);
    } catch (error) {
      console.error("Error registering device:", error);
      throw error; // Trigger retry
    }
  }
);
