const cron = require('node-cron');
const { Device, SensorReading } = require('../devices/device.Model');
const logger = require('../utils/logger');
const { TIME } = require('../utils/constants');

/**
 * Background Jobs Service
 * Handles scheduled tasks using node-cron
 */

/**
 * Check for offline devices
 * Runs every 5 minutes
 * Marks devices as offline if no reading received in last 5 minutes
 */
const checkOfflineDevices = cron.schedule('*/5 * * * *', async () => {
  try {
    logger.info('[Background Job] Checking for offline devices...');
    
    const fiveMinutesAgo = new Date(Date.now() - TIME.FIVE_MINUTES);
    
    // Find devices that haven't been seen in 5 minutes and mark them offline
    const result = await Device.updateMany(
      {
        lastSeen: { $lt: fiveMinutesAgo },
        status: 'online',
      },
      {
        status: 'offline',
      }
    );

    if (result.modifiedCount > 0) {
      logger.info('[Background Job] Marked devices as offline', {
        count: result.modifiedCount,
      });
    }
  } catch (error) {
    logger.error('[Background Job] Error checking offline devices:', {
      error: error.message,
      stack: error.stack,
    });
  }
}, {
  scheduled: false, // Don't start immediately, will be started manually
});

/**
 * Cleanup old sensor readings
 * Runs daily at 2:00 AM
 * Deletes sensor readings older than 90 days
 */
const cleanupOldReadings = cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('[Background Job] Cleaning up old sensor readings...');
    
    const ninetyDaysAgo = new Date(Date.now() - TIME.NINETY_DAYS);
    
    const result = await SensorReading.deleteMany({
      timestamp: { $lt: ninetyDaysAgo },
    });

    logger.info('[Background Job] Deleted old sensor readings', {
      count: result.deletedCount,
    });
  } catch (error) {
    logger.error('[Background Job] Error cleaning up old readings:', {
      error: error.message,
      stack: error.stack,
    });
  }
}, {
  scheduled: false,
  timezone: 'UTC',
});

/**
 * Start all background jobs
 */
function startBackgroundJobs() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Condensed production log
    logger.info('[JOBS] Background jobs started ✓');
  } else {
    // Detailed development logs
    logger.info('[JOBS] Starting background jobs...');
    logger.info('[OK] Offline device checker started (runs every 5 minutes)');
    logger.info('[OK] Old readings cleanup started (runs daily at 2:00 AM UTC)');
  }
  
  checkOfflineDevices.start();
  cleanupOldReadings.start();
}

/**
 * Stop all background jobs
 */
function stopBackgroundJobs() {
  logger.info('[JOBS] Stopping background jobs...');
  
  checkOfflineDevices.stop();
  cleanupOldReadings.stop();
  
  logger.info('[OK] All background jobs stopped');
}

module.exports = {
  startBackgroundJobs,
  stopBackgroundJobs,
};
