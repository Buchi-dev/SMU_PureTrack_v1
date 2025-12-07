/**
 * Device Types
 * TypeScript interfaces and types for device management
 */

import { Types, Document } from 'mongoose';

/**
 * Device status
 */
export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

/**
 * Device registration status
 */
export enum DeviceRegistrationStatus {
  REGISTERED = 'registered',
  PENDING = 'pending',
}

/**
 * Device metadata interface
 */
export interface IDeviceMetadata {
  location?: {
    building?: string;
    floor?: string;
    notes?: string;
  };
  firmware?: string;
  hardware?: string;
  ipAddress?: string;
}

/**
 * Base device interface
 */
export interface IDevice {
  _id: Types.ObjectId;
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  location: string;
  status: DeviceStatus;
  registrationStatus: DeviceRegistrationStatus;
  isRegistered: boolean;
  lastSeen: Date;
  metadata: IDeviceMetadata;
  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  scheduledPermanentDeletionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Device document interface (with Mongoose methods)
 */
export interface IDeviceDocument extends IDevice, Document {
  toPublicProfile(): IDevicePublic;
}

/**
 * Public device data (safe for client)
 */
export interface IDevicePublic {
  id: Types.ObjectId;
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  location: string;
  status: DeviceStatus;
  registrationStatus: DeviceRegistrationStatus;
  isRegistered: boolean;
  registeredAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
  lastSeen: {
    seconds: number;
    nanoseconds: number;
  } | null;
  metadata: IDeviceMetadata;
  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
  deletedBy?: Types.ObjectId;
  scheduledPermanentDeletionAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Device creation data
 */
export interface ICreateDeviceData {
  deviceId: string;
  name?: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
  location?: string;
  metadata?: IDeviceMetadata;
}

/**
 * Device update data
 */
export interface IUpdateDeviceData {
  name?: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
  location?: string;
  status?: DeviceStatus;
  registrationStatus?: DeviceRegistrationStatus;
  metadata?: IDeviceMetadata;
}

/**
 * Device query filters
 */
export interface IDeviceFilters {
  status?: DeviceStatus;
  registrationStatus?: DeviceRegistrationStatus;
  isRegistered?: boolean;
  search?: string; // Search in name/deviceId
}

/**
 * Device statistics
 */
export interface IDeviceStatistics {
  total: number;
  byStatus: {
    online: number;
    offline: number;
  };
  byRegistrationStatus: {
    registered: number;
    pending: number;
  };
}
