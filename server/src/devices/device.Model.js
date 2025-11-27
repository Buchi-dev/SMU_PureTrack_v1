const mongoose = require('mongoose');

/**
 * Device Schema for ESP32 water quality monitoring devices
 */
const deviceSchema = new mongoose.Schema(
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
      enum: ['online', 'offline'],
      default: 'offline',
      index: true,
    },
    registrationStatus: {
      type: String,
      enum: ['registered', 'pending'],
      default: 'pending',
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
      type: {
        location: {
          building: String,
          floor: String,
          notes: String,
        },
        firmware: String,
        hardware: String,
        ipAddress: String,
      },
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for optimized queries
 */
deviceSchema.index({ status: 1, lastSeen: -1 });
deviceSchema.index({ registrationStatus: 1, createdAt: -1 });
deviceSchema.index({ isRegistered: 1, status: 1 });
deviceSchema.index({ deviceId: 1, isRegistered: 1 });

/**
 * Instance method to get public device data
 */
deviceSchema.methods.toPublicProfile = function () {
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
    lastSeen: this.lastSeen,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};


/**
 * Sensor Reading Schema for storing device measurements
 */
const sensorReadingSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    pH: {
      type: Number,
      required: true,
    },
    turbidity: {
      type: Number,
      required: true,
    },
    tds: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Use custom timestamp field
  }
);

/**
 * Compound indexes for optimized queries
 * Note: timestamp index is created through compound indexes and TTL index
 */
sensorReadingSchema.index({ deviceId: 1, timestamp: -1 });

/**
 * TTL Index - Automatically delete readings older than 90 days
 * This also serves as a simple timestamp index for sorting
 */
sensorReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const Device = mongoose.model('Device', deviceSchema);
const SensorReading = mongoose.model('SensorReading', sensorReadingSchema);

module.exports = { Device, SensorReading };
