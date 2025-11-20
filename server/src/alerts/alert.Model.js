const mongoose = require('mongoose');

/**
 * Alert Schema for water quality monitoring system
 * Tracks alerts generated from sensor readings exceeding thresholds
 */
const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      index: true,
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
    severity: {
      type: String,
      enum: ['Critical', 'Warning', 'Advisory'],
      required: true,
      index: true,
    },
    parameter: {
      type: String,
      enum: ['pH', 'Turbidity', 'TDS'],
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
      enum: ['Unacknowledged', 'Acknowledged', 'Resolved'],
      default: 'Unacknowledged',
      index: true,
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNotes: {
      type: String,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

/**
 * Indexes for optimized queries
 */
alertSchema.index({ deviceId: 1, timestamp: -1 });
alertSchema.index({ status: 1, timestamp: -1 });
alertSchema.index({ severity: 1, status: 1 });

/**
 * Instance method to get public alert data
 */
alertSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    alertId: this.alertId,
    deviceId: this.deviceId,
    deviceName: this.deviceName,
    severity: this.severity,
    parameter: this.parameter,
    value: this.value,
    threshold: this.threshold,
    message: this.message,
    status: this.status,
    acknowledgedAt: this.acknowledgedAt,
    acknowledgedBy: this.acknowledgedBy,
    resolvedAt: this.resolvedAt,
    resolvedBy: this.resolvedBy,
    resolutionNotes: this.resolutionNotes,
    timestamp: this.timestamp,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
