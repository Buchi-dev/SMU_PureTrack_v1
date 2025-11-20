const { Device, SensorReading } = require('./device.Model');
const Alert = require('../alerts/alert.Model');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all devices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllDevices = async (req, res) => {
  try {
    const { status, registrationStatus, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (registrationStatus) filter.registrationStatus = registrationStatus;

    const devices = await Device.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Device.countDocuments(filter);

    // Get latest reading for each device
    const devicesWithReadings = await Promise.all(
      devices.map(async (device) => {
        const latestReading = await SensorReading.findOne({ deviceId: device.deviceId })
          .sort({ timestamp: -1 })
          .limit(1);

        return {
          ...device.toPublicProfile(),
          latestReading: latestReading || null,
        };
      })
    );

    res.json({
      success: true,
      data: devicesWithReadings,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('[Device Controller] Error fetching devices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching devices',
      error: error.message,
    });
  }
};

/**
 * Get device by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeviceById = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Get latest reading
    const latestReading = await SensorReading.findOne({ deviceId: device.deviceId })
      .sort({ timestamp: -1 })
      .limit(1);

    res.json({
      success: true,
      data: {
        ...device.toPublicProfile(),
        latestReading: latestReading || null,
      },
    });
  } catch (error) {
    console.error('[Device Controller] Error fetching device:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching device',
      error: error.message,
    });
  }
};

/**
 * Get device sensor readings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeviceReadings = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
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

    res.json({
      success: true,
      data: readings,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('[Device Controller] Error fetching device readings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching device readings',
      error: error.message,
    });
  }
};

/**
 * Update device
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateDevice = async (req, res) => {
  try {
    const { location, registrationStatus, metadata } = req.body;

    const updates = {};
    if (location !== undefined) updates.location = location;
    if (registrationStatus !== undefined) updates.registrationStatus = registrationStatus;
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    res.json({
      success: true,
      message: 'Device updated successfully',
      data: device.toPublicProfile(),
    });
  } catch (error) {
    console.error('[Device Controller] Error updating device:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating device',
      error: error.message,
    });
  }
};

/**
 * Delete device
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteDevice = async (req, res) => {
  try {
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

    res.json({
      success: true,
      message: 'Device and all associated data deleted successfully',
    });
  } catch (error) {
    console.error('[Device Controller] Error deleting device:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting device',
      error: error.message,
    });
  }
};

/**
 * Process sensor data (called by MQTT Bridge or PubSub replacement)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processSensorData = async (req, res) => {
  try {
    const { deviceId, pH, turbidity, tds, timestamp } = req.body;

    // Validate required fields
    if (!deviceId || pH === undefined || turbidity === undefined || tds === undefined || temperature === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required sensor fields',
      });
    }

    // Check if device exists, create if not (auto-registration)
    let device = await Device.findOne({ deviceId });

    if (!device) {
      console.log(`[Device Controller] Auto-registering new device: ${deviceId}`);
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
      temperature,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    await reading.save();

    // Check thresholds and create alerts if needed
    const alerts = await checkThresholdsAndCreateAlerts(device, reading);

    res.json({
      success: true,
      message: 'Sensor data processed successfully',
      data: {
        reading,
        device: device.toPublicProfile(),
        alertsCreated: alerts.length,
      },
    });
  } catch (error) {
    console.error('[Device Controller] Error processing sensor data:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing sensor data',
      error: error.message,
    });
  }
};

/**
 * Check sensor thresholds and create alerts
 * @param {Object} device - Device document
 * @param {Object} reading - Sensor reading document
 * @returns {Array} Created alerts
 */
async function checkThresholdsAndCreateAlerts(device, reading) {
  const alerts = [];

  // WHO/EPA Thresholds
  const thresholds = {
    pH: { min: 6.5, max: 8.5, critical: { min: 6.0, max: 9.0 } },
    turbidity: { warning: 5, critical: 10 },
    tds: { warning: 500, critical: 1000 },
    temperature: { min: 10, max: 30, critical: { min: 5, max: 35 } },
  };

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

  // Check temperature
  if (reading.temperature < thresholds.temperature.critical.min || reading.temperature > thresholds.temperature.critical.max) {
    alerts.push(
      await createAlert(device, 'Temperature', reading.temperature, thresholds.temperature.critical, 'Critical', reading.timestamp)
    );
  } else if (reading.temperature < thresholds.temperature.min || reading.temperature > thresholds.temperature.max) {
    alerts.push(
      await createAlert(device, 'Temperature', reading.temperature, thresholds.temperature, 'Warning', reading.timestamp)
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
      console.log(`[Device Controller] Skipping duplicate alert for ${device.deviceId} - ${parameter}`);
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
    console.log(`[Device Controller] Created ${severity} alert for ${device.deviceId} - ${parameter}: ${value}`);
    return alert;
  } catch (error) {
    console.error('[Device Controller] Error creating alert:', error);
    return null;
  }
}

/**
 * Get device statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeviceStats = async (req, res) => {
  try {
    const totalDevices = await Device.countDocuments();
    const onlineDevices = await Device.countDocuments({ status: 'online' });
    const offlineDevices = await Device.countDocuments({ status: 'offline' });
    const pendingDevices = await Device.countDocuments({ registrationStatus: 'pending' });
    const registeredDevices = await Device.countDocuments({ registrationStatus: 'registered' });

    res.json({
      success: true,
      data: {
        total: totalDevices,
        online: onlineDevices,
        offline: offlineDevices,
        pending: pendingDevices,
        registered: registeredDevices,
      },
    });
  } catch (error) {
    console.error('[Device Controller] Error fetching device stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching device statistics',
      error: error.message,
    });
  }
};

module.exports = {
  getAllDevices,
  getDeviceById,
  getDeviceReadings,
  updateDevice,
  deleteDevice,
  processSensorData,
  getDeviceStats,
};
