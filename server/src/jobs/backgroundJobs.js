const cron = require('node-cron');
const { Device, SensorReading } = require('../devices/device.Model');
const Report = require('../reports/report.Model');
const User = require('../users/user.Model');
const Alert = require('../alerts/alert.Model');
const { v4: uuidv4 } = require('uuid');
const { queueWeeklyReportEmail } = require('../utils/email.queue');
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
 * Generate weekly summary reports
 * Runs every Monday at 8:00 AM
 * Automatically generates water quality and device status reports for the past week
 */
const generateWeeklyReports = cron.schedule('0 8 * * 1', async () => {
  try {
    logger.info('[Background Job] Generating weekly reports...');
    
    // Calculate last week's date range (Monday to Sunday)
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - 7); // Go back 7 days to last Monday
    lastMonday.setHours(0, 0, 0, 0);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6); // End on Sunday
    lastSunday.setHours(23, 59, 59, 999);

    logger.info('[Background Job] Report period', {
      startDate: lastMonday.toISOString(),
      endDate: lastSunday.toISOString(),
    });

    // Get system admin user for report generation
    const systemAdmin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    
    if (!systemAdmin) {
      logger.warn('[Background Job] No admin user found. Skipping weekly report generation.');
      return;
    }

    // Get all registered devices
    const devices = await Device.find({ registrationStatus: 'registered' });
    const deviceIds = devices.map(d => d.deviceId);

    if (deviceIds.length === 0) {
      logger.info('[Background Job] No registered devices found. Skipping report generation.');
      return;
    }

    // Generate Water Quality Report
    const waterQualityReport = await generateWaterQualityReportJob(
      lastMonday,
      lastSunday,
      deviceIds,
      systemAdmin._id
    );

    // Generate Device Status Report
    const deviceStatusReport = await generateDeviceStatusReportJob(
      lastMonday,
      lastSunday,
      deviceIds,
      systemAdmin._id
    );

    logger.info('[Background Job] Weekly reports generated successfully', {
      waterQualityReport: waterQualityReport?.reportId || 'Failed',
      deviceStatusReport: deviceStatusReport?.reportId || 'Failed',
    });

    // Send email notifications to subscribed users
    if (waterQualityReport && deviceStatusReport) {
      try {
        const subscribedUsers = await User.find({
          'notificationPreferences.sendScheduledAlerts': true,
          'notificationPreferences.emailNotifications': true,
          status: 'active'
        });

        if (subscribedUsers.length > 0) {
          logger.info(`Queuing weekly reports for ${subscribedUsers.length} subscribed users...`);
          
          let queuedCount = 0;
          let failCount = 0;

          // Queue emails asynchronously instead of sending synchronously
          for (const user of subscribedUsers) {
            try {
              await queueWeeklyReportEmail(user, [waterQualityReport, deviceStatusReport]);
              queuedCount++;
            } catch (error) {
              logger.error(`Failed to queue email for ${user.email}:`, { error: error.message });
              failCount++;
            }
          }

          logger.info(`Email notifications queued: ${queuedCount} queued, ${failCount} failed`);
        } else {
          logger.info('No subscribed users found for email notifications');
        }
      } catch (emailError) {
        logger.error('Error queuing email notifications:', { error: emailError.message });
        // Don't throw - report generation succeeded even if emails failed
      }
    } else {
      logger.warn('[Background Job] Skipping email notifications - one or more reports failed to generate');
    }

  } catch (error) {
    logger.error('[Background Job] Error generating weekly reports:', {
      error: error.message,
      stack: error.stack,
    });
  }
}, {
  scheduled: false,
  timezone: 'UTC',
});

/**
 * Helper function to generate water quality report
 */
async function generateWaterQualityReportJob(startDate, endDate, deviceIds, generatedBy) {
  const startTime = Date.now();
  const reportId = uuidv4();
  
  try {
    const report = new Report({
      reportId,
      type: 'water-quality',
      title: `Weekly Water Quality Report (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`,
      generatedBy,
      startDate,
      endDate,
      status: 'generating',
    });
    await report.save();

    // Aggregate sensor readings
    const readingsAggregation = await SensorReading.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          count: { $sum: 1 },
          avgPH: { $avg: '$pH' },
          minPH: { $min: '$pH' },
          maxPH: { $max: '$pH' },
          avgTurbidity: { $avg: '$turbidity' },
          minTurbidity: { $min: '$turbidity' },
          maxTurbidity: { $max: '$turbidity' },
          avgTDS: { $avg: '$tds' },
          minTDS: { $min: '$tds' },
          maxTDS: { $max: '$tds' },
        },
      },
    ]);

    // Get alerts for the period
    const alerts = await Alert.find({
      deviceId: { $in: deviceIds },
      timestamp: { $gte: startDate, $lte: endDate },
    });

    // Get devices
    const devices = await Device.find({ deviceId: { $in: deviceIds } });

    // WHO compliance metrics
    const complianceMetrics = {
      pH: { guideline: '6.5 - 8.5', minAcceptable: 6.5, maxAcceptable: 8.5 },
      turbidity: { guideline: '< 5 NTU', maxAcceptable: 5 },
      tds: { guideline: '< 500 ppm', maxAcceptable: 500 },
    };

    // Build device reports
    const deviceReports = readingsAggregation.map(agg => {
      const device = devices.find(d => d.deviceId === agg._id);
      const deviceAlerts = alerts.filter(a => a.deviceId === agg._id);

      const pHCompliant = agg.avgPH >= complianceMetrics.pH.minAcceptable && 
                          agg.avgPH <= complianceMetrics.pH.maxAcceptable;
      const turbidityCompliant = agg.avgTurbidity < complianceMetrics.turbidity.maxAcceptable;
      const tdsCompliant = agg.avgTDS < complianceMetrics.tds.maxAcceptable;

      return {
        deviceId: agg._id,
        deviceName: device?.location || agg._id,
        readingCount: agg.count,
        parameters: {
          pH: {
            avg: parseFloat(agg.avgPH.toFixed(2)),
            min: parseFloat(agg.minPH.toFixed(2)),
            max: parseFloat(agg.maxPH.toFixed(2)),
            compliant: pHCompliant,
          },
          turbidity: {
            avg: parseFloat(agg.avgTurbidity.toFixed(2)),
            min: parseFloat(agg.minTurbidity.toFixed(2)),
            max: parseFloat(agg.maxTurbidity.toFixed(2)),
            compliant: turbidityCompliant,
          },
          tds: {
            avg: parseFloat(agg.avgTDS.toFixed(2)),
            min: parseFloat(agg.minTDS.toFixed(2)),
            max: parseFloat(agg.maxTDS.toFixed(2)),
            compliant: tdsCompliant,
          },
        },
        alerts: {
          total: deviceAlerts.length,
          critical: deviceAlerts.filter(a => a.severity === 'Critical').length,
          warning: deviceAlerts.filter(a => a.severity === 'Warning').length,
          advisory: deviceAlerts.filter(a => a.severity === 'Advisory').length,
        },
        overallCompliance: pHCompliant && turbidityCompliant && tdsCompliant,
      };
    });

    const totalReadings = readingsAggregation.reduce((sum, agg) => sum + agg.count, 0);
    const compliantDevices = deviceReports.filter(d => d.overallCompliance).length;
    const complianceRate = devices.length > 0 
      ? parseFloat(((compliantDevices / devices.length) * 100).toFixed(2))
      : 0;

    const summary = {
      totalDevices: devices.length,
      totalReadings,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'Critical').length,
      warningAlerts: alerts.filter(a => a.severity === 'Warning').length,
      advisoryAlerts: alerts.filter(a => a.severity === 'Advisory').length,
      compliantDevices,
      complianceRate,
    };

    report.status = 'completed';
    report.data = {
      devices: deviceReports,
      complianceGuidelines: complianceMetrics,
    };
    report.summary = summary;
    report.metadata = {
      deviceCount: devices.length,
      alertCount: alerts.length,
      readingCount: totalReadings,
      processingTime: Date.now() - startTime,
    };
    await report.save();

    return report;
  } catch (error) {
    logger.error('[Background Job] Error generating water quality report:', {
      error: error.message,
      stack: error.stack,
    });
    try {
      await Report.findOneAndUpdate(
        { reportId },
        { status: 'failed', error: error.message }
      );
    } catch (updateError) {
      logger.error('[Background Job] Error updating failed report:', {
        error: updateError.message,
      });
    }
    return null;
  }
}

/**
 * Helper function to generate device status report
 */
async function generateDeviceStatusReportJob(startDate, endDate, deviceIds, generatedBy) {
  const startTime = Date.now();
  const reportId = uuidv4();
  
  try {
    const report = new Report({
      reportId,
      type: 'device-status',
      title: `Weekly Device Status Report (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`,
      generatedBy,
      startDate,
      endDate,
      status: 'generating',
    });
    await report.save();

    const devices = await Device.find({ deviceId: { $in: deviceIds } });

    // Get reading counts
    const readingCounts = await SensorReading.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          count: { $sum: 1 },
          firstReading: { $min: '$timestamp' },
          lastReading: { $max: '$timestamp' },
        },
      },
    ]);

    // Get alert counts
    const alertCounts = await Alert.aggregate([
      {
        $match: {
          deviceId: { $in: deviceIds },
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$deviceId',
          totalAlerts: { $sum: 1 },
          criticalAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] },
          },
        },
      },
    ]);

    const deviceReports = devices.map(device => {
      const readings = readingCounts.find(r => r._id === device.deviceId);
      const alerts = alertCounts.find(a => a._id === device.deviceId);

      const periodMs = endDate.getTime() - startDate.getTime();
      const expectedReadings = periodMs / (60 * 1000);
      const actualReadings = readings?.count || 0;
      const uptimePercentage = readings 
        ? parseFloat(Math.min((actualReadings / expectedReadings) * 100, 100).toFixed(2))
        : 0;

      const healthScore = calculateHealthScore(uptimePercentage, alerts?.criticalAlerts || 0);

      return {
        deviceId: device.deviceId,
        location: device.location,
        status: device.status,
        registrationStatus: device.registrationStatus,
        lastSeen: device.lastSeen,
        metrics: {
          totalReadings: actualReadings,
          firstReading: readings?.firstReading || null,
          lastReading: readings?.lastReading || null,
          uptimePercentage,
        },
        alerts: {
          total: alerts?.totalAlerts || 0,
          critical: alerts?.criticalAlerts || 0,
        },
        healthScore,
      };
    });

    const totalReadings = readingCounts.reduce((sum, r) => sum + r.count, 0);
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const avgUptime = deviceReports.length > 0
      ? parseFloat((deviceReports.reduce((sum, d) => sum + d.metrics.uptimePercentage, 0) / deviceReports.length).toFixed(2))
      : 0;

    const summary = {
      totalDevices: devices.length,
      onlineDevices,
      offlineDevices: devices.length - onlineDevices,
      totalReadings,
      avgUptimePercentage: avgUptime,
      devicesWithCriticalAlerts: deviceReports.filter(d => d.alerts.critical > 0).length,
    };

    report.status = 'completed';
    report.data = { devices: deviceReports };
    report.summary = summary;
    report.metadata = {
      deviceCount: devices.length,
      alertCount: alertCounts.reduce((sum, a) => sum + a.totalAlerts, 0),
      readingCount: totalReadings,
      processingTime: Date.now() - startTime,
    };
    await report.save();

    return report;
  } catch (error) {
    logger.error('[Background Job] Error generating device status report:', {
      error: error.message,
      stack: error.stack,
    });
    try {
      await Report.findOneAndUpdate(
        { reportId },
        { status: 'failed', error: error.message }
      );
    } catch (updateError) {
      logger.error('[Background Job] Error updating failed report:', {
        error: updateError.message,
      });
    }
    return null;
  }
}

/**
 * Calculate device health score
 */
function calculateHealthScore(uptimePercentage, criticalAlerts) {
  let score = uptimePercentage;
  score -= criticalAlerts * 5;
  return Math.max(0, Math.min(100, parseFloat(score.toFixed(2))));
}

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
    logger.info('[OK] Weekly reports generator started (runs every Monday at 8:00 AM UTC)');
  }
  
  checkOfflineDevices.start();
  cleanupOldReadings.start();
  generateWeeklyReports.start();
}

/**
 * Stop all background jobs
 */
function stopBackgroundJobs() {
  logger.info('[JOBS] Stopping background jobs...');
  
  checkOfflineDevices.stop();
  cleanupOldReadings.stop();
  generateWeeklyReports.stop();
  
  logger.info('[OK] All background jobs stopped');
}

module.exports = {
  startBackgroundJobs,
  stopBackgroundJobs,
  checkOfflineDevices,
  cleanupOldReadings,
  generateWeeklyReports,
};
