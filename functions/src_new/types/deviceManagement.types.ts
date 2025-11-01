/**
 * Device Management Types
 * Complete type definitions for device operations
 * 
 * @module types/deviceManagement.types
 */

import type {SensorReading} from "./reportGeneration.types";

// ===========================
// ENUMS & LITERALS
// ===========================

/**
 * Device operational status
 */
export type DeviceStatus = "online" | "offline" | "error" | "maintenance";

/**
 * Device management actions
 */
export type DeviceAction =
  | "discoverDevices"
  | "sendCommand"
  | "addDevice"
  | "getDevice"
  | "updateDevice"
  | "deleteDevice"
  | "listDevices"
  | "getSensorReadings"
  | "getSensorHistory";

// ===========================
// DEVICE STRUCTURE TYPES
// ===========================

/**
 * Device physical location information
 */
export interface DeviceLocation {
  building: string;
  floor: string;
  notes?: string;
}

/**
 * Extended device metadata
 */
export interface DeviceMetadata {
  location?: DeviceLocation;
  description?: string;
  owner?: string;
  [key: string]: string | number | boolean | undefined | DeviceLocation;
}

/**
 * Partial device data for updates/creation
 */
export interface DeviceData {
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

/**
 * Complete device document structure
 * Represents a device in Firestore
 */
export interface Device {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  status: DeviceStatus;
  registeredAt: any; // Firestore FieldValue or Timestamp
  lastSeen: any;
  updatedAt?: any;
  metadata: DeviceMetadata;
}

// ===========================
// SENSOR DATA TYPES
// ===========================

/**
 * NOTE: SensorReading type is defined in reportGeneration.types.ts
 * to avoid duplication. Import from there if needed.
 */

/**
 * Partial sensor data for updates
 */
export interface SensorData {
  turbidity?: number;
  tds?: number;
  ph?: number;
  timestamp?: number;
}

// ===========================
// MQTT/COMMAND TYPES
// ===========================

/**
 * Command message for device communication via MQTT/Pub-Sub
 */
export interface CommandMessage {
  command: string;
  params?: Record<string, unknown>;
  timestamp: number;
  requestId?: string;
}

/**
 * Device registration information from MQTT discovery
 */
export interface DeviceRegistrationInfo {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
}

// ===========================
// REQUEST/RESPONSE TYPES
// ===========================

/**
 * Device management request structure
 * Used for callable function requests
 */
export interface DeviceManagementRequest {
  action: DeviceAction;
  deviceId?: string;
  deviceData?: DeviceData;
  command?: string;
  params?: Record<string, unknown>;
  limit?: number;
}

/**
 * Device management response structure
 * Returned from callable function handlers
 */
export interface DeviceManagementResponse {
  success: boolean;
  message?: string;
  device?: Device;
  devices?: Device[];
  count?: number;
  sensorData?: SensorReading;
  history?: SensorReading[];
  error?: string;
}

// ===========================
// ANALYTICS TYPES
// ===========================

/**
 * Device summary for analytics
 */
export interface DeviceSummary {
  deviceId: string;
  name: string;
  location?: DeviceLocation;
  status: DeviceStatus;
  lastSeen: any;
  reading: {
    turbidity: number;
    tds: number;
    ph: number;
    timestamp: number;
  };
}

/**
 * Device report summary statistics
 */
export interface DeviceReportSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  healthScore: number;
}

/**
 * Complete device report
 */
export interface DeviceReport {
  summary: DeviceReportSummary;
  devices: Array<Record<string, unknown>>;
}
