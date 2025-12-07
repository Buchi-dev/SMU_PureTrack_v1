/**
 * Report Model
 * 
 * Mongoose schema for report generation and storage
 * 
 * @module feature/reports/report.model
 */

import { Schema, model } from 'mongoose';
import {
  IReportDocument,
  ReportType,
  ReportStatus,
  ReportFormat,
  IReportPublic,
} from './report.types';
import { COLLECTIONS } from '@core/configs/constants.config';

/**
 * Report Schema
 */
const reportSchema = new Schema<IReportDocument>(
  {
    type: {
      type: String,
      enum: Object.values(ReportType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.GENERATING,
      index: true,
    },
    format: {
      type: String,
      enum: Object.values(ReportFormat),
      required: true,
      default: ReportFormat.PDF,
    },
    parameters: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    file: {
      fileId: {
        type: Schema.Types.ObjectId,
        required: false,
      },
      filename: {
        type: String,
        required: false,
      },
      format: {
        type: String,
        enum: Object.values(ReportFormat),
        required: false,
      },
      size: {
        type: Number,
        required: false,
      },
      mimeType: {
        type: String,
        required: false,
      },
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: COLLECTIONS.USERS,
      index: true,
    },
    generatedAt: {
      type: Date,
      required: false,
    },
    errorMessage: {
      type: String,
      required: false,
    },
    expiresAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.REPORTS,
  }
);

// Compound indexes for query optimization
reportSchema.index({ type: 1, status: 1, createdAt: -1 });
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

// TTL index for expired reports
reportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Helper to convert Date to Firebase Timestamp format
 */
const toFirebaseTimestamp = (date: Date | undefined): { seconds: number; nanoseconds: number } => {
  if (!date) {
    return { seconds: 0, nanoseconds: 0 };
  }
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1000000,
  };
};

/**
 * Convert document to public profile
 */
reportSchema.methods.toPublicProfile = function (): IReportPublic {
  // Handle populated generatedBy field
  let generatedByInfo: any;
  if (this.generatedBy && typeof this.generatedBy === 'object') {
    // generatedBy is populated with user object
    generatedByInfo = {
      id: this.generatedBy._id?.toString() || this.generatedBy.toString(),
      displayName: (this.generatedBy as any).displayName || 'Unknown User',
      email: (this.generatedBy as any).email || '',
    };
  } else {
    // generatedBy is just an ObjectId string
    generatedByInfo = this.generatedBy?.toString() || '';
  }

  return {
    id: this._id.toString(),
    type: this.type,
    title: this.title,
    description: this.description,
    status: this.status,
    format: this.format,
    parameters: this.parameters,
    file: this.file
      ? {
          fileId: this.file.fileId.toString(),
          filename: this.file.filename,
          format: this.file.format,
          size: this.file.size,
          mimeType: this.file.mimeType,
        }
      : undefined,
    generatedBy: generatedByInfo,
    generatedAt: toFirebaseTimestamp(this.generatedAt),
    errorMessage: this.errorMessage,
    expiresAt: toFirebaseTimestamp(this.expiresAt),
    createdAt: toFirebaseTimestamp(this.createdAt),
    updatedAt: toFirebaseTimestamp(this.updatedAt),
  };
};

const Report = model<IReportDocument>(COLLECTIONS.REPORTS, reportSchema);

export default Report;
