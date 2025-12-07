/**
 * Permanent Deletion Job
 * Runs daily at 2:00 AM to permanently delete soft-deleted records
 * older than 30 days (past their scheduledPermanentDeletionAt date)
 */

import * as cron from 'node-cron';
import { logInfo, logError } from '@utils/logger.util';
import Device from '@feature/devices/device.model';
import Alert from '@feature/alerts/alert.model';
import SensorReading from '@feature/sensorReadings/sensorReading.model';

let jobInstance: cron.ScheduledTask | null = null;

/**
 * Permanently delete expired soft-deleted records
 * Deletes devices, alerts, and sensor readings that have passed their 30-day recovery window
 */
const permanentlyDeleteExpiredRecords = async (): Promise<void> => {
  try {
    const now = new Date();
    const query = {
      isDeleted: true,
      scheduledPermanentDeletionAt: { $lt: now },
    };

    // Permanently delete devices
    const devicesResult = await Device.deleteMany(query);
    const devicesDeleted = devicesResult.deletedCount || 0;

    // Permanently delete alerts
    const alertsResult = await Alert.deleteMany(query);
    const alertsDeleted = alertsResult.deletedCount || 0;

    // Permanently delete sensor readings
    const readingsResult = await SensorReading.deleteMany(query);
    const readingsDeleted = readingsResult.deletedCount || 0;

    const totalDeleted = devicesDeleted + alertsDeleted + readingsDeleted;

    if (totalDeleted > 0) {
      logInfo(
        `Permanent Deletion Job: Completed`,
        {
          devicesDeleted,
          alertsDeleted,
          readingsDeleted,
          totalDeleted,
          timestamp: now.toISOString(),
        }
      );
    } else {
      logInfo('Permanent Deletion Job: No expired records to delete');
    }
  } catch (error) {
    logError('Permanent Deletion Job: Failed to delete expired records', error);
  }
};

/**
 * Start permanent deletion job
 * Runs daily at 2:00 AM (0 2 * * *)
 */
export const startPermanentDeletionJob = (): void => {
  if (jobInstance) {
    logInfo('Permanent Deletion Job: Job already running');
    return;
  }

  // Schedule: Daily at 2:00 AM (0 2 * * *)
  jobInstance = cron.schedule('0 2 * * *', async () => {
    logInfo('Permanent Deletion Job: Running daily cleanup...');
    await permanentlyDeleteExpiredRecords();
  });

  logInfo('✅ Permanent Deletion Job: Started (runs daily at 2:00 AM)');
};

/**
 * Stop permanent deletion job
 */
export const stopPermanentDeletionJob = (): void => {
  if (jobInstance) {
    jobInstance.stop();
    jobInstance = null;
    logInfo('Permanent Deletion Job: Stopped');
  }
};

/**
 * Manually trigger permanent deletion (for testing or manual cleanup)
 */
export const triggerPermanentDeletion = async (): Promise<void> => {
  logInfo('Permanent Deletion Job: Manually triggered');
  await permanentlyDeleteExpiredRecords();
};
