/**
 * Analytics Service
 * Business logic for analytics data aggregation
 */

import SensorReading from '@feature/sensorReadings/sensorReading.model';
import Alert from '@feature/alerts/alert.model';
import Device from '@feature/devices/device.model';
import { DeviceStatus } from '@feature/devices/device.types';
import { AnalyticsSummary, AnalyticsTrends, ParameterStats } from './analytics.types';

/**
 * Get analytics summary
 */
export const getAnalyticsSummary = async (
  deviceId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsSummary> => {
  const query: any = {};
  
  if (deviceId) {
    query.deviceId = deviceId;
  }
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  } else {
    // Default to last 24 hours if no date range provided
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    query.timestamp = { $gte: oneDayAgo };
  }

  // Get total readings count
  const totalReadings = await SensorReading.countDocuments(query);

  // Get active devices count
  const devicesActive = await Device.countDocuments({
    status: DeviceStatus.ONLINE,
  });

  // Get average values
  const avgData = await SensorReading.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        avgPh: { $avg: '$pH' },
        avgTurbidity: { $avg: '$turbidity' },
        avgTds: { $avg: '$tds' },
      },
    },
  ]);

  // Get recent alerts count (last 24 hours)
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  const recentAlerts = await Alert.countDocuments({
    createdAt: { $gte: oneDayAgo },
  });

  const averages = avgData[0] || {
    avgPh: 0,
    avgTurbidity: 0,
    avgTds: 0,
  };

  return {
    totalReadings,
    devicesActive,
    avgPh: Math.round(averages.avgPh * 100) / 100,
    avgTurbidity: Math.round(averages.avgTurbidity * 100) / 100,
    avgTds: Math.round(averages.avgTds * 100) / 100,
    recentAlerts,
    lastUpdated: new Date(),
  };
};

/**
 * Get analytics trends
 */
export const getAnalyticsTrends = async (
  deviceId?: string,
  startDate?: Date,
  endDate?: Date,
  interval: string = 'hour'
): Promise<AnalyticsTrends> => {
  const query: any = {};
  
  if (deviceId) {
    query.deviceId = deviceId;
  }
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  } else {
    // Default to last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    query.timestamp = { $gte: oneDayAgo };
  }

  // Determine grouping format based on interval
  let dateFormat: any;
  switch (interval) {
    case 'minute':
      dateFormat = { $dateToString: { format: '%Y-%m-%d %H:%M', date: '$timestamp' } };
      break;
    case 'hour':
      dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
      break;
    case 'day':
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
      break;
    default:
      dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
  }

  const trends = await SensorReading.aggregate([
    { $match: query },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: dateFormat,
        avgPh: { $avg: '$pH' },
        avgTurbidity: { $avg: '$turbidity' },
        avgTds: { $avg: '$tds' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    ph: trends.map((t) => ({
      timestamp: new Date(t._id),
      value: Math.round(t.avgPh * 100) / 100,
    })),
    turbidity: trends.map((t) => ({
      timestamp: new Date(t._id),
      value: Math.round(t.avgTurbidity * 100) / 100,
    })),
    tds: trends.map((t) => ({
      timestamp: new Date(t._id),
      value: Math.round(t.avgTds * 100) / 100,
    })),
  };
};

/**
 * Get parameter statistics
 */
export const getParameterStatistics = async (
  deviceId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<ParameterStats[]> => {
  const query: any = {};
  
  if (deviceId) {
    query.deviceId = deviceId;
  }
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  const stats = await SensorReading.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        minPh: { $min: '$pH' },
        maxPh: { $max: '$pH' },
        avgPh: { $avg: '$pH' },
        minTurbidity: { $min: '$turbidity' },
        maxTurbidity: { $max: '$turbidity' },
        avgTurbidity: { $avg: '$turbidity' },
        minTds: { $min: '$tds' },
        maxTds: { $max: '$tds' },
        avgTds: { $avg: '$tds' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (!stats[0]) {
    return [];
  }

  const data = stats[0];

  return [
    {
      parameter: 'ph',
      min: Math.round(data.minPh * 100) / 100,
      max: Math.round(data.maxPh * 100) / 100,
      avg: Math.round(data.avgPh * 100) / 100,
      count: data.count,
      unit: 'pH',
    },
    {
      parameter: 'turbidity',
      min: Math.round(data.minTurbidity * 100) / 100,
      max: Math.round(data.maxTurbidity * 100) / 100,
      avg: Math.round(data.avgTurbidity * 100) / 100,
      count: data.count,
      unit: 'NTU',
    },
    {
      parameter: 'tds',
      min: Math.round(data.minTds * 100) / 100,
      max: Math.round(data.maxTds * 100) / 100,
      avg: Math.round(data.avgTds * 100) / 100,
      count: data.count,
      unit: 'ppm',
    },
  ];
};

export default {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getParameterStatistics,
};
