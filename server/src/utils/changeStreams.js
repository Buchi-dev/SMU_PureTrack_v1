/**
 * MongoDB Change Streams Manager
 * 
 * Watches MongoDB collections for real-time changes and broadcasts
 * updates to connected clients via Socket.IO
 * 
 * Supports:
 * - Alert creation and updates
 * - Device status changes
 * - New sensor readings
 * - User updates
 * 
 * @module utils/changeStreams
 */

const Alert = require('../alerts/alert.Model');
const { Device, SensorReading } = require('../devices/device.Model');
const User = require('../users/user.Model');
const logger = require('./logger');
const { SENSOR_THRESHOLDS } = require('./constants');

// Store change stream references
let alertChangeStream;
let deviceChangeStream;
let readingChangeStream;
let userChangeStream;

/**
 * Initialize all MongoDB Change Streams
 * 
 * Prerequisites:
 * - MongoDB must be running as a replica set
 * - Socket.IO must be initialized (global.io)
 * 
 * @returns {Promise<void>}
 */
async function initializeChangeStreams() {
  if (!global.io) {
    logger.error('[Change Streams] Socket.IO not initialized. Cannot start change streams.');
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  try {
    // ========================================
    // ALERT CHANGE STREAM
    // ========================================
    alertChangeStream = Alert.watch([
      {
        $match: {
          operationType: { $in: ['insert', 'update'] }
        }
      }
    ], {
      fullDocument: 'updateLookup' // Get full document for updates
    });

    alertChangeStream.on('change', async (change) => {
      try {
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (!isProduction) {
          logger.info('[Change Streams] Alert change detected:', {
            operation: change.operationType,
            alertId: change.documentKey?._id,
          });
        }

        if (change.operationType === 'insert') {
          // New alert created
          const newAlert = change.fullDocument;
          
          // Broadcast to all clients subscribed to alerts
          global.io.to('alerts').emit('alert:new', {
            alert: newAlert,
            timestamp: new Date(),
          });

          // Broadcast to specific device room if subscribed
          if (newAlert.deviceId) {
            global.io.to(`device:${newAlert.deviceId}`).emit('alert:new', {
              alert: newAlert,
              timestamp: new Date(),
            });
          }

          if (!isProduction) {
            logger.info('[Change Streams] Broadcast new alert:', {
              alertId: newAlert._id,
              severity: newAlert.severity,
              deviceId: newAlert.deviceId,
            });
          }

        } else if (change.operationType === 'update') {
          // Alert updated (acknowledged, resolved, etc.)
          const updatedAlert = change.fullDocument;
          const updatedFields = change.updateDescription?.updatedFields || {};

          global.io.to('alerts').emit('alert:updated', {
            alertId: change.documentKey._id,
            updates: updatedFields,
            fullDocument: updatedAlert,
            timestamp: new Date(),
          });

          if (!isProduction) {
            logger.info('[Change Streams] Broadcast alert update:', {
              alertId: change.documentKey._id,
              updates: Object.keys(updatedFields),
            });
          }
        }
      } catch (error) {
        logger.error('[Change Streams] Error processing alert change:', {
          error: error.message,
          change,
        });
      }
    });

    alertChangeStream.on('error', (error) => {
      logger.error('[Change Streams] Alert change stream error:', error);
    });

    // ========================================
    // DEVICE CHANGE STREAM
    // ========================================
    deviceChangeStream = Device.watch([
      {
        $match: {
          operationType: { $in: ['insert', 'update'] }
        }
      }
    ], {
      fullDocument: 'updateLookup'
    });

    deviceChangeStream.on('change', async (change) => {
      try {
        const isProduction = process.env.NODE_ENV === 'production';
        
        if (!isProduction) {
          logger.info('[Change Streams] Device change detected:', {
            operation: change.operationType,
            deviceId: change.documentKey?._id,
          });
        }

        const device = change.fullDocument;

        if (change.operationType === 'insert') {
          // New device registered
          global.io.to('devices').emit('device:new', {
            device,
            timestamp: new Date(),
          });

          if (!isProduction) {
            logger.info('[Change Streams] Broadcast new device:', {
              deviceId: device.deviceId,
              name: device.deviceName,
            });
          }

        } else if (change.operationType === 'update') {
          // Device updated (status, location, etc.)
          const updatedFields = change.updateDescription?.updatedFields || {};

          // Broadcast to devices room
          global.io.to('devices').emit('device:updated', {
            deviceId: device.deviceId,
            updates: updatedFields,
            fullDocument: device,
            timestamp: new Date(),
          });

          // Broadcast to specific device room
          global.io.to(`device:${device.deviceId}`).emit('device:updated', {
            updates: updatedFields,
            fullDocument: device,
            timestamp: new Date(),
          });

          if (!isProduction) {
            logger.info('[Change Streams] Broadcast device update:', {
              deviceId: device.deviceId,
              updates: Object.keys(updatedFields),
            });
          }
        }
      } catch (error) {
        logger.error('[Change Streams] Error processing device change:', {
          error: error.message,
          change,
        });
      }
    });

    deviceChangeStream.on('error', (error) => {
      logger.error('[Change Streams] Device change stream error:', error);
    });

    // ========================================
    // SENSOR READING CHANGE STREAM
    // ========================================
    readingChangeStream = SensorReading.watch([
      {
        $match: {
          operationType: 'insert' // Only new readings
        }
      }
    ], {
      fullDocument: 'updateLookup'
    });

    readingChangeStream.on('change', async (change) => {
      try {
        if (change.operationType === 'insert') {
          const reading = change.fullDocument;

          // Broadcast to all clients subscribed to devices
          global.io.to('devices').emit('reading:new', {
            reading,
            timestamp: new Date(),
          });

          // Broadcast to specific device room
          if (reading.deviceId) {
            global.io.to(`device:${reading.deviceId}`).emit('reading:new', {
              reading,
              timestamp: new Date(),
            });
          }

          // Check for anomalies and broadcast warnings
          const hasAnomalies = checkForAnomalies(reading);
          if (hasAnomalies.length > 0) {
            global.io.to('devices').emit('reading:anomaly', {
              deviceId: reading.deviceId,
              anomalies: hasAnomalies,
              reading,
              timestamp: new Date(),
            });
          }

          logger.debug('[Change Streams] Broadcast new reading:', {
            deviceId: reading.deviceId,
            parameters: Object.keys(reading).filter(k => 
              ['pH', 'turbidity', 'tds', 'temperature'].includes(k)
            ),
          });
        }
      } catch (error) {
        logger.error('[Change Streams] Error processing reading change:', {
          error: error.message,
          change,
        });
      }
    });

    readingChangeStream.on('error', (error) => {
      logger.error('[Change Streams] Reading change stream error:', error);
    });

    // ========================================
    // USER CHANGE STREAM (Optional)
    // ========================================
    userChangeStream = User.watch([
      {
        $match: {
          operationType: { $in: ['insert', 'update'] }
        }
      }
    ], {
      fullDocument: 'updateLookup'
    });

    userChangeStream.on('change', async (change) => {
      try {
        if (change.operationType === 'update') {
          const user = change.fullDocument;
          const updatedFields = change.updateDescription?.updatedFields || {};

          // Only broadcast if role or status changed (important updates)
          if (updatedFields.role || updatedFields.status) {
            global.io.to('admin').emit('user:updated', {
              userId: user.uid,
              updates: updatedFields,
              timestamp: new Date(),
            });

            const isProduction = process.env.NODE_ENV === 'production';
            if (!isProduction) {
              logger.info('[Change Streams] Broadcast user update:', {
                userId: user.uid,
                updates: Object.keys(updatedFields),
              });
            }
          }
        }
      } catch (error) {
        logger.error('[Change Streams] Error processing user change:', {
          error: error.message,
          change,
        });
      }
    });

    userChangeStream.on('error', (error) => {
      logger.error('[Change Streams] User change stream error:', error);
    });

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      logger.info('[Change Streams] Real-time monitoring active ✓');
    } else {
      logger.info('[Change Streams] All change streams initialized successfully');
    }

  } catch (error) {
    logger.error('[Change Streams] Failed to initialize change streams:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Check sensor reading for anomalies based on thresholds
 * 
 * @param {Object} reading - Sensor reading document
 * @returns {Array} Array of anomaly objects
 */
function checkForAnomalies(reading) {
  const anomalies = [];

  // pH anomalies
  if (reading.pH !== undefined) {
    if (reading.pH < SENSOR_THRESHOLDS.pH.critical.min || 
        reading.pH > SENSOR_THRESHOLDS.pH.critical.max) {
      anomalies.push({
        parameter: 'pH',
        value: reading.pH,
        severity: 'Critical',
        threshold: SENSOR_THRESHOLDS.pH.critical,
      });
    } else if (reading.pH < SENSOR_THRESHOLDS.pH.warning.min || 
               reading.pH > SENSOR_THRESHOLDS.pH.warning.max) {
      anomalies.push({
        parameter: 'pH',
        value: reading.pH,
        severity: 'Warning',
        threshold: SENSOR_THRESHOLDS.pH.warning,
      });
    }
  }

  // Turbidity anomalies
  if (reading.turbidity !== undefined) {
    if (reading.turbidity > SENSOR_THRESHOLDS.turbidity.critical.max) {
      anomalies.push({
        parameter: 'turbidity',
        value: reading.turbidity,
        severity: 'Critical',
        threshold: SENSOR_THRESHOLDS.turbidity.critical,
      });
    } else if (reading.turbidity > SENSOR_THRESHOLDS.turbidity.warning.max) {
      anomalies.push({
        parameter: 'turbidity',
        value: reading.turbidity,
        severity: 'Warning',
        threshold: SENSOR_THRESHOLDS.turbidity.warning,
      });
    }
  }

  // TDS anomalies
  if (reading.tds !== undefined) {
    if (reading.tds > SENSOR_THRESHOLDS.tds.critical.max) {
      anomalies.push({
        parameter: 'tds',
        value: reading.tds,
        severity: 'Critical',
        threshold: SENSOR_THRESHOLDS.tds.critical,
      });
    } else if (reading.tds > SENSOR_THRESHOLDS.tds.warning.max) {
      anomalies.push({
        parameter: 'tds',
        value: reading.tds,
        severity: 'Warning',
        threshold: SENSOR_THRESHOLDS.tds.warning,
      });
    }
  }

  return anomalies;
}

/**
 * Close all change streams gracefully
 * Called during server shutdown
 * 
 * @returns {Promise<void>}
 */
async function closeChangeStreams() {
  logger.info('[Change Streams] Closing all change streams...');

  try {
    const closePromises = [];

    if (alertChangeStream) {
      closePromises.push(alertChangeStream.close());
    }
    if (deviceChangeStream) {
      closePromises.push(deviceChangeStream.close());
    }
    if (readingChangeStream) {
      closePromises.push(readingChangeStream.close());
    }
    if (userChangeStream) {
      closePromises.push(userChangeStream.close());
    }

    await Promise.all(closePromises);
    
    logger.info('[Change Streams] All change streams closed successfully');
  } catch (error) {
    logger.error('[Change Streams] Error closing change streams:', {
      error: error.message,
    });
  }
}

/**
 * Get status of all change streams
 * Useful for health checks
 * 
 * @returns {Object} Status object
 */
function getChangeStreamsStatus() {
  return {
    alert: alertChangeStream ? 'active' : 'inactive',
    device: deviceChangeStream ? 'active' : 'inactive',
    reading: readingChangeStream ? 'active' : 'inactive',
    user: userChangeStream ? 'active' : 'inactive',
  };
}

module.exports = {
  initializeChangeStreams,
  closeChangeStreams,
  getChangeStreamsStatus,
};
