/**
 * Device Management Callable Function
 * Single function with switch case to handle multiple device management operations
 * Migrated from HTTP to Callable for better security and consistency
 *
 * @module callable/deviceManagement
 */

import {HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {db, rtdb, pubsub} from "../config/firebase";
import type {
  Device,
  DeviceData,
  DeviceStatus,
  CommandMessage,
  SensorReading,
  DeviceManagementRequest,
  DeviceManagementResponse,
} from "../types";
import {
  DEVICE_MANAGEMENT_ERRORS,
  DEVICE_MANAGEMENT_MESSAGES,
  DEVICE_DEFAULTS,
  MQTT_TOPICS,
  PUBSUB_TOPICS,
} from "../constants";
import {createRoutedFunction} from "../utils";
import type {ActionHandler, ActionHandlers} from "../utils/switchCaseRouting";

/**
 * Handler: Discover Devices
 * Broadcasts discovery message via Pub/Sub → MQTT Bridge
 */
const handleDiscoverDevices: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const discoveryMessage: CommandMessage = {
    command: "DISCOVER",
    timestamp: Date.now(),
    requestId: `discovery_${Date.now()}`,
  };

  // Publish to Pub/Sub - Bridge will forward to MQTT
  await pubsub.topic(PUBSUB_TOPICS.DEVICE_COMMANDS).publishMessage({
    json: discoveryMessage,
    attributes: {
      mqtt_topic: MQTT_TOPICS.DISCOVERY_REQUEST,
    },
  });

  return {
    success: true,
    message: DEVICE_MANAGEMENT_MESSAGES.DISCOVERY_SENT,
  };
};

/**
 * Handler: Send Command to Device
 * Publishes command to specific device via Pub/Sub → MQTT
 */
const handleSendCommand: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId, command, params} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const commandMessage: CommandMessage = {
    command: command || "STATUS",
    params: params || {},
    timestamp: Date.now(),
    requestId: `cmd_${Date.now()}`,
  };

  // Publish command to Pub/Sub
  await pubsub.topic(PUBSUB_TOPICS.DEVICE_COMMANDS).publishMessage({
    json: commandMessage,
    attributes: {
      mqtt_topic: `${MQTT_TOPICS.COMMAND_PREFIX}${deviceId}`,
      device_id: deviceId,
    },
  });

  return {
    success: true,
    message: DEVICE_MANAGEMENT_MESSAGES.COMMAND_SENT,
  };
};

/**
 * Handler: Add Device
 * Registers a new device in Firestore and initializes Realtime DB
 */
const handleAddDevice: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId, deviceData} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (doc.exists) {
    throw new HttpsError("already-exists", DEVICE_MANAGEMENT_ERRORS.DEVICE_ALREADY_EXISTS);
  }

  const newDevice: Device = {
    deviceId: deviceId,
    name: deviceData?.name || `Device-${deviceId}`,
    type: deviceData?.type || DEVICE_DEFAULTS.TYPE,
    firmwareVersion: deviceData?.firmwareVersion || DEVICE_DEFAULTS.FIRMWARE_VERSION,
    macAddress: deviceData?.macAddress || "",
    ipAddress: deviceData?.ipAddress || "",
    sensors: deviceData?.sensors || DEVICE_DEFAULTS.SENSORS,
    status: (deviceData?.status as DeviceStatus) || DEVICE_DEFAULTS.STATUS,
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

  return {
    success: true,
    message: DEVICE_MANAGEMENT_MESSAGES.DEVICE_ADDED,
    device: newDevice,
  };
};

/**
 * Handler: Get Device
 * Retrieves a specific device by ID
 */
const handleGetDevice: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", DEVICE_MANAGEMENT_ERRORS.DEVICE_NOT_FOUND);
  }

  return {
    success: true,
    device: doc.data() as Device,
  };
};

/**
 * Handler: Update Device
 * Updates device information in Firestore
 */
const handleUpdateDevice: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId, deviceData} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", DEVICE_MANAGEMENT_ERRORS.DEVICE_NOT_FOUND);
  }

  const updateData = {
    ...deviceData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
  };

  await deviceRef.update(updateData);

  return {
    success: true,
    message: DEVICE_MANAGEMENT_MESSAGES.DEVICE_UPDATED,
  };
};

/**
 * Handler: Delete Device
 * Removes device from Firestore and Realtime DB
 */
const handleDeleteDevice: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", DEVICE_MANAGEMENT_ERRORS.DEVICE_NOT_FOUND);
  }

  await deviceRef.delete();

  // Delete sensor readings from Realtime Database
  await rtdb.ref(`sensorReadings/${deviceId}`).remove();

  return {
    success: true,
    message: DEVICE_MANAGEMENT_MESSAGES.DEVICE_DELETED,
  };
};

/**
 * Handler: List Devices
 * Retrieves all devices from Firestore
 */
const handleListDevices: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const devicesSnapshot = await db.collection("devices").get();

  const devices: Device[] = devicesSnapshot.docs.map((doc) => {
    return doc.data() as Device;
  });

  return {
    success: true,
    count: devices.length,
    devices: devices,
  };
};

/**
 * Handler: Get Sensor Readings
 * Retrieves latest sensor readings from Realtime DB
 */
const handleGetSensorReadings: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const snapshot = await rtdb
    .ref(`sensorReadings/${deviceId}/latestReading`)
    .once("value");

  if (!snapshot.exists()) {
    throw new HttpsError(
      "not-found",
      DEVICE_MANAGEMENT_ERRORS.NO_SENSOR_READINGS
    );
  }

  const sensorData: SensorReading = snapshot.val();

  return {
    success: true,
    sensorData: sensorData,
  };
};

/**
 * Handler: Get Sensor History
 * Retrieves historical sensor readings from Realtime DB
 */
const handleGetSensorHistory: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId, limit} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const historyLimit = limit || DEVICE_DEFAULTS.HISTORY_LIMIT;
  const snapshot = await rtdb
    .ref(`sensorReadings/${deviceId}/history`)
    .orderByChild("timestamp")
    .limitToLast(historyLimit)
    .once("value");

  if (!snapshot.exists()) {
    throw new HttpsError(
      "not-found",
      DEVICE_MANAGEMENT_ERRORS.NO_SENSOR_HISTORY
    );
  }

  const history: SensorReading[] = [];
  snapshot.forEach((child: admin.database.DataSnapshot) => {
    history.push(child.val());
  });

  return {
    success: true,
    count: history.length,
    history: history.reverse(), // Most recent first
  };
};

/**
 * Device Management Callable Function
 * Uses createRoutedFunction for clean switch-case routing
 * 
 * Security: requireAuth = true, requireAdmin = true
 * All device management operations require admin authentication
 * 
 * @example
 * // List all devices
 * const result = await functions.httpsCallable('deviceManagement')({
 *   action: 'listDevices'
 * });
 * 
 * @example
 * // Add new device
 * const result = await functions.httpsCallable('deviceManagement')({
 *   action: 'addDevice',
 *   deviceId: 'arduino_001',
 *   deviceData: { name: 'Lab Device 1', type: 'Arduino UNO R4 WiFi' }
 * });
 */
// Define action handlers mapping
const handlers: ActionHandlers<DeviceManagementRequest, DeviceManagementResponse> = {
  discoverDevices: handleDiscoverDevices,
  sendCommand: handleSendCommand,
  addDevice: handleAddDevice,
  getDevice: handleGetDevice,
  updateDevice: handleUpdateDevice,
  deleteDevice: handleDeleteDevice,
  listDevices: handleListDevices,
  getSensorReadings: handleGetSensorReadings,
  getSensorHistory: handleGetSensorHistory,
};

export const deviceManagement = createRoutedFunction<
  DeviceManagementRequest,
  DeviceManagementResponse
>(
  handlers,
  {
    requireAuth: true,
    requireAdmin: true,
  }
);
