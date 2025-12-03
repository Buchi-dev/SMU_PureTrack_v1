/**
 * Device Offline Checker Job
 * Runs every 5 minutes to check for offline devices
 * Marks devices offline if no heartbeat for 10 minutes
 */

import * as cron from 'node-cron';
import { logInfo, logError } from '@utils/logger.util';

let jobInstance: cron.ScheduledTask | null = null;

/**
 * Check offline devices
 * Dynamically imports device service to avoid circular dependencies
 */
const checkOfflineDevices = async (): Promise<void> => {
  try {
    const deviceService = (await import('@feature/devices/device.service')).default;
    const offlineCount = await deviceService.checkOfflineDevices();
    
    if (offlineCount > 0) {
      logInfo(`Device Offline Checker: Marked ${offlineCount} devices as offline`);
    }
  } catch (error) {
    logError('Device Offline Checker: Failed to check offline devices', error);
  }
};

/**
 * Start device offline checker job
 * Runs every 5 minutes
 */
export const startDeviceOfflineChecker = (): void => {
  if (jobInstance) {
    logInfo('Device Offline Checker: Job already running');
    return;
  }

  // Schedule: Every 5 minutes (*/5 * * * *)
  jobInstance = cron.schedule('*/5 * * * *', async () => {
    logInfo('Device Offline Checker: Running...');
    await checkOfflineDevices();
  });

  logInfo('✅ Device Offline Checker: Started (runs every 5 minutes)');

  // Run immediately on startup
  checkOfflineDevices();
};

/**
 * Stop device offline checker job
 */
export const stopDeviceOfflineChecker = (): void => {
  if (jobInstance) {
    jobInstance.stop();
    jobInstance = null;
    logInfo('Device Offline Checker: Stopped');
  }
};
