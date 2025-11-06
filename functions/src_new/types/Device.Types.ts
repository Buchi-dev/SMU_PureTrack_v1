/**
 * Device Management Types
 * Complete type definitions for device operations
 *
 * @module types/deviceManagement.types
 */

// ===========================
// ENUMS & LITERALS
// ===========================

/**
 * Device operational status
 */
export type DeviceStatus = "online" | "offline" | "error" | "maintenance";

/**
 * Device management actions
 * These are the ONLY actions supported by the Cloud Function
 */
export type DeviceAction =
  | "addDevice"
  | "updateDevice"
  | "deleteDevice";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registeredAt: any; // Firestore FieldValue or Timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastSeen: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ===========================
// REQUEST/RESPONSE TYPES
// ===========================

/**
 * Device management request structure
 * Used for callable function requests
 *
 * WRITE OPERATIONS ONLY:
 * - addDevice: Create new device (requires deviceId + deviceData)
 * - updateDevice: Update existing device (requires deviceId + deviceData)
 * - deleteDevice: Remove device (requires deviceId only)
 *
 * READ operations (listDevices, getSensorReadings, etc.) are handled
 * via direct Firebase SDK calls on the client side.
 */
export interface DeviceManagementRequest {
  action: DeviceAction;
  deviceId?: string;
  deviceData?: DeviceData;
}

/**
 * Device management response structure
 * Returned from callable function handlers
 *
 * For WRITE operations only (add/update/delete)
 */
export interface DeviceManagementResponse {
  success: boolean;
  message?: string;
  device?: Device; // Returned on addDevice
  error?: string;
}
