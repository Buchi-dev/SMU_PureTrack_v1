/**
 * Alert Model
 * Mongoose schema for water quality alerts with full TypeScript support
 */

import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  IAlertDocument,
  IAlertPublic,
  AlertSeverity,
  AlertStatus,
  AlertParameter,
} from './alert.types';
import { COLLECTIONS } from '@core/configs/constants.config';

/**
 * Alert Schema
 * Tracks alerts generated from sensor readings exceeding thresholds
 */
const alertSchema = new Schema<IAlertDocument>(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => `ALT-${uuidv4()}`,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    deviceName: {
      type: String,
      required: true,
    },
    deviceLocation: {
      type: String,
      default: '',
    },
    severity: {
      type: String,
      enum: Object.values(AlertSeverity),
      required: true,
      index: true,
    },
    parameter: {
      type: String,
      enum: Object.values(AlertParameter),
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AlertStatus),
      default: AlertStatus.UNACKNOWLEDGED,
      index: true,
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: COLLECTIONS.USERS,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: COLLECTIONS.USERS,
    },
    resolutionNotes: {
      type: String,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    // Lifecycle tracking for deduplication
    acknowledged: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Occurrence tracking
    occurrenceCount: {
      type: Number,
      default: 1,
    },
    firstOccurrence: {
      type: Date,
      default: Date.now,
    },
    lastOccurrence: {
      type: Date,
      default: Date.now,
    },
    currentValue: {
      type: Number,
      required: true,
    },
    // Email tracking
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
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
    timestamps: true, // Adds createdAt and updatedAt
    collection: COLLECTIONS.ALERTS,
  }
);

/**
 * Compound indexes for optimized queries
 * Individual field indexes (deviceId, status, severity, alertId, acknowledged) 
 * are created from schema definitions above
 */

// Multi-field query performance
alertSchema.index({ deviceId: 1, timestamp: -1 });
alertSchema.index({ status: 1, timestamp: -1 });
alertSchema.index({ severity: 1, status: 1 });
alertSchema.index({ deviceId: 1, parameter: 1, status: 1, timestamp: -1 });

// Alert deduplication/cooldown checks (CRITICAL for performance)
alertSchema.index({ deviceId: 1, parameter: 1, acknowledged: 1, createdAt: -1 });

// Device-specific alert queries
alertSchema.index({ deviceId: 1, status: 1, timestamp: -1 });

// Soft delete cleanup queries
alertSchema.index({ isDeleted: 1, scheduledPermanentDeletionAt: 1 });

/**
 * Instance method to get public alert data
 * @returns Public alert object safe for client consumption
 */
alertSchema.methods.toPublicProfile = function (this: IAlertDocument): IAlertPublic {
  return {
    id: this._id,
    alertId: this.alertId,
    deviceId: this.deviceId,
    deviceName: this.deviceName,
    deviceLocation: this.deviceLocation,
    severity: this.severity,
    parameter: this.parameter,
    value: this.value,
    threshold: this.threshold,
    message: this.message,
    status: this.status,
    acknowledged: this.acknowledged,
    acknowledgedAt: this.acknowledgedAt,
    acknowledgedBy: this.acknowledgedBy,
    resolvedAt: this.resolvedAt,
    resolvedBy: this.resolvedBy,
    resolutionNotes: this.resolutionNotes,
    timestamp: this.timestamp,
    occurrenceCount: this.occurrenceCount,
    firstOccurrence: this.firstOccurrence,
    lastOccurrence: this.lastOccurrence,
    currentValue: this.currentValue,
    emailSent: this.emailSent,
    emailSentAt: this.emailSentAt,
    isDeleted: this.isDeleted,
    deletedAt: this.deletedAt,
    deletedBy: this.deletedBy,
    scheduledPermanentDeletionAt: this.scheduledPermanentDeletionAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Pre-save hook: Set currentValue on creation
 */
alertSchema.pre('save', function () {
  if (this.isNew && !this.currentValue) {
    this.currentValue = this.value;
  }
});

/**
 * Alert Model
 */
const Alert: Model<IAlertDocument> = mongoose.model<IAlertDocument>(
  COLLECTIONS.ALERTS,
  alertSchema
);

export default Alert;
