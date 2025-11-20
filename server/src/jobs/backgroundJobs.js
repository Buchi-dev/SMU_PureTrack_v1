const cron = require('node-cron');
const { Device, SensorReading } = require('../devices/device.Model');

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
    console.log('[Background Job] Checking for offline devices...');
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
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
      console.log(`[Background Job] Marked ${result.modifiedCount} devices as offline`);
    }
  } catch (error) {
    console.error('[Background Job] Error checking offline devices:', error);
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
    console.log('[Background Job] Cleaning up old sensor readings...');
    
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const result = await SensorReading.deleteMany({
      timestamp: { $lt: ninetyDaysAgo },
    });

    console.log(`[Background Job] Deleted ${result.deletedCount} old sensor readings`);
  } catch (error) {
    console.error('[Background Job] Error cleaning up old readings:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC',
});

/**
 * Generate weekly summary reports
 * Runs every Monday at 8:00 AM
 * TODO: Implement automatic report generation and email distribution
 */
const generateWeeklyReports = cron.schedule('0 8 * * 1', async () => {
  try {
    console.log('[Background Job] Generating weekly reports...');
    
    // TODO: Implement automatic report generation
    // This would call the report generation functions with last week's date range
    // and email the reports to subscribed users
    
    console.log('[Background Job] Weekly reports generation - Not yet implemented');
  } catch (error) {
    console.error('[Background Job] Error generating weekly reports:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC',
});

/**
 * Start all background jobs
 */
function startBackgroundJobs() {
  console.log('\n🔄 Starting background jobs...');
  
  checkOfflineDevices.start();
  console.log('✓ Offline device checker started (runs every 5 minutes)');
  
  cleanupOldReadings.start();
  console.log('✓ Old readings cleanup started (runs daily at 2:00 AM UTC)');
  
  generateWeeklyReports.start();
  console.log('✓ Weekly reports generator started (runs every Monday at 8:00 AM UTC)');
  
  console.log('');
}

/**
 * Stop all background jobs
 */
function stopBackgroundJobs() {
  console.log('\n🛑 Stopping background jobs...');
  
  checkOfflineDevices.stop();
  cleanupOldReadings.stop();
  generateWeeklyReports.stop();
  
  console.log('✓ All background jobs stopped\n');
}

module.exports = {
  startBackgroundJobs,
  stopBackgroundJobs,
  checkOfflineDevices,
  cleanupOldReadings,
  generateWeeklyReports,
};
