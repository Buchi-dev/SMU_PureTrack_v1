/**
 * Backup Types
 * TypeScript interfaces for backup management
 */

import { Document, Types } from 'mongoose';

/**
 * Backup metadata stored in backup file
 */
export interface IBackupMetadata {
  timestamp: Date;
  version: string;
  environment: string;
  collections: {
    devices: number;
    users: number;
    sensorReadings: number;
    alerts: number;
  };
  size: number;
  encrypted: boolean;
}

/**
 * Backup type
 */
export enum BackupType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  MANUAL = 'manual',
}

/**
 * Backup status
 */
export enum BackupStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Backup record stored in MongoDB
 */
export interface IBackup {
  id: string;
  filename: string;
  type: BackupType;
  status: BackupStatus;
  size: number;
  fileId: Types.ObjectId;
  metadata: IBackupMetadata;
  createdAt: Date;
  error?: string;
}

/**
 * Backup document interface (Mongoose)
 */
export interface IBackupDocument extends Document {
  _id: Types.ObjectId;
  filename: string;
  type: BackupType;
  status: BackupStatus;
  size: number;
  fileId: Types.ObjectId;
  metadata: IBackupMetadata;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Backup collection data
 */
export interface IBackupData {
  devices: any[];
  users: any[];
  sensorReadings: any[];
  alerts: any[];
  config: any;
  metadata: IBackupMetadata;
}

/**
 * Backup filters
 */
export interface IBackupFilters {
  type?: BackupType;
  status?: BackupStatus;
  startDate?: Date;
  endDate?: Date;
}

/**
 * GridFS upload result for backups
 */
export interface IBackupUploadResult {
  fileId: Types.ObjectId;
  filename: string;
  size: number;
  uploadedAt: Date;
}
