/**
 * Device Model
 * Mongoose schema for ESP32 water quality monitoring devices
 */

import mongoose, { Schema, Model } from 'mongoose';
import {
  IDeviceDocument,
  IDevicePublic,
  DeviceStatus,
  DeviceRegistrationStatus,
} from './device.types';
import { COLLECTIONS } from '@core/configs/constants.config';

/**
 * Device Schema
 * Tracks water quality monitoring devices with MQTT integration
 */
const deviceSchema = new Schema<IDeviceDocument>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'water-quality-sensor',
    },
    firmwareVersion: {
      type: String,
      default: '',
    },
    macAddress: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    sensors: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(DeviceStatus),
      default: DeviceStatus.OFFLINE,
      index: true,
    },
    registrationStatus: {
      type: String,
      enum: Object.values(DeviceRegistrationStatus),
      default: DeviceRegistrationStatus.PENDING,
      index: true,
    },
    isRegistered: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      location: {
        building: { type: String },
        floor: { type: String },
        notes: { type: String },
      },
      firmware: { type: String },
      hardware: { type: String },
      ipAddress: { type: String },
    },
    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: COLLECTIONS.USERS,
      default: null,
    },
    scheduledPermanentDeletionAt: {
      type: Date,
      default: null,
      index: true, // For efficient cleanup job queries
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.DEVICES,
  }
);

/**
 * Compound indexes for optimized queries
 */
deviceSchema.index({ status: 1, lastSeen: -1 });
deviceSchema.index({ registrationStatus: 1, createdAt: -1 });
deviceSchema.index({ isRegistered: 1, status: 1 });
deviceSchema.index({ deviceId: 1, isRegistered: 1 });
deviceSchema.index({ isDeleted: 1, scheduledPermanentDeletionAt: 1 }); // For cleanup jobs

/**
 * Instance method to get public device data
 * Converts dates to Firebase Timestamp format for frontend compatibility
 */
deviceSchema.methods.toPublicProfile = function (this: IDeviceDocument): IDevicePublic {
  const toTimestamp = (date: Date | null) => {
    if (!date) return null;
    const timestamp = date instanceof Date ? date : new Date(date);
    return {
      seconds: Math.floor(timestamp.getTime() / 1000),
      nanoseconds: (timestamp.getTime() % 1000) * 1000000,
    };
  };

  return {
    id: this._id,
    deviceId: this.deviceId,
    name: this.name,
    type: this.type,
    firmwareVersion: this.firmwareVersion,
    macAddress: this.macAddress,
    ipAddress: this.ipAddress,
    sensors: this.sensors,
    location: this.location,
    status: this.status,
    registrationStatus: this.registrationStatus,
    isRegistered: this.isRegistered,
    registeredAt: toTimestamp(this.createdAt),
    lastSeen: toTimestamp(this.lastSeen),
    metadata: this.metadata,
    isDeleted: this.isDeleted,
    deletedAt: toTimestamp(this.deletedAt || null),
    deletedBy: this.deletedBy,
    scheduledPermanentDeletionAt: toTimestamp(this.scheduledPermanentDeletionAt || null),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Device Model
 */
const Device: Model<IDeviceDocument> = mongoose.model<IDeviceDocument>(
  COLLECTIONS.DEVICES,
  deviceSchema
);

export default Device;
