/**
 * Report Cleanup Job
 * Runs daily at 2 AM to delete expired reports
 */

import * as cron from 'node-cron';
import { logInfo, logError } from '@utils/logger.util';

let jobInstance: cron.ScheduledTask | null = null;

/**
 * Delete expired reports
 * Dynamically imports report service to avoid circular dependencies
 */
const deleteExpiredReports = async (): Promise<void> => {
  try {
    const reportService = (await import('@feature/reports/report.service')).default;
    const deletedCount = await reportService.deleteExpiredReports();
    
    if (deletedCount > 0) {
      logInfo(`Report Cleanup: Deleted ${deletedCount} expired reports`);
    } else {
      logInfo('Report Cleanup: No expired reports to delete');
    }
  } catch (error) {
    logError('Report Cleanup: Failed to delete expired reports', error);
  }
};

/**
 * Start report cleanup job
 * Runs daily at 2 AM (0 2 * * *)
 */
export const startReportCleanupJob = (): void => {
  if (jobInstance) {
    logInfo('Report Cleanup: Job already running');
    return;
  }

  // Schedule: Daily at 2 AM (0 2 * * *)
  jobInstance = cron.schedule('0 2 * * *', async () => {
    logInfo('Report Cleanup: Running...');
    await deleteExpiredReports();
  });

  logInfo('✅ Report Cleanup: Started (runs daily at 2 AM)');
};

/**
 * Stop report cleanup job
 */
export const stopReportCleanupJob = (): void => {
  if (jobInstance) {
    jobInstance.stop();
    jobInstance = null;
    logInfo('Report Cleanup: Stopped');
  }
};
