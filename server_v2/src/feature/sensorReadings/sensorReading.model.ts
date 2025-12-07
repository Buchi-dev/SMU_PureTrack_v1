/**
 * Sensor Reading Model
 * Optimized for high-volume time-series data with proper indexing
 */

import mongoose, { Schema, Model } from 'mongoose';
import { ISensorReadingDocument } from './sensorReading.types';
import { COLLECTIONS, TIME } from '@core/configs/constants.config';

/**
 * Sensor Reading Schema
 * High-volume data storage with optimized indexes for time-series queries
 * BUG FIX #2: Added validity flags for graceful sensor degradation
 */
const sensorReadingSchema = new Schema<ISensorReadingDocument>(
  {
    deviceId: {
      type: String,
      required: true,
      index: true, // Critical for device-specific queries
    },
    pH: {
      type: Number,
      required: false, // BUG FIX #2: Allow null for invalid sensors
      default: null,
    },
    turbidity: {
      type: Number,
      required: false, // BUG FIX #2: Allow null for invalid sensors
      default: null,
    },
    tds: {
      type: Number,
      required: false, // BUG FIX #2: Allow null for invalid sensors
      default: null,
    },
    pH_valid: {
      type: Boolean,
      required: true,
      default: true, // BUG FIX #2: Track sensor validity
    },
    tds_valid: {
      type: Boolean,
      required: true,
      default: true, // BUG FIX #2: Track sensor validity
    },
    turbidity_valid: {
      type: Boolean,
      required: true,
      default: true, // BUG FIX #2: Track sensor validity
    },
    timestamp: {
      type: Date,
      required: true,
      index: true, // Critical for time-based queries
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
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation
    collection: COLLECTIONS.SENSOR_READINGS,
  }
);

/**
 * Compound indexes for optimized time-series queries
 * CRITICAL for performance with high-volume data
 */

// Primary query pattern: Get readings for device within time range
sensorReadingSchema.index({ deviceId: 1, timestamp: -1 });

// Time-based queries for aggregation
sensorReadingSchema.index({ timestamp: -1, deviceId: 1 });

// Soft delete cleanup queries
sensorReadingSchema.index({ isDeleted: 1, scheduledPermanentDeletionAt: 1 });

// TTL index for automatic data cleanup - 90 days retention
// ✅ ENABLED: Auto-deletes sensor readings older than 90 days
// With 30-second intervals: ~3.9GB storage max (fits MongoDB Shared Tier)
sensorReadingSchema.index({ createdAt: 1 }, { expireAfterSeconds: TIME.NINETY_DAYS / 1000 });

/**
 * Sensor Reading Model
 */
const SensorReading: Model<ISensorReadingDocument> = mongoose.model<ISensorReadingDocument>(
  COLLECTIONS.SENSOR_READINGS,
  sensorReadingSchema
);

export default SensorReading;
