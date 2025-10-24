import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import * as admin from "firebase-admin";
import {db, rtdb, pubsub} from "../config/firebase";
import type {
  DeviceManagementRequest,
  ApiResponse,
  Device,
  DeviceStatus,
  CommandMessage,
  SensorReading,
} from "../types";

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
          sensors: deviceData?.sensors || ["turbidity", "tds", "ph"],
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
