const { Device, SensorReading } = require('./device.Model');
const Alert = require('../alerts/alert.Model');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { SENSOR_THRESHOLDS } = require('../utils/constants');
const { NotFoundError, ValidationError, AppError } = require('../errors');
const ResponseHelper = require('../utils/responses');
const asyncHandler = require('../middleware/asyncHandler');
const mqttService = require('../utils/mqtt.service');
const { checkAlertCooldown, updateAlertOccurrence } = require('../middleware/alertCooldown');

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
        let: { deviceId: { $trim: { input: { $toString: '$deviceId' } } } }, // Trim whitespace and ensure string type
        pipeline: [
          { 
            $match: { 
              $expr: { 
                $eq: [
                  { $trim: { input: { $toString: '$deviceId' } } }, // Trim sensor reading deviceId
                  '$$deviceId'
                ] 
              } 
            } 
          },
          { $sort: { timestamp: -1 } },
          { $limit: 1 },
          // Map field names for client compatibility
          {
            $project: {
              _id: 1,
              deviceId: 1,
              ph: '$pH', // Map pH to ph for client
              turbidity: 1,
              tds: 1,
              timestamp: { $toLong: '$timestamp' }, // Convert Date to timestamp (milliseconds)
              receivedAt: { $toLong: '$receivedAt' },
            },
          },
        ],
        as: 'readings',
      },
    },
    {
      $addFields: {
        id: '$_id', // Add id field mapping from _id
        latestReading: { $arrayElemAt: ['$readings', 0] },
        // Convert dates to Firebase Timestamp format for frontend compatibility
        registeredAt: {
          $cond: {
            if: { $ne: ['$createdAt', null] },
            then: {
              seconds: { $toLong: { $divide: [{ $toLong: '$createdAt' }, 1000] } },
              nanoseconds: { $multiply: [{ $mod: [{ $toLong: '$createdAt' }, 1000] }, 1000000] }
            },
            else: null
          }
        },
        lastSeen: {
          $cond: {
            if: { $ne: ['$lastSeen', null] },
            then: {
              seconds: { $toLong: { $divide: [{ $toLong: '$lastSeen' }, 1000] } },
              nanoseconds: { $multiply: [{ $mod: [{ $toLong: '$lastSeen' }, 1000] }, 1000000] }
            },
            else: null
          }
        }
      },
    },
    {
      $project: {
        readings: 0, // Remove temporary array
      },
    },
  ]);

  const count = await Device.countDocuments(filter);

  const responseData = {
    data: devicesAggregation,
    pagination: {
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      limit: parseInt(limit),
    },
  };

  ResponseHelper.paginated(res, devicesAggregation, responseData.pagination);
});

/**
 * Get device by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeviceById = asyncHandler(async (req, res) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId });

  if (!device) {
    throw new NotFoundError('Device', req.params.deviceId);
  }

  // Get latest reading
  const latestReading = await SensorReading.findOne({ deviceId: device.deviceId })
    .sort({ timestamp: -1 })
    .limit(1);

  // Map pH to ph for client compatibility
  const mappedReading = latestReading ? {
    deviceId: latestReading.deviceId,
    ph: latestReading.pH,
    turbidity: latestReading.turbidity,
    tds: latestReading.tds,
    timestamp: latestReading.timestamp.getTime(),
    receivedAt: latestReading.receivedAt.getTime(),
  } : null;

  const responseData = {
    ...device.toPublicProfile(),
    latestReading: mappedReading,
  };

  ResponseHelper.success(res, responseData);
});

/**
 * Get device sensor readings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeviceReadings = asyncHandler(async (req, res) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId });

  if (!device) {
    throw new NotFoundError('Device', req.params.deviceId);
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

  // Map pH to ph for client compatibility
  const mappedReadings = readings.map(reading => ({
    deviceId: reading.deviceId,
    ph: reading.pH,
    turbidity: reading.turbidity,
    tds: reading.tds,
    timestamp: reading.timestamp.getTime(),
    receivedAt: reading.receivedAt.getTime(),
  }));

  ResponseHelper.paginated(res, mappedReadings, {
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
  
  // Handle metadata updates - merge with existing metadata
  if (metadata !== undefined) {
    // Get the current device to merge metadata
    const currentDevice = await Device.findOne({ deviceId: req.params.deviceId });
    if (!currentDevice) {
      throw new NotFoundError('Device', req.params.deviceId);
    }
    
    // Merge metadata - preserve existing fields and update/add new ones
    updates.metadata = {
      ...currentDevice.metadata?.toObject?.() || currentDevice.metadata || {},
      ...metadata,
    };
    
    // Handle nested metadata.location separately to merge it properly
    if (metadata.location) {
      updates.metadata.location = {
        ...currentDevice.metadata?.location || {},
        ...metadata.location,
      };
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  const device = await Device.findOneAndUpdate(
    { deviceId: req.params.deviceId },
    updates,
    { new: true, runValidators: true }
  );

  if (!device) {
    throw new NotFoundError('Device', req.params.deviceId);
  }

  ResponseHelper.success(res, device.toPublicProfile(), 'Device updated successfully');
});

/**
 * Delete device
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteDevice = asyncHandler(async (req, res) => {
    const device = await Device.findOne({ deviceId: req.params.deviceId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Send deregister command to device via MQTT
    // Commands use retain=true, so device receives them when it connects/reconnects
    if (mqttService && mqttService.sendCommandToDevice) {
      logger.info('[Device Controller] Publishing deregister command', {
        deviceId: device.deviceId,
      });
      
      const commandSent = mqttService.sendCommandToDevice(device.deviceId, 'deregister');
      
      if (commandSent) {
        logger.info('[Device Controller] "deregister" command published (retained)', {
          deviceId: device.deviceId,
        });
        // Give device a moment to receive the command if online
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        logger.warn('[Device Controller] Failed to publish "deregister" command', {
          deviceId: device.deviceId,
        });
      }
    } else {
      logger.error('[Device Controller] MQTT service not available', {
        deviceId: device.deviceId,
      });
    }

    // Delete device and all associated data
    await Promise.all([
      Device.findOneAndDelete({ deviceId: req.params.deviceId }),
      SensorReading.deleteMany({ deviceId: device.deviceId }),
      Alert.deleteMany({ deviceId: device.deviceId }),
    ]);

    logger.info('[Device Controller] Device and associated data deleted', {
      deviceId: device.deviceId,
      deviceMongoId: req.params.id,
    });

  ResponseHelper.success(res, null, 'Device and all associated data deleted successfully');
});

/**
 * Process sensor data (called by IoT devices via HTTP POST)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processSensorData = asyncHandler(async (req, res) => {
  const { 
    deviceId, 
    pH, 
    turbidity, 
    tds, 
    timestamp,
    // Optional device metadata for auto-registration
    name,
    type,
    firmwareVersion,
    macAddress,
    ipAddress,
    sensors
  } = req.body;

  // Trim deviceId to prevent whitespace issues
  const trimmedDeviceId = deviceId?.trim();
  
  if (!trimmedDeviceId) {
    throw new ValidationError('deviceId is required');
  }

  // Check if device exists
  let device = await Device.findOne({ deviceId: trimmedDeviceId });

  if (!device) {
    // Device doesn't exist - reject the sensor data
    logger.warn('[Device Controller] Unregistered device attempted to send sensor data', { 
      deviceId: trimmedDeviceId 
    });
    
    return ResponseHelper.error(res, 
      'Device not registered. Please register your device first.', 
      403,
      'DEVICE_NOT_REGISTERED'
    );
  }

  // Check if device is registered (isRegistered must be true)
  if (!device.isRegistered) {
    logger.warn('[Device Controller] Device not approved, rejecting sensor data', {
      deviceId: trimmedDeviceId,
      registrationStatus: device.registrationStatus,
      isRegistered: device.isRegistered,
    });
    
    return ResponseHelper.error(res, 
      'Device registration pending admin approval. Sensor data not accepted.', 
      403,
      'DEVICE_NOT_APPROVED'
    );
  }

  // Device is registered - accept sensor data
  // Update device status and last seen
  device.status = 'online';
  device.lastSeen = new Date();
  
  // Update metadata if provided
  if (firmwareVersion) device.firmwareVersion = firmwareVersion;
  if (ipAddress) device.ipAddress = ipAddress;
  
  await device.save();

  // Save sensor reading with trimmed deviceId
  // Validate timestamp from device
  let validTimestamp = new Date(); // Default to server time
  
  if (timestamp) {
    // Handle Unix timestamp (seconds) or ISO string
    const parsedDate = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) // Unix timestamp in seconds
      : new Date(timestamp);
    
    // Validate: timestamp should be after 2020 and not in future
    const year2020 = new Date('2020-01-01').getTime();
    const futureLimit = Date.now() + (24 * 60 * 60 * 1000); // Allow 1 day ahead for timezone differences
    
    if (!isNaN(parsedDate.getTime()) && 
        parsedDate.getTime() > year2020 && 
        parsedDate.getTime() < futureLimit) {
      validTimestamp = parsedDate;
    } else {
      logger.warn('[Device Controller] Invalid device timestamp, using server time', {
        deviceId: trimmedDeviceId,
        receivedTimestamp: timestamp,
        parsedDate: parsedDate.toISOString(),
        usingServerTime: validTimestamp.toISOString()
      });
    }
  }
  
  const reading = new SensorReading({
    deviceId: trimmedDeviceId,
    pH,
    turbidity,
    tds,
    timestamp: validTimestamp,
  });

  await reading.save();
  
  logger.debug('[Device Controller] Sensor reading saved', {
    deviceId: trimmedDeviceId,
    readingId: reading._id,
    pH,
    turbidity,
    tds,
  });

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
 * Create alert helper with cooldown logic
 */
async function createAlert(device, parameter, value, threshold, severity, timestamp) {
  try {
    const thresholdValue = typeof threshold === 'object' ? (threshold.max || threshold.min) : threshold;

    // ✅ Check cooldown before creating alert
    const cooldownCheck = await checkAlertCooldown(device.deviceId, parameter, severity);

    if (!cooldownCheck.canCreateAlert) {
      // Update existing alert occurrence count instead of creating new alert
      const updatedAlert = await updateAlertOccurrence(cooldownCheck.activeAlert, value, timestamp);

      logger.info('[Device Controller] Updated existing alert occurrence', {
        deviceId: device.deviceId,
        parameter,
        alertId: updatedAlert.alertId,
        occurrenceCount: updatedAlert.occurrenceCount,
        minutesRemaining: cooldownCheck.minutesRemaining,
      });

      return updatedAlert; // Return existing alert (updated)
    }

    // ✅ Create new alert if no cooldown active
    const alertId = uuidv4();
    const message = `${parameter} level ${value > thresholdValue ? 'above' : 'below'} safe threshold`;

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
      occurrenceCount: 1,
      firstOccurrence: timestamp,
      lastOccurrence: timestamp,
      currentValue: value,
    });

    await alert.save();

    logger.info('[Device Controller] Created new alert', {
      alertId,
      severity,
      deviceId: device.deviceId,
      parameter,
      value,
    });

    return alert;
  } catch (error) {
    logger.error('[Device Controller] Error creating/updating alert', {
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

/**
 * Device registration - for unregistered devices to send their info
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deviceRegister = asyncHandler(async (req, res) => {
  const {
    deviceId,
    name,
    type,
    firmwareVersion,
    macAddress,
    ipAddress,
    sensors,
  } = req.body;

  // Trim deviceId to prevent whitespace issues
  const trimmedDeviceId = deviceId?.trim();
  
  if (!trimmedDeviceId) {
    throw new ValidationError('deviceId is required');
  }

  // Check if device already exists
  let device = await Device.findOne({ deviceId: trimmedDeviceId });

  if (!device) {
    // Create new device in pending state
    logger.info('[Device Controller] New device registration request', { deviceId: trimmedDeviceId });
    
    device = new Device({
      deviceId: trimmedDeviceId,
      name: name || `Device-${trimmedDeviceId}`,
      type: type || 'water-quality-sensor',
      firmwareVersion: firmwareVersion || 'unknown',
      macAddress: macAddress || '',
      ipAddress: ipAddress || '',
      sensors: sensors || ['pH', 'turbidity', 'tds'],
      status: 'online', // Device is online (it just registered via MQTT)
      registrationStatus: 'pending',
      isRegistered: false,
      lastSeen: new Date(),
    });
    
    await device.save();
    
    logger.info('[Device Controller] Device registration pending', { 
      deviceId: trimmedDeviceId,
      id: device._id 
    });

    // Send "wait" command to device via MQTT
    // Commands use retain=true, so device receives them when it connects/reconnects
    if (mqttService && mqttService.sendCommandToDevice) {
      const commandSent = mqttService.sendCommandToDevice(trimmedDeviceId, 'wait');
      
      if (commandSent) {
        logger.info('[Device Controller] "wait" command published (retained)', {
          deviceId: trimmedDeviceId,
        });
      } else {
        logger.warn('[Device Controller] Failed to publish "wait" command', {
          deviceId: trimmedDeviceId,
        });
      }
    } else {
      logger.error('[Device Controller] MQTT service not available', {
        deviceId: trimmedDeviceId,
      });
    }

    return ResponseHelper.success(res, {
      device: device.toPublicProfile(),
      message: 'Device registration pending admin approval',
      status: 'pending',
      isRegistered: false,
    }, 'Device registration request received');
  } else {
    // Device exists - update last seen, status, and metadata
    device.status = 'online'; // Device is online (it just re-registered via MQTT)
    device.lastSeen = new Date();
    
    // Update metadata if provided
    if (firmwareVersion) device.firmwareVersion = firmwareVersion;
    if (ipAddress) device.ipAddress = ipAddress;
    if (name && !device.name) device.name = name;
    
    await device.save();

    // NOTE: Do NOT call setupDeviceLWT here - it publishes a retained "online" message
    // which would persist on the broker even if device goes offline.
    // Only sensor data submission should publish presence messages.

    // Check registration status
    if (device.isRegistered) {
      // Device already has approval stored in EEPROM
      // No need to send "go" command on every registration request
      logger.info('[Device Controller] Device already registered - approval stored in device EEPROM', {
        deviceId: trimmedDeviceId,
      });

      return ResponseHelper.success(res, {
        device: device.toPublicProfile(),
        message: 'Device is registered and approved',
        status: 'registered',
        isRegistered: true,
        command: 'go', // Tell device it can start sending sensor data
      }, 'Device registration approved');
    } else {
      // Send "wait" command to device via MQTT
      // Commands use retain=true, so device receives them when it connects/reconnects
      if (mqttService && mqttService.sendCommandToDevice) {
        const commandSent = mqttService.sendCommandToDevice(trimmedDeviceId, 'wait');
        
        if (commandSent) {
          logger.info('[Device Controller] "wait" command published (retained)', {
            deviceId: trimmedDeviceId,
          });
        } else {
          logger.warn('[Device Controller] Failed to publish "wait" command', {
            deviceId: trimmedDeviceId,
          });
        }
      } else {
        logger.error('[Device Controller] MQTT service not available', {
          deviceId: trimmedDeviceId,
        });
      }

      return ResponseHelper.success(res, {
        device: device.toPublicProfile(),
        message: 'Device registration pending admin approval',
        status: 'pending',
        isRegistered: false,
      }, 'Device registration pending');
    }
  }
});

/**
 * Approve device registration (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const approveDeviceRegistration = asyncHandler(async (req, res) => {
  const { location, metadata } = req.body;

  const device = await Device.findOne({ deviceId: req.params.deviceId });

  if (!device) {
    throw new NotFoundError('Device', req.params.deviceId);
  }

  // Update device registration status
  device.isRegistered = true;
  device.registrationStatus = 'registered';
  
  if (location !== undefined) {
    device.location = location;
  }
  
  if (metadata !== undefined) {
    device.metadata = {
      ...device.metadata?.toObject?.() || device.metadata || {},
      ...metadata,
    };
    
    if (metadata.location) {
      device.metadata.location = {
        ...device.metadata?.location || {},
        ...metadata.location,
      };
    }
  }

  await device.save();

  logger.info('[Device Controller] Device registration approved', {
    deviceId: device.deviceId,
    id: device._id,
  });

  // Send "go" command to device via MQTT
  // Commands use retain=true, so device receives them when it connects/reconnects
  if (mqttService && mqttService.sendCommandToDevice) {
    const commandSent = mqttService.sendCommandToDevice(device.deviceId, 'go');
    
    if (commandSent) {
      logger.info('[Device Controller] "go" command published (retained)', {
        deviceId: device.deviceId,
      });
    } else {
      logger.warn('[Device Controller] Failed to publish "go" command', {
        deviceId: device.deviceId,
      });
    }
  } else {
    logger.error('[Device Controller] MQTT service not available', {
      deviceId: device.deviceId,
    });
  }

  ResponseHelper.success(res, device.toPublicProfile(), 'Device registration approved successfully');
});

/**
 * Device SSE connection endpoint
 * Allows devices to establish SSE connection to receive commands
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * Get device status for MQTT polling (replaces SSE)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDeviceStatus = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const trimmedDeviceId = deviceId?.trim();

  if (!trimmedDeviceId) {
    throw new ValidationError('deviceId is required');
  }

  // Check if device exists
  const device = await Device.findOne({ deviceId: trimmedDeviceId });

  if (!device) {
    return ResponseHelper.error(res,
      'Device not found. Please register first.',
      404,
      'DEVICE_NOT_FOUND'
    );
  }

  // Helper function to convert Date to Firebase Timestamp-like object
  const toTimestamp = (date) => {
    if (!date) return null;
    const timestamp = date instanceof Date ? date : new Date(date);
    return {
      seconds: Math.floor(timestamp.getTime() / 1000),
      nanoseconds: (timestamp.getTime() % 1000) * 1000000,
    };
  };

  // Return device status for MQTT polling
  const status = {
    deviceId: trimmedDeviceId,
    isRegistered: device.isRegistered,
    isApproved: device.isRegistered, // Same as isRegistered for backward compatibility
    status: device.status,
    registrationStatus: device.registrationStatus,
    registeredAt: toTimestamp(device.createdAt),
    lastSeen: toTimestamp(device.lastSeen),
    command: device.isRegistered ? 'go' : 'wait',
    message: device.isRegistered
      ? 'Device is registered. You can send sensor data via MQTT.'
      : 'Device registration pending approval. Please wait.',
  };

  logger.debug('[Device Controller] Device status requested', {
    deviceId: trimmedDeviceId,
    status: status.status,
    isRegistered: status.isRegistered,
  });

  ResponseHelper.success(res, status, 'Device status retrieved');
});

/**
 * Send command to device via MQTT
 * @route POST /api/v1/devices/:deviceId/commands
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendDeviceCommand = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const { command, data = {} } = req.body;

  // Validate command
  const validCommands = ['send_now', 'restart', 'go', 'wait', 'deregister'];
  if (!command || !validCommands.includes(command)) {
    throw new ValidationError(`Invalid command. Must be one of: ${validCommands.join(', ')}`);
  }

  // Check if device exists
  const device = await Device.findOne({ deviceId });
  if (!device) {
    throw new NotFoundError('Device', deviceId);
  }

  // Log command request
  logger.info('[Device Controller] Sending command to device', {
    deviceId,
    command,
    deviceName: device.name,
    deviceStatus: device.status,
    requestedBy: req.user?.email || 'unknown',
  });

  // Send command via MQTT
  try {
    const commandSent = mqttService.sendCommandToDevice(deviceId, command, data);
    
    if (!commandSent) {
      throw new AppError('Failed to send command - MQTT service unavailable', 503);
    }

    // Update device status based on command
    if (command === 'deregister') {
      device.registrationStatus = 'pending';
      device.isRegistered = false;
      await device.save();
      
      logger.info('[Device Controller] Device deregistered', {
        deviceId,
        command,
      });
    }

    ResponseHelper.success(res, {
      deviceId,
      command,
      status: 'sent',
      timestamp: new Date().toISOString(),
      deviceStatus: device.status,
    }, `Command '${command}' sent to device successfully`);

  } catch (error) {
    logger.error('[Device Controller] Failed to send command', {
      deviceId,
      command,
      error: error.message,
    });
    throw new AppError(`Failed to send command: ${error.message}`, 500);
  }
});

module.exports = {
  getAllDevices,
  getDeviceById,
  getDeviceReadings,
  updateDevice,
  deleteDevice,
  processSensorData,
  getDeviceStats,
  deviceRegister,
  approveDeviceRegistration,
  deviceSSEConnection: getDeviceStatus,
  sendDeviceCommand,
};
