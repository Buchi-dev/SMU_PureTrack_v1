import {onRequest, Request} from "firebase-functions/v2/https";
import {
  onMessagePublished,
  MessagePublishedData,
} from "firebase-functions/v2/pubsub";
import type {CloudEvent} from "firebase-functions/v2";
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {PubSub} from "@google-cloud/pubsub";
import type {Response} from "express";

// ===========================
// INITIALIZATION
// ===========================

// Initialize Firebase Admin
admin.initializeApp();
const db: admin.firestore.Firestore = admin.firestore();
const rtdb: admin.database.Database = admin.database();
const pubsub = new PubSub();

// Set global options
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "512MiB",
});

// ===========================
// TYPE DEFINITIONS
// ===========================

// Device Types
type DeviceStatus = "online" | "offline" | "error" | "maintenance";

interface DeviceMetadata {
  location?: string;
  description?: string;
  owner?: string;
  [key: string]: string | number | boolean | undefined;
}

interface DeviceData {
  deviceId?: string;
  name?: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
  status?: DeviceStatus;
  metadata?: DeviceMetadata;
}

interface Device {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  status: DeviceStatus;
  registeredAt: admin.firestore.FieldValue;
  lastSeen: admin.firestore.FieldValue;
  updatedAt?: admin.firestore.FieldValue;
  metadata: DeviceMetadata;
}

// Sensor Types
interface SensorReading {
  deviceId: string;
  turbidity: number;
  tds: number;
  ph: number;
  timestamp: number;
  receivedAt: number | object;
}

interface SensorData {
  turbidity?: number;
  tds?: number;
  ph?: number;
  timestamp?: number;
}

// Request/Response Types
type DeviceAction =
  | "DISCOVER_DEVICES"
  | "SEND_COMMAND"
  | "ADD_DEVICE"
  | "GET_DEVICE"
  | "UPDATE_DEVICE"
  | "DELETE_DEVICE"
  | "LIST_DEVICES"
  | "GET_SENSOR_READINGS"
  | "GET_SENSOR_HISTORY";

interface DeviceManagementRequest {
  action: DeviceAction;
  deviceId?: string;
  deviceData?: DeviceData;
  command?: string;
  params?: Record<string, unknown>;
  limit?: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// MQTT/Pub-Sub Types
interface DeviceRegistrationInfo {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
}

interface CommandMessage {
  command: string;
  params?: Record<string, unknown>;
  timestamp: number;
  requestId?: string;
}

// ===========================
// HTTP-TRIGGERED FUNCTIONS
// ===========================

/**
 * Device Management API
 * Handles all device CRUD operations and command publishing
 */
export const deviceManagement = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {action, deviceId, deviceData, command, params, limit} =
        req.body as DeviceManagementRequest;

      if (!action) {
        res.status(400).json({
          success: false,
          error: "Action is required",
        } as ApiResponse);
        return;
      }

      console.log(`Device management action: ${action}`);

      // Handle different actions
      switch (action) {
      case "DISCOVER_DEVICES": {
        const discoveryMessage: CommandMessage = {
          command: "DISCOVER",
          timestamp: Date.now(),
          requestId: `discovery_${Date.now()}`,
        };

        // Publish to Pub/Sub - Bridge will forward to MQTT
        await pubsub.topic("device-commands").publishMessage({
          json: discoveryMessage,
          attributes: {
            mqtt_topic: "device/discovery/request",
          },
        });

        res.status(200).json({
          success: true,
          message: "Discovery message sent to devices",
        } as ApiResponse);
        break;
      }

      case "SEND_COMMAND": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const commandMessage: CommandMessage = {
          command: command || "STATUS",
          params: params || {},
          timestamp: Date.now(),
          requestId: `cmd_${Date.now()}`,
        };

        // Publish command to Pub/Sub
        await pubsub.topic("device-commands").publishMessage({
          json: commandMessage,
          attributes: {
            mqtt_topic: `device/command/${deviceId}`,
            device_id: deviceId,
          },
        });

        res.status(200).json({
          success: true,
          message: `Command sent to device: ${deviceId}`,
        } as ApiResponse);
        break;
      }

      case "ADD_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (doc.exists) {
          res.status(400).json({
            success: false,
            error: "Device already exists",
          } as ApiResponse);
          return;
        }

        const newDevice: Device = {
          deviceId: deviceId,
          name: deviceData?.name || `Device-${deviceId}`,
          type: deviceData?.type || "Arduino UNO R4 WiFi",
          firmwareVersion: deviceData?.firmwareVersion || "1.0.0",
          macAddress: deviceData?.macAddress || "",
          ipAddress: deviceData?.ipAddress || "",
          sensors: deviceData?.sensors || [
            "turbidity",
            "tds",
            "ph",
          ],
          status: (deviceData?.status as DeviceStatus) || "online",
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          metadata: deviceData?.metadata || {},
        };

        await deviceRef.set(newDevice);

        // Initialize Realtime Database structure
        await rtdb.ref(`sensorReadings/${deviceId}`).set({
          deviceId: deviceId,
          latestReading: null,
          status: "waiting_for_data",
        });

        res.status(200).json({
          success: true,
          message: "Device added successfully",
          data: {deviceId, device: newDevice},
        } as ApiResponse);
        break;
      }

      case "GET_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (!doc.exists) {
          res.status(404).json({
            success: false,
            error: "Device not found",
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          device: doc.data(),
        } as ApiResponse);
        break;
      }

      case "UPDATE_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (!doc.exists) {
          res.status(404).json({
            success: false,
            error: "Device not found",
          } as ApiResponse);
          return;
        }

        const updateData = {
          ...deviceData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        };

        await deviceRef.update(updateData);

        res.status(200).json({
          success: true,
          message: "Device updated successfully",
          data: {deviceId},
        } as ApiResponse);
        break;
      }

      case "DELETE_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (!doc.exists) {
          res.status(404).json({
            success: false,
            error: "Device not found",
          } as ApiResponse);
          return;
        }

        await deviceRef.delete();

        // Delete sensor readings from Realtime Database
        await rtdb.ref(`sensorReadings/${deviceId}`).remove();

        res.status(200).json({
          success: true,
          message: "Device deleted successfully",
          data: {deviceId},
        } as ApiResponse);
        break;
      }

      case "LIST_DEVICES": {
        const devicesSnapshot = await db.collection("devices").get();

        const devices = devicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        res.status(200).json({
          success: true,
          count: devices.length,
          devices: devices,
        } as ApiResponse);
        break;
      }

      case "GET_SENSOR_READINGS": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const snapshot = await rtdb
          .ref(`sensorReadings/${deviceId}/latestReading`)
          .once("value");

        if (!snapshot.exists()) {
          res.status(404).json({
            success: false,
            error: "No sensor readings found for this device",
          } as ApiResponse);
          return;
        }

        const sensorData: SensorReading = snapshot.val();

        res.status(200).json({
          success: true,
          deviceId: deviceId,
          sensorData: sensorData,
        } as ApiResponse);
        break;
      }

      case "GET_SENSOR_HISTORY": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const historyLimit = limit || 50;
        const snapshot = await rtdb
          .ref(`sensorReadings/${deviceId}/history`)
          .orderByChild("timestamp")
          .limitToLast(historyLimit)
          .once("value");

        if (!snapshot.exists()) {
          res.status(404).json({
            success: false,
            error: "No sensor history found for this device",
          } as ApiResponse);
          return;
        }

        const history: SensorReading[] = [];
        snapshot.forEach((child) => {
          history.push(child.val());
        });

        res.status(200).json({
          success: true,
          deviceId: deviceId,
          count: history.length,
          history: history.reverse(), // Most recent first
        } as ApiResponse);
        break;
      }

      default: {
        res.status(400).json({
          success: false,
          error: "Invalid action specified",
        } as ApiResponse);
      }
      }
    } catch (error) {
      console.error("Error in deviceManagement:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse);
    }
  }
);

// ===========================
// PUB/SUB-TRIGGERED FUNCTIONS
// ===========================

/**
 * Process sensor data from devices
 * Triggered by: device/sensordata/+ → Bridge → Pub/Sub
 */
export const processSensorData = onMessagePublished(
  {
    topic: "iot-sensor-readings",
    region: "us-central1",
    retry: true,
    minInstances: 0,
    maxInstances: 5,
  },
  async (event: CloudEvent<MessagePublishedData<SensorData>>): Promise<void> => {
    try {
      // Extract device ID from message attributes
      const deviceId = event.data.message.attributes?.device_id;
      if (!deviceId) {
        console.error("No device_id in message attributes");
        return;
      }

      // Parse sensor data
      const sensorData = event.data.message.json;
      if (!sensorData) {
        console.error("No sensor data in message");
        return;
      }

      console.log(`Processing sensor data for device: ${deviceId}`);

      // Prepare reading data
      const readingData: SensorReading = {
        deviceId: deviceId,
        turbidity: sensorData.turbidity || 0,
        tds: sensorData.tds || 0,
        ph: sensorData.ph || 0,
        timestamp: sensorData.timestamp || Date.now(),
        receivedAt: admin.database.ServerValue.TIMESTAMP,
      };

      // Store in Realtime Database - Latest Reading
      await rtdb
        .ref(`sensorReadings/${deviceId}/latestReading`)
        .set(readingData);

      // Store in Realtime Database - Historical Data
      await rtdb
        .ref(`sensorReadings/${deviceId}/history`)
        .push(readingData);

      // Update device status in Firestore
      await db.collection("devices").doc(deviceId).update({
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        status: "online",
      });

      console.log(`✓ Sensor data processed for device: ${deviceId}`);
    } catch (error) {
      console.error("Error processing sensor data:", error);
      throw error; // Trigger retry
    }
  }
);

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
    maxInstances: 2, // Reduced: registration is infrequent
  },
  async (
    event: CloudEvent<MessagePublishedData<DeviceRegistrationInfo>>
  ): Promise<void> => {
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
        console.log(
          `Device ${deviceId} already registered, updating last seen`
        );
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

      console.log(`✓ Device registered successfully: ${deviceId}`);
    } catch (error) {
      console.error("Error registering device:", error);
      throw error; // Trigger retry
    }
  }
);

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
    maxInstances: 2, // Added: limit concurrent instances
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

      console.log(`✓ Device status updated: ${deviceId} → ${status}`);
    } catch (error) {
      console.error("Error monitoring device status:", error);
      // Don't throw - status updates are informational only
    }
  }
);
