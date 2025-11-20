const mongoose = require('mongoose');

/**
 * Report Schema for water quality and device status reports
 */
const reportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['water-quality', 'device-status', 'compliance'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'generating',
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      deviceCount: Number,
      alertCount: Number,
      readingCount: Number,
      processingTime: Number,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for optimized queries
 */
reportSchema.index({ type: 1, createdAt: -1 });
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

/**
 * Instance method to get public report data
 */
reportSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    reportId: this.reportId,
    type: this.type,
    title: this.title,
    generatedBy: this.generatedBy,
    startDate: this.startDate,
    endDate: this.endDate,
    status: this.status,
    data: this.data,
    summary: this.summary,
    metadata: this.metadata,
    error: this.error,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
