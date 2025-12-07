/**
 * Device Presence Checker Job
 * Sends "who_is_online" query to all devices via MQTT
 * Devices respond with presence/response message
 * This is the ONLY mechanism for device status updates (ping-pong)
 * 
 * Two-phase operation:
 * 1. Send "who_is_online" query - devices respond, server marks them ONLINE
 * 2. Mark non-responsive devices as OFFLINE (after timeout)
 */

import * as cron from 'node-cron';
import { logInfo, logError } from '@utils/logger.util';

let jobInstance: cron.ScheduledTask | null = null;

/**
 * Send presence query to all devices
 * Publishes {"query":"who_is_online"} to presence/query topic
 * Devices that respond will be marked ONLINE via handleDevicePresence
 */
const sendPresenceQuery = async (): Promise<void> => {
  try {
    // Dynamically import MQTT service to avoid circular dependencies
    const mqttService = (await import('@utils/mqtt.service')).default;
    
    // Send query to all devices
    const query = JSON.stringify({ query: 'who_is_online' });
    mqttService.publish('presence/query', query);
    
    logInfo('📡 Presence Checker: Sent "who_is_online" query to all devices');
  } catch (error) {
    logError('Presence Checker: Failed to send presence query', error);
  }
};

/**
 * Mark non-responsive devices as OFFLINE
 * Checks lastSeen timestamp and marks devices as offline if no response received
 * Runs after presence query to allow time for responses
 */
const markOfflineDevices = async (): Promise<void> => {
  try {
    // Dynamically import device service to avoid circular dependencies
    const { deviceService } = await import('@feature/devices');
    
    // Check for devices that haven't responded
    const count = await deviceService.checkOfflineDevices();
    
    if (count > 0) {
      logInfo(`⚠️ Presence Checker: Marked ${count} device(s) as OFFLINE (no response)`);
    }
  } catch (error) {
    logError('Presence Checker: Failed to mark offline devices', error);
  }
};

/**
 * Start presence checker job
 * Runs every 1 minute to query device status
 * After 30 seconds, marks non-responsive devices as offline
 */
export const startPresenceChecker = (): void => {
  if (jobInstance) {
    logInfo('Presence Checker: Job already running');
    return;
  }

  // Schedule: Every 1 minute (*/1 * * * *)
  jobInstance = cron.schedule('*/1 * * * *', async () => {
    // Phase 1: Send presence query
    await sendPresenceQuery();
    
    // Phase 2: After 30 seconds, mark non-responsive devices as offline
    // This gives devices time to respond before checking
    setTimeout(async () => {
      await markOfflineDevices();
    }, 30000); // 30 seconds delay
  });

  logInfo('✅ Presence Checker: Started (ping every 1 min, timeout check after 30s)');

  // Run immediately on startup
  sendPresenceQuery();
  setTimeout(async () => {
    await markOfflineDevices();
  }, 30000);
};

/**
 * Stop presence checker job
 */
export const stopPresenceChecker = (): void => {
  if (jobInstance) {
    jobInstance.stop();
    jobInstance = null;
    logInfo('Presence Checker: Stopped');
  }
};
