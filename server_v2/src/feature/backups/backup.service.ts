/**
 * Backup Service
 * 
 * Handles automated backups with MongoDB GridFS storage:
 * - MongoDB collection exports
 * - Compression and encryption
 * - GridFS uploads for backup storage
 * - Backup retention policies
 * - Backup verification
 * 
 * @module feature/backups/backup.service
 */

import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

import Device from '@feature/devices/device.model';
import Alert from '@feature/alerts/alert.model';
import SensorReading from '@feature/sensorReadings/sensorReading.model';
import Backup from './backup.model';
import logger from '@utils/logger.util';
import { gridfsService } from '@utils';
import { appConfig } from '@core/configs';

import {
  IBackupMetadata,
  IBackupData,
  BackupType,
  BackupStatus,
  IBackup,
  IBackupUploadResult,
  IBackupDocument,
} from './backup.types';

export class BackupService {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || this.generateEncryptionKey();
  }

  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('Generated temporary encryption key. Set BACKUP_ENCRYPTION_KEY in environment for production.');
    return key;
  }

  private async exportCollections(): Promise<IBackupData> {
    logger.info('Exporting MongoDB collections...');
    const [devices, users, sensorReadings, alerts] = await Promise.all([
      Device.find({}).lean(),
      Promise.resolve([]),
      SensorReading.find({
        $or: [
          { isDeleted: true },
          { timestamp: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        ],
      }).lean(),
      Alert.find({
        $or: [
          { isDeleted: true },
          { timestamp: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        ],
      }).lean(),
    ]);
    const metadata: IBackupMetadata = {
      timestamp: new Date(),
      version: appConfig.server.apiVersion,
      environment: appConfig.server.nodeEnv,
      collections: {
        devices: devices.length,
        users: users.length,
        sensorReadings: sensorReadings.length,
        alerts: alerts.length,
      },
      size: 0,
      encrypted: true,
    };
    logger.info('Collection export complete', metadata.collections);
    return { devices, users, sensorReadings, alerts, config: { apiVersion: appConfig.server.apiVersion, environment: appConfig.server.nodeEnv }, metadata };
  }

  private async compressAndEncrypt(data: IBackupData): Promise<Buffer> {
    logger.info('Compressing and encrypting backup...');
    const jsonData = JSON.stringify(data);
    const compressed = await promisify(zlib.gzip)(Buffer.from(jsonData));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.substring(0, 32)), iv);
    const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
    const result = Buffer.concat([iv, encrypted]);
    logger.info(`Backup compressed and encrypted. Size: ${(result.length / 1024 / 1024).toFixed(2)} MB`);
    return result;
  }

  private async decryptAndDecompress(encryptedData: Buffer): Promise<IBackupData> {
    logger.info('Decrypting and decompressing backup...');
    const iv = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.substring(0, 32)), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const decompressed = await promisify(zlib.gunzip)(decrypted);
    const data = JSON.parse(decompressed.toString());
    logger.info('Backup decrypted and decompressed');
    return data;
  }

  private async uploadToGridFS(encryptedData: Buffer, filename: string, type: BackupType): Promise<IBackupUploadResult> {
    try {
      logger.info(`Uploading backup to GridFS: ${filename}`);
      const uploadResult = await gridfsService.uploadFile(encryptedData, filename, { filename, contentType: 'application/gzip', backupType: type, uploadedAt: new Date() }, 'backups');
      logger.info(`? Backup uploaded to GridFS: ${uploadResult.fileId}`);
      return uploadResult;
    } catch (error) {
      logger.error('Failed to upload backup to GridFS', error);
      throw error;
    }
  }

  async createBackup(type: BackupType = BackupType.MANUAL): Promise<IBackup> {
    const startTime = Date.now();
    const timestamp = new Date();
    const filename = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}_${type}.gz`;
    let backupDoc: IBackupDocument | null = null;
    try {
      logger.info(`Starting ${type} backup...`);
      const backupData = await this.exportCollections();
      const encryptedData = await this.compressAndEncrypt(backupData);
      backupData.metadata.size = encryptedData.length;
      const uploadResult = await this.uploadToGridFS(encryptedData, filename, type);
      backupDoc = await Backup.create({ filename, type, status: BackupStatus.COMPLETED, size: encryptedData.length, fileId: uploadResult.fileId, metadata: backupData.metadata });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`? Backup completed in ${duration}s`, { filename, size: `${(backupDoc.size / 1024 / 1024).toFixed(2)} MB`, fileId: backupDoc.fileId.toString() });
      return { id: backupDoc._id.toString(), filename: backupDoc.filename, type: backupDoc.type, status: backupDoc.status, size: backupDoc.size, fileId: backupDoc.fileId, metadata: backupDoc.metadata, createdAt: backupDoc.createdAt };
    } catch (error) {
      logger.error('Backup failed', error);
      if (backupDoc) await Backup.findByIdAndUpdate(backupDoc._id, { $set: { status: BackupStatus.FAILED, error: error instanceof Error ? error.message : 'Unknown error' } });
      throw error;
    }
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    logger.info(`Restoring from backup: ${backupId}`);
    try {
      const backupDoc = await Backup.findById(backupId);
      if (!backupDoc) throw new Error(`Backup not found: ${backupId}`);
      const encryptedData = await gridfsService.downloadFileAsBuffer(backupDoc.fileId, 'backups');
      const backupData = await this.decryptAndDecompress(encryptedData);
      logger.info('Restoring collections...', backupData.metadata.collections);
      await Device.deleteMany({});
      await Device.insertMany(backupData.devices);
      await Alert.deleteMany({});
      await Alert.insertMany(backupData.alerts);
      await SensorReading.deleteMany({});
      await SensorReading.insertMany(backupData.sensorReadings);
      logger.info('? Backup restored successfully');
    } catch (error) {
      logger.error('Failed to restore backup', error);
      throw error;
    }
  }

  async cleanupOldBackups(): Promise<void> {
    logger.info('Cleaning up old backups...');
    try {
      const now = new Date();
      const retentionDays = { [BackupType.DAILY]: 7, [BackupType.WEEKLY]: 28, [BackupType.MONTHLY]: 365, [BackupType.MANUAL]: 90 };
      for (const [type, days] of Object.entries(retentionDays)) {
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const oldBackups = await Backup.find({ type: type as BackupType, createdAt: { $lt: cutoffDate } });
        for (const backup of oldBackups) {
          try {
            await gridfsService.deleteFile(backup.fileId, 'backups');
            await Backup.findByIdAndDelete(backup._id);
            logger.info(`Deleted old backup: ${backup.filename}`);
          } catch (error) {
            logger.error(`Failed to delete backup ${backup.filename}:`, error);
          }
        }
        if (oldBackups.length > 0) logger.info(`Cleaned up ${oldBackups.length} old ${type} backups`);
      }
      logger.info('? Backup cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup old backups', error);
    }
  }

  async listBackups(type?: BackupType): Promise<IBackup[]> {
    try {
      const filter: any = {};
      if (type) filter.type = type;
      const backupDocs = await Backup.find(filter).sort({ createdAt: -1 }).lean();
      return backupDocs.map((doc) => ({ id: doc._id.toString(), filename: doc.filename, type: doc.type, status: doc.status, size: doc.size, fileId: doc.fileId, metadata: doc.metadata, createdAt: doc.createdAt, error: doc.error }));
    } catch (error) {
      logger.error('Failed to list backups', error);
      return [];
    }
  }

  async getBackupById(backupId: string): Promise<IBackup | null> {
    try {
      const backupDoc = await Backup.findById(backupId).lean();
      if (!backupDoc) return null;
      return { id: backupDoc._id.toString(), filename: backupDoc.filename, type: backupDoc.type, status: backupDoc.status, size: backupDoc.size, fileId: backupDoc.fileId, metadata: backupDoc.metadata, createdAt: backupDoc.createdAt, error: backupDoc.error };
    } catch (error) {
      logger.error('Failed to get backup by ID', error);
      return null;
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backupDoc = await Backup.findById(backupId);
      if (!backupDoc) throw new Error(`Backup not found: ${backupId}`);
      await gridfsService.deleteFile(backupDoc.fileId, 'backups');
      await Backup.findByIdAndDelete(backupId);
      logger.info(`? Deleted backup: ${backupDoc.filename}`);
    } catch (error) {
      logger.error('Failed to delete backup', error);
      throw error;
    }
  }

  async downloadBackup(backupId: string): Promise<Buffer> {
    try {
      const backupDoc = await Backup.findById(backupId);
      if (!backupDoc) throw new Error(`Backup not found: ${backupId}`);
      const fileData = await gridfsService.downloadFileAsBuffer(backupDoc.fileId, 'backups');
      logger.info(`Downloaded backup: ${backupDoc.filename}`);
      return fileData;
    } catch (error) {
      logger.error('Failed to download backup', error);
      throw error;
    }
  }

  async getBackupStatistics(): Promise<{ total: number; byType: Record<BackupType, number>; byStatus: Record<BackupStatus, number>; totalSize: number }> {
    try {
      const stats = await Backup.aggregate([{ $facet: { total: [{ $count: 'count' }], byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }], byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }], totalSize: [{ $group: { _id: null, size: { $sum: '$size' } } }] } }]);
      const result = stats[0];
      const byType: Record<string, number> = {};
      for (const type of Object.values(BackupType)) byType[type] = 0;
      result.byType.forEach((item: any) => { byType[item._id] = item.count; });
      const byStatus: Record<string, number> = {};
      for (const status of Object.values(BackupStatus)) byStatus[status] = 0;
      result.byStatus.forEach((item: any) => { byStatus[item._id] = item.count; });
      return { total: result.total[0]?.count || 0, byType: byType as Record<BackupType, number>, byStatus: byStatus as Record<BackupStatus, number>, totalSize: result.totalSize[0]?.size || 0 };
    } catch (error) {
      logger.error('Failed to get backup statistics', error);
      return { total: 0, byType: {} as Record<BackupType, number>, byStatus: {} as Record<BackupStatus, number>, totalSize: 0 };
    }
  }
}

export default new BackupService();
