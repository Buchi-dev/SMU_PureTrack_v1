import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";

import {db, rtdb} from "../config/firebase";
import {
  DEVICE_MANAGEMENT_ERRORS,
  DEVICE_MANAGEMENT_MESSAGES,
  DEVICE_DEFAULTS,
} from "../constants";
import type {
  Device,
  DeviceStatus,
  DeviceManagementRequest,
  DeviceManagementResponse,
} from "../types";
import {createRoutedFunction} from "../utils";
import type {ActionHandler} from "../utils/switchCaseRouting";

// ============================================================================
// WRITE OPERATIONS - Device Management
// ============================================================================

const handleAddDevice: ActionHandler<DeviceManagementRequest, DeviceManagementResponse> = async (
  req: CallableRequest<DeviceManagementRequest>
) => {
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
    deviceId,
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
  await rtdb.ref(`sensorReadings/${deviceId}`).set({
    deviceId,
    latestReading: null,
    status: "waiting_for_data",
  });

  return {success: true, message: DEVICE_MANAGEMENT_MESSAGES.DEVICE_ADDED, device: newDevice};
};

const handleUpdateDevice: ActionHandler<DeviceManagementRequest, DeviceManagementResponse> = async (
  req: CallableRequest<DeviceManagementRequest>
) => {
  const {deviceId, deviceData} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) throw new HttpsError("not-found", DEVICE_MANAGEMENT_ERRORS.DEVICE_NOT_FOUND);

  await deviceRef.update({
    ...deviceData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {success: true, message: DEVICE_MANAGEMENT_MESSAGES.DEVICE_UPDATED};
};

const handleDeleteDevice: ActionHandler<DeviceManagementRequest, DeviceManagementResponse> = async (
  req: CallableRequest<DeviceManagementRequest>
) => {
  const {deviceId} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) throw new HttpsError("not-found", DEVICE_MANAGEMENT_ERRORS.DEVICE_NOT_FOUND);

  await Promise.all([deviceRef.delete(), rtdb.ref(`sensorReadings/${deviceId}`).remove()]);

  return {success: true, message: DEVICE_MANAGEMENT_MESSAGES.DEVICE_DELETED};
};

// ============================================================================
// EXPORT
// ============================================================================

export const deviceManagement = onCall<DeviceManagementRequest, Promise<DeviceManagementResponse>>(
  createRoutedFunction<DeviceManagementRequest, DeviceManagementResponse>(
    {
      addDevice: handleAddDevice,
      updateDevice: handleUpdateDevice,
      deleteDevice: handleDeleteDevice,
    },
    {
      requireAuth: true,
      requireAdmin: true,
    }
  )
);
