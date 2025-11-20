const { SensorReading } = require('../devices/device.Model');
const Alert = require('../alerts/alert.Model');
const { Device } = require('../devices/device.Model');

/**
 * Get water quality trends over time
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getTrends = async (req, res) => {
  try {
    const { 
      deviceId, 
      parameter = 'pH', 
      startDate, 
      endDate, 
      granularity = 'hourly' 
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build filter
    const filter = {
      timestamp: { $gte: start, $lte: end },
    };
    if (deviceId) filter.deviceId = deviceId;

    // Determine grouping interval based on granularity
    let dateFormat;
    switch (granularity) {
      case 'hourly':
        dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
        break;
      case 'daily':
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
        break;
      case 'weekly':
        dateFormat = { 
          $dateToString: { 
            format: '%Y-W%V', 
            date: '$timestamp' 
          } 
        };
        break;
      case 'monthly':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
        break;
      default:
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
    }

    // Aggregate data
    const aggregation = await SensorReading.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            period: dateFormat,
            deviceId: '$deviceId',
          },
          avgValue: { $avg: `$${parameter}` },
          minValue: { $min: `$${parameter}` },
          maxValue: { $max: `$${parameter}` },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.period': 1 } },
    ]);

    // Format response
    const trends = aggregation.map(item => ({
      period: item._id.period,
      deviceId: item._id.deviceId,
      parameter,
      avg: parseFloat(item.avgValue.toFixed(2)),
      min: parseFloat(item.minValue.toFixed(2)),
      max: parseFloat(item.maxValue.toFixed(2)),
      readingCount: item.count,
    }));

    res.json({
      success: true,
      data: {
        parameter,
        granularity,
        startDate: start,
        endDate: end,
        trends,
      },
    });
  } catch (error) {
    console.error('[Analytics Controller] Error fetching trends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trends',
      error: error.message,
    });
  }
};

/**
 * Get dashboard summary statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSummary = async (req, res) => {
  try {
    // Get device counts
    const totalDevices = await Device.countDocuments();
    const onlineDevices = await Device.countDocuments({ status: 'online' });
    const offlineDevices = await Device.countDocuments({ status: 'offline' });
    const registeredDevices = await Device.countDocuments({ registrationStatus: 'registered' });
    const pendingDevices = await Device.countDocuments({ registrationStatus: 'pending' });

    // Get alert counts (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const totalAlerts = await Alert.countDocuments({ timestamp: { $gte: last24Hours } });
    const unacknowledgedAlerts = await Alert.countDocuments({ 
      status: 'Unacknowledged',
      timestamp: { $gte: last24Hours }
    });
    const criticalAlerts = await Alert.countDocuments({ 
      severity: 'Critical',
      timestamp: { $gte: last24Hours }
    });
    const warningAlerts = await Alert.countDocuments({ 
      severity: 'Warning',
      timestamp: { $gte: last24Hours }
    });

    // Get recent readings count (last hour)
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentReadings = await SensorReading.countDocuments({ 
      timestamp: { $gte: lastHour } 
    });

    // Get average water quality parameters (last 24 hours)
    const avgParameters = await SensorReading.aggregate([
      { $match: { timestamp: { $gte: last24Hours } } },
      {
        $group: {
          _id: null,
          avgPH: { $avg: '$pH' },
          avgTurbidity: { $avg: '$turbidity' },
          avgTDS: { $avg: '$tds' },
          avgTemperature: { $avg: '$temperature' },
        },
      },
    ]);

    const parameters = avgParameters.length > 0 ? {
      pH: parseFloat(avgParameters[0].avgPH.toFixed(2)),
      turbidity: parseFloat(avgParameters[0].avgTurbidity.toFixed(2)),
      tds: parseFloat(avgParameters[0].avgTDS.toFixed(2)),
      temperature: parseFloat(avgParameters[0].avgTemperature.toFixed(2)),
    } : null;

    res.json({
      success: true,
      data: {
        devices: {
          total: totalDevices,
          online: onlineDevices,
          offline: offlineDevices,
          registered: registeredDevices,
          pending: pendingDevices,
        },
        alerts: {
          last24Hours: totalAlerts,
          unacknowledged: unacknowledgedAlerts,
          critical: criticalAlerts,
          warning: warningAlerts,
        },
        readings: {
          lastHour: recentReadings,
        },
        waterQuality: parameters,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('[Analytics Controller] Error fetching summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching summary statistics',
      error: error.message,
    });
  }
};

/**
 * Get parameter-specific analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getParameterAnalytics = async (req, res) => {
  try {
    const { parameter, deviceId, startDate, endDate } = req.query;

    if (!parameter) {
      return res.status(400).json({
        success: false,
        message: 'Parameter is required (pH, turbidity, tds, temperature)',
      });
    }

    const validParameters = ['pH', 'turbidity', 'tds', 'temperature'];
    if (!validParameters.includes(parameter)) {
      return res.status(400).json({
        success: false,
        message: `Invalid parameter. Must be one of: ${validParameters.join(', ')}`,
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build filter
    const filter = {
      timestamp: { $gte: start, $lte: end },
    };
    if (deviceId) filter.deviceId = deviceId;

    // Get aggregated statistics
    const stats = await SensorReading.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avg: { $avg: `$${parameter}` },
          min: { $min: `$${parameter}` },
          max: { $max: `$${parameter}` },
          stdDev: { $stdDevPop: `$${parameter}` },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get distribution (histogram)
    const distribution = await SensorReading.aggregate([
      { $match: filter },
      {
        $bucket: {
          groupBy: `$${parameter}`,
          boundaries: calculateBucketBoundaries(parameter),
          default: 'other',
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    // Get readings exceeding thresholds
    const thresholds = getThresholds(parameter);
    const exceedingReadings = await SensorReading.countDocuments({
      ...filter,
      $or: [
        { [parameter]: { $lt: thresholds.min } },
        { [parameter]: { $gt: thresholds.max } },
      ],
    });

    const statistics = stats.length > 0 ? {
      avg: parseFloat(stats[0].avg.toFixed(2)),
      min: parseFloat(stats[0].min.toFixed(2)),
      max: parseFloat(stats[0].max.toFixed(2)),
      stdDev: parseFloat(stats[0].stdDev.toFixed(2)),
      totalReadings: stats[0].count,
      exceedingThreshold: exceedingReadings,
      complianceRate: parseFloat(((1 - exceedingReadings / stats[0].count) * 100).toFixed(2)),
    } : null;

    res.json({
      success: true,
      data: {
        parameter,
        startDate: start,
        endDate: end,
        statistics,
        distribution,
        thresholds,
      },
    });
  } catch (error) {
    console.error('[Analytics Controller] Error fetching parameter analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parameter analytics',
      error: error.message,
    });
  }
};

/**
 * Helper function to calculate bucket boundaries for histogram
 * @param {string} parameter - Parameter name
 * @returns {Array} Bucket boundaries
 */
function calculateBucketBoundaries(parameter) {
  switch (parameter) {
    case 'pH':
      return [0, 4, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10, 14];
    case 'turbidity':
      return [0, 1, 2, 3, 4, 5, 10, 20, 50, 100];
    case 'tds':
      return [0, 100, 200, 300, 400, 500, 750, 1000, 1500, 2000];
    case 'temperature':
      return [0, 10, 15, 20, 25, 30, 35, 40, 50];
    default:
      return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  }
}

/**
 * Helper function to get thresholds for parameters
 * @param {string} parameter - Parameter name
 * @returns {Object} Min and max thresholds
 */
function getThresholds(parameter) {
  switch (parameter) {
    case 'pH':
      return { min: 6.5, max: 8.5, unit: 'pH' };
    case 'turbidity':
      return { min: 0, max: 5, unit: 'NTU' };
    case 'tds':
      return { min: 0, max: 500, unit: 'ppm' };
    case 'temperature':
      return { min: 15, max: 30, unit: '°C' };
    default:
      return { min: 0, max: 100, unit: '' };
  }
}

module.exports = {
  getTrends,
  getSummary,
  getParameterAnalytics,
};
