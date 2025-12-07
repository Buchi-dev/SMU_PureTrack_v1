/**
 * Backup Scheduler Job
 * Automated backup scheduling:
 * - Daily backups at 3:00 AM
 * - Weekly backups every Sunday at 3:00 AM
 * - Monthly backups on 1st of each month at 3:00 AM
 * - Automatic retention policy enforcement
 */

import * as cron from 'node-cron';
import { logInfo, logError } from '@utils/logger.util';
import backupService from '../backups/backup.service';
import { BackupType } from '../backups/backup.types';

let dailyBackupJob: cron.ScheduledTask | null = null;
let weeklyBackupJob: cron.ScheduledTask | null = null;
let monthlyBackupJob: cron.ScheduledTask | null = null;
let cleanupJob: cron.ScheduledTask | null = null;

/**
 * Perform daily backup
 */
const performDailyBackup = async (): Promise<void> => {
  try {
    logInfo('Daily Backup: Starting...');
    const backup = await backupService.createBackup(BackupType.DAILY);
    logInfo('Daily Backup: Completed successfully', {
      filename: backup.filename,
      size: `${(backup.size / 1024 / 1024).toFixed(2)} MB`,
    });
  } catch (error) {
    logError('Daily Backup: Failed', error);
  }
};

/**
 * Perform weekly backup
 */
const performWeeklyBackup = async (): Promise<void> => {
  try {
    logInfo('Weekly Backup: Starting...');
    const backup = await backupService.createBackup(BackupType.WEEKLY);
    logInfo('Weekly Backup: Completed successfully', {
      filename: backup.filename,
      size: `${(backup.size / 1024 / 1024).toFixed(2)} MB`,
    });
  } catch (error) {
    logError('Weekly Backup: Failed', error);
  }
};

/**
 * Perform monthly backup
 */
const performMonthlyBackup = async (): Promise<void> => {
  try {
    logInfo('Monthly Backup: Starting...');
    const backup = await backupService.createBackup(BackupType.MONTHLY);
    logInfo('Monthly Backup: Completed successfully', {
      filename: backup.filename,
      size: `${(backup.size / 1024 / 1024).toFixed(2)} MB`,
    });
  } catch (error) {
    logError('Monthly Backup: Failed', error);
  }
};

/**
 * Cleanup old backups based on retention policy
 */
const cleanupOldBackups = async (): Promise<void> => {
  try {
    logInfo('Backup Cleanup: Starting...');
    await backupService.cleanupOldBackups();
    logInfo('Backup Cleanup: Completed successfully');
  } catch (error) {
    logError('Backup Cleanup: Failed', error);
  }
};

/**
 * Start daily backup job
 * Runs every day at 3:00 AM (0 3 * * *)
 */
export const startDailyBackupJob = (): void => {
  if (dailyBackupJob) {
    logInfo('Daily Backup Job: Already running');
    return;
  }

  // Schedule: Daily at 3:00 AM
  dailyBackupJob = cron.schedule('0 3 * * *', async () => {
    await performDailyBackup();
  });

  logInfo('✅ Daily Backup Job: Started (runs daily at 3:00 AM)');
};

/**
 * Start weekly backup job
 * Runs every Sunday at 3:00 AM (0 3 * * 0)
 */
export const startWeeklyBackupJob = (): void => {
  if (weeklyBackupJob) {
    logInfo('Weekly Backup Job: Already running');
    return;
  }

  // Schedule: Every Sunday at 3:00 AM
  weeklyBackupJob = cron.schedule('0 3 * * 0', async () => {
    await performWeeklyBackup();
  });

  logInfo('✅ Weekly Backup Job: Started (runs every Sunday at 3:00 AM)');
};

/**
 * Start monthly backup job
 * Runs on 1st of each month at 3:00 AM (0 3 1 * *)
 */
export const startMonthlyBackupJob = (): void => {
  if (monthlyBackupJob) {
    logInfo('Monthly Backup Job: Already running');
    return;
  }

  // Schedule: 1st of each month at 3:00 AM
  monthlyBackupJob = cron.schedule('0 3 1 * *', async () => {
    await performMonthlyBackup();
  });

  logInfo('✅ Monthly Backup Job: Started (runs on 1st of each month at 3:00 AM)');
};

/**
 * Start backup cleanup job
 * Runs daily at 4:00 AM (after backups complete) (0 4 * * *)
 */
export const startBackupCleanupJob = (): void => {
  if (cleanupJob) {
    logInfo('Backup Cleanup Job: Already running');
    return;
  }

  // Schedule: Daily at 4:00 AM
  cleanupJob = cron.schedule('0 4 * * *', async () => {
    await cleanupOldBackups();
  });

  logInfo('✅ Backup Cleanup Job: Started (runs daily at 4:00 AM)');
};

/**
 * Start all backup jobs
 */
export const startBackupJobs = (): void => {
  startDailyBackupJob();
  startWeeklyBackupJob();
  startMonthlyBackupJob();
  startBackupCleanupJob();
};

/**
 * Stop all backup jobs
 */
export const stopBackupJobs = (): void => {
  if (dailyBackupJob) {
    dailyBackupJob.stop();
    dailyBackupJob = null;
    logInfo('Daily Backup Job: Stopped');
  }

  if (weeklyBackupJob) {
    weeklyBackupJob.stop();
    weeklyBackupJob = null;
    logInfo('Weekly Backup Job: Stopped');
  }

  if (monthlyBackupJob) {
    monthlyBackupJob.stop();
    monthlyBackupJob = null;
    logInfo('Monthly Backup Job: Stopped');
  }

  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
    logInfo('Backup Cleanup Job: Stopped');
  }
};

/**
 * Manually trigger backup (for testing or on-demand backups)
 */
export const triggerManualBackup = async (type: BackupType = BackupType.MANUAL): Promise<void> => {
  logInfo(`Manual Backup: Triggered (type: ${type})`);
  await backupService.createBackup(type);
};
