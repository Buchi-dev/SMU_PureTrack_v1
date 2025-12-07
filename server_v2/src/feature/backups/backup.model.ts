/**
 * Backup Model
 * 
 * Mongoose schema for backup metadata storage
 * Actual backup files are stored in GridFS (backups.files and backups.chunks collections)
 * 
 * @module feature/backups/backup.model
 */

import { Schema, model } from 'mongoose';
import { IBackupDocument, BackupType, BackupStatus } from './backup.types';
import { COLLECTIONS } from '@core/configs/constants.config';

/**
 * Backup Schema
 * Stores metadata for backups, while files are stored in GridFS
 */
const backupSchema = new Schema<IBackupDocument>(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(BackupType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BackupStatus),
      required: true,
      default: BackupStatus.IN_PROGRESS,
      index: true,
    },
    size: {
      type: Number,
      required: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'backups.files', // GridFS files collection
    },
    metadata: {
      timestamp: {
        type: Date,
        required: true,
      },
      version: {
        type: String,
        required: true,
      },
      environment: {
        type: String,
        required: true,
      },
      collections: {
        devices: { type: Number, required: true },
        users: { type: Number, required: true },
        sensorReadings: { type: Number, required: true },
        alerts: { type: Number, required: true },
      },
      size: {
        type: Number,
        required: true,
      },
      encrypted: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
    error: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.BACKUPS,
  }
);

// Indexes for query optimization
backupSchema.index({ type: 1, status: 1, createdAt: -1 });
backupSchema.index({ status: 1, createdAt: -1 });
backupSchema.index({ createdAt: -1 });

// Index for automatic cleanup of old backups
backupSchema.index({ type: 1, createdAt: 1 });

/**
 * Backup Model
 */
const Backup = model<IBackupDocument>('Backup', backupSchema);

export default Backup;
