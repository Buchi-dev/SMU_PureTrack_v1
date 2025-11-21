const { Device, SensorReading } = require('./device.Model');
const Alert = require('../alerts/alert.Model');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { SENSOR_THRESHOLDS, ALERT_SEVERITY, ALERT_DEDUP_WINDOW, HTTP_STATUS } = require('../utils/constants');
const CacheService = require('../utils/cache.service');
const { NotFoundError, ValidationError, AppError } = require('../errors');
const ResponseHelper = require('../utils/responses');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Get all devices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllDevices = asyncHandler(async (req, res) => {
  const { status, registrationStatus, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (registrationStatus) filter.registrationStatus = registrationStatus;

  // Use aggregation to fix N+1 query problem
  const devicesAggregation = await Device.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit * 1 },
    { $limit: limit * 1 },
    {
      $lookup: {
        from: 'sensorreadings',
        let: { deviceId: '$deviceId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$deviceId', '$$deviceId'] } } },
          { $sort: { timestamp: -1 } },
          { $limit: 1 },
        ],
        as: 'readings',
      },
    },
    {
      $addFields: {
        latestReading: { $arrayElemAt: ['$readings', 0] },
      },
    },
    {
      $project: {
        readings: 0, // Remove temporary array
      },
    },
  ]);

  const count = await Device.countDocuments(filter);

  ResponseHelper.paginated(res, devicesAggregation, {
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    limit: parseInt(limit),
  });
});

/**
 * Get device by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeviceById = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id);

  if (!device) {
    throw new NotFoundError('Device', req.params.id);
  }

  // Get latest reading
  const latestReading = await SensorReading.findOne({ deviceId: device.deviceId })
    .sort({ timestamp: -1 })
    .limit(1);

  ResponseHelper.success(res, {
    ...device.toPublicProfile(),
    latestReading: latestReading || null,
  });
});

/**
 * Get device sensor readings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeviceReadings = asyncHandler(async (req, res) => {
  const device = await Device.findById(req.params.id);

  if (!device) {
    throw new NotFoundError('Device', req.params.id);
  }

  const { startDate, endDate, page = 1, limit = 100 } = req.query;

  // Build filter
  const filter = { deviceId: device.deviceId };

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const readings = await SensorReading.find(filter)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ timestamp: -1 });

  const count = await SensorReading.countDocuments(filter);

  ResponseHelper.paginated(res, readings, {
    total: count,
    page: parseInt(page),
    pages: Math.ceil(count / limit),
    limit: parseInt(limit),
  });
});

/**
 * Update device
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateDevice = asyncHandler(async (req, res) => {
  const { location, registrationStatus, metadata } = req.body;

  const updates = {};
  if (location !== undefined) updates.location = location;
  if (registrationStatus !== undefined) updates.registrationStatus = registrationStatus;
  if (metadata !== undefined) updates.metadata = metadata;

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  const device = await Device.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  if (!device) {
    throw new NotFoundError('Device', req.params.id);
  }

  ResponseHelper.success(res, device.toPublicProfile(), 'Device updated successfully');
});

/**
 * Delete device
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteDevice = asyncHandler(async (req, res) => {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Delete device and all associated data
    await Promise.all([
      Device.findByIdAndDelete(req.params.id),
      SensorReading.deleteMany({ deviceId: device.deviceId }),
      Alert.deleteMany({ deviceId: device.deviceId }),
    ]);

  ResponseHelper.success(res, null, 'Device and all associated data deleted successfully');
});

/**
 * Process sensor data (called by IoT devices via HTTP POST)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processSensorData = asyncHandler(async (req, res) => {
  const { deviceId, pH, turbidity, tds, timestamp } = req.body;

  // Check if device exists, create if not (auto-registration)
  let device = await Device.findOne({ deviceId });

  if (!device) {
    logger.info('[Device Controller] Auto-registering new device', { deviceId });
    device = new Device({
      deviceId,
      status: 'online',
      registrationStatus: 'pending',
      lastSeen: new Date(),
    });
    await device.save();
  } else {
    // Update device status and last seen
    device.status = 'online';
    device.lastSeen = new Date();
    await device.save();
  }

  // Save sensor reading
  const reading = new SensorReading({
    deviceId,
    pH,
    turbidity,
    tds,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  });

  await reading.save();

  // Check thresholds and create alerts if needed
  const alerts = await checkThresholdsAndCreateAlerts(device, reading);

  ResponseHelper.success(res, {
    reading,
    device: device.toPublicProfile(),
    alertsCreated: alerts.length,
    alerts,
  }, 'Sensor data processed successfully');
});

/**
 * Check sensor thresholds and create alerts
 * @param {Object} device - Device document
 * @param {Object} reading - Sensor reading document
 * @returns {Array} Created alerts
 */
async function checkThresholdsAndCreateAlerts(device, reading) {
  const alerts = [];

  // Use centralized thresholds from constants
  const thresholds = SENSOR_THRESHOLDS;

  // Check pH
  if (reading.pH < thresholds.pH.critical.min || reading.pH > thresholds.pH.critical.max) {
    alerts.push(
      await createAlert(device, 'pH', reading.pH, thresholds.pH.critical, 'Critical', reading.timestamp)
    );
  } else if (reading.pH < thresholds.pH.min || reading.pH > thresholds.pH.max) {
    alerts.push(
      await createAlert(device, 'pH', reading.pH, thresholds.pH, 'Warning', reading.timestamp)
    );
  }

  // Check turbidity
  if (reading.turbidity > thresholds.turbidity.critical) {
    alerts.push(
      await createAlert(device, 'Turbidity', reading.turbidity, thresholds.turbidity.critical, 'Critical', reading.timestamp)
    );
  } else if (reading.turbidity > thresholds.turbidity.warning) {
    alerts.push(
      await createAlert(device, 'Turbidity', reading.turbidity, thresholds.turbidity.warning, 'Warning', reading.timestamp)
    );
  }

  // Check TDS
  if (reading.tds > thresholds.tds.critical) {
    alerts.push(
      await createAlert(device, 'TDS', reading.tds, thresholds.tds.critical, 'Critical', reading.timestamp)
    );
  } else if (reading.tds > thresholds.tds.warning) {
    alerts.push(
      await createAlert(device, 'TDS', reading.tds, thresholds.tds.warning, 'Warning', reading.timestamp)
    );
  }

  return alerts.filter(Boolean); // Remove nulls
}

/**
 * Create alert helper
 */
async function createAlert(device, parameter, value, threshold, severity, timestamp) {
  try {
    const alertId = uuidv4();
    const thresholdValue = typeof threshold === 'object' ? (threshold.max || threshold.min) : threshold;
    const message = `${parameter} level ${value > thresholdValue ? 'above' : 'below'} safe threshold`;

    // Check if similar alert already exists (within last hour, same device, same parameter, unacknowledged)
    const recentAlert = await Alert.findOne({
      deviceId: device.deviceId,
      parameter,
      status: 'Unacknowledged',
      timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });

    if (recentAlert) {
      logger.info('[Device Controller] Skipping duplicate alert', {
        deviceId: device.deviceId,
        parameter,
      });
      return null;
    }

    const alert = new Alert({
      alertId,
      deviceId: device.deviceId,
      deviceName: device.location || device.deviceId,
      severity,
      parameter,
      value,
      threshold: thresholdValue,
      message,
      timestamp,
    });

    await alert.save();
    logger.info('[Device Controller] Created alert', {
      alertId,
      severity,
      deviceId: device.deviceId,
      parameter,
      value,
    });
    return alert;
  } catch (error) {
    logger.error('[Device Controller] Error creating alert', {
      error: error.message,
      deviceId: device.deviceId,
      parameter,
    });
    return null;
  }
}

/**
 * Get device statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeviceStats = asyncHandler(async (req, res) => {
  const totalDevices = await Device.countDocuments();
  const onlineDevices = await Device.countDocuments({ status: 'online' });
  const offlineDevices = await Device.countDocuments({ status: 'offline' });
  const pendingDevices = await Device.countDocuments({ registrationStatus: 'pending' });
  const registeredDevices = await Device.countDocuments({ registrationStatus: 'registered' });

  ResponseHelper.success(res, {
    total: totalDevices,
    online: onlineDevices,
    offline: offlineDevices,
    pending: pendingDevices,
    registered: registeredDevices,
  });
});

module.exports = {
  getAllDevices,
  getDeviceById,
  getDeviceReadings,
  updateDevice,
  deleteDevice,
  processSensorData,
  getDeviceStats,
};
