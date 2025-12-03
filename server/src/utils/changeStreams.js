/**
 * MongoDB Change Streams Manager
 * 
 * Watches MongoDB collections for real-time changes and broadcasts
 * updates to connected clients via SSE (Server-Sent Events)
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
const { queueAlertEmail } = require('./email.queue');
const mqttService = require('./mqtt.service');

// Store change stream references
let alertChangeStream;
let deviceChangeStream;
let readingChangeStream;
let userChangeStream;

// Initialization guard to prevent duplicate initialization
let changeStreamsInitialized = false;

// Deduplication tracking for change events (Solution 1)
const processedDeviceChanges = new Map();
const processedAlertChanges = new Map();
const DEDUPE_WINDOW_MS = 1000; // 1 second window for deduplication

/**
 * Initialize all MongoDB Change Streams
 * 
 * Prerequisites:
 * - MongoDB must be running as a replica set
 * - SSE must be configured
 * 
 * @returns {Promise<void>}
 */
async function initializeChangeStreams() {
  // Solution 2: Initialization guard to prevent duplicate initialization
  if (changeStreamsInitialized) {
    logger.warn('[Change Streams] Already initialized - skipping duplicate initialization');
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  try {
    changeStreamsInitialized = true;
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
        // Solution 1: Deduplication check for alert changes
        const alertObjectId = change.documentKey?._id.toString();
        const changeKey = `${alertObjectId}-${change.operationType}`;
        const lastProcessed = processedAlertChanges.get(changeKey);
        const now = Date.now();
        
        if (lastProcessed && (now - lastProcessed) < DEDUPE_WINDOW_MS) {
          logger.debug('[Change Streams] Ignoring duplicate alert change', {
            alertId: alertObjectId,
            timeSinceLastProcess: `${now - lastProcessed}ms`,
            operation: change.operationType
          });
          return; // Skip duplicate
        }
        
        // Mark as processed
        processedAlertChanges.set(changeKey, now);
        
        // Clean up old entries (keep last 100)
        if (processedAlertChanges.size > 100) {
          const entries = Array.from(processedAlertChanges.entries());
          entries.sort((a, b) => a[1] - b[1]);
          entries.slice(0, entries.length - 100).forEach(([key]) => {
            processedAlertChanges.delete(key);
          });
        }

        const verboseMode = process.env.VERBOSE_LOGGING === 'true';
        
        if (verboseMode) {
          logger.info('[Change Streams] Alert change detected:', {
            operation: change.operationType,
            alertId: change.documentKey?._id,
          });
        }

        if (change.operationType === 'insert') {
          // New alert created
          const newAlert = change.fullDocument;

          logger.info('[Change Streams] New alert detected:', {
            alertId: newAlert.alertId,
            deviceId: newAlert.deviceId,
            severity: newAlert.severity,
            parameter: newAlert.parameter,
            value: newAlert.value,
            occurrenceCount: newAlert.occurrenceCount,
            message: newAlert.message,
            timestamp: newAlert.timestamp,
          });

          // ✅ Only send emails for truly new alerts (first occurrence)
          // Skip email notifications for alert occurrence updates
          if (newAlert.occurrenceCount > 1) {
            logger.info('[Change Streams] Skipping email for alert occurrence update', {
              alertId: newAlert.alertId,
              occurrenceCount: newAlert.occurrenceCount,
            });
            return; // Don't send emails for occurrence updates
          }

          // Publish to MQTT topic for real-time client updates
          // mqttService.publish(MQTT_CONFIG.TOPICS.ALERTS_NEW, {
          //   alert: newAlert,
          // });

          // Publish to device-specific topic if available
          if (newAlert.deviceId) {
            // mqttService.publish(`devices/${newAlert.deviceId}/alerts`, {
            //   alert: newAlert,
            // });
          }

          // Send email notifications to subscribed users
          try {
            logger.info('[Change Streams] Querying for email subscribers:', {
              severity: newAlert.severity,
              alertId: newAlert.alertId,
            });

            const subscribedUsers = await User.find({
              'notificationPreferences.emailNotifications': true,
              'notificationPreferences.alertSeverities': { $in: [newAlert.severity] },
              status: 'active',
              role: { $in: ['admin', 'staff'] }
            });

            logger.info('[Change Streams] Found subscribed users:', {
              count: subscribedUsers.length,
              alertId: newAlert.alertId,
              severity: newAlert.severity,
              users: subscribedUsers.map(u => ({
                id: u._id,
                email: u.email,
                role: u.role,
                preferences: u.notificationPreferences,
              })),
            });

            if (subscribedUsers.length > 0) {
              logger.info(`Sending alert emails to ${subscribedUsers.length} subscribed users`, {
                alertId: newAlert.alertId,
                severity: newAlert.severity,
              });

              for (const user of subscribedUsers) {
                try {
                  logger.info('[Change Streams] Queueing email for user:', {
                    userId: user._id,
                    userEmail: user.email,
                    alertId: newAlert.alertId,
                    severity: newAlert.severity,
                  });
                  await queueAlertEmail(user, newAlert);
                  logger.info('[Change Streams] Email queued successfully:', {
                    userEmail: user.email,
                    alertId: newAlert.alertId,
                  });
                } catch (emailError) {
                  logger.error(`Failed to queue alert email for ${user.email}:`, {
                    error: emailError.message,
                    alertId: newAlert.alertId,
                    userId: user._id,
                    stack: emailError.stack,
                  });
                }
              }
            } else {
              logger.debug('No users subscribed to alert email notifications');
            }
          } catch (emailError) {
            logger.error('Error sending alert email notifications:', {
              error: emailError.message,
              alertId: newAlert.alertId,
            });
          }

          if (verboseMode) {
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

          // Publish alert update to MQTT
          // mqttService.publish(MQTT_CONFIG.TOPICS.ALERTS_UPDATED, {
          //   alertId: change.documentKey._id,
          //   updates: updatedFields,
          //   fullDocument: updatedAlert,
          // });

          if (verboseMode) {
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
    // Solution 3: Optimized change stream filtering at database level
    deviceChangeStream = Device.watch([
      {
        $match: {
          operationType: { $in: ['insert', 'update'] },
          // Only trigger for significant field changes or inserts
          $or: [
            { operationType: 'insert' },
            { 'updateDescription.updatedFields.status': { $exists: true } },
            { 'updateDescription.updatedFields.deviceName': { $exists: true } },
            { 'updateDescription.updatedFields.location': { $exists: true } },
            { 'updateDescription.updatedFields.isApproved': { $exists: true } },
            { 'updateDescription.updatedFields.isRegistered': { $exists: true } },
          ]
        }
      }
    ], {
      fullDocument: 'updateLookup'
    });

    deviceChangeStream.on('change', async (change) => {
      try {
        // Solution 1: Deduplication check for device changes
        const deviceObjectId = change.documentKey?._id.toString();
        const changeKey = `${deviceObjectId}-${change.operationType}`;
        const lastProcessed = processedDeviceChanges.get(changeKey);
        const now = Date.now();
        
        if (lastProcessed && (now - lastProcessed) < DEDUPE_WINDOW_MS) {
          logger.debug('[Change Streams] Ignoring duplicate device change', {
            deviceId: deviceObjectId,
            timeSinceLastProcess: `${now - lastProcessed}ms`,
            operation: change.operationType
          });
          return; // Skip duplicate
        }
        
        // Mark as processed
        processedDeviceChanges.set(changeKey, now);
        
        // Clean up old entries (keep last 100)
        if (processedDeviceChanges.size > 100) {
          const entries = Array.from(processedDeviceChanges.entries());
          entries.sort((a, b) => a[1] - b[1]);
          entries.slice(0, entries.length - 100).forEach(([key]) => {
            processedDeviceChanges.delete(key);
          });
        }

        const verboseMode = process.env.VERBOSE_LOGGING === 'true';
        
        if (verboseMode) {
          logger.info('[Change Streams] Device change detected:', {
            operation: change.operationType,
            deviceId: change.documentKey?._id,
          });
        }

        const device = change.fullDocument;

        if (change.operationType === 'insert') {
          // New device registered
          // mqttService.publish(MQTT_CONFIG.TOPICS.DEVICES_NEW, {
          //   device,
          // });

          if (verboseMode) {
            logger.info('[Change Streams] Published new device:', {
              deviceId: device.deviceId,
              name: device.deviceName,
            });
          }

        } else if (change.operationType === 'update') {
          // Device updated (status, location, etc.)
          const updatedFields = change.updateDescription?.updatedFields || {};
          const fieldKeys = Object.keys(updatedFields);

          // Filter out routine updates (lastSeen, updatedAt) to reduce noise
          const significantFields = fieldKeys.filter(key => 
            !['lastSeen', 'updatedAt', '__v'].includes(key)
          );

          // Only log/publish if there are significant changes
          if (significantFields.length > 0) {
            // Publish to devices topic (only for significant changes)
            // mqttService.publish(MQTT_CONFIG.TOPICS.DEVICES_UPDATED, {
            //   deviceId: device.deviceId,
            //   updates: updatedFields,
            //   fullDocument: device,
            // });

            // Publish to device-specific topic
            // mqttService.publish(`devices/${device.deviceId}/updated`, {
            //   updates: updatedFields,
            //   fullDocument: device,
            // });

            if (verboseMode) {
              logger.info('[Change Streams] Published device update:', {
                deviceId: device.deviceId,
                updates: significantFields,
              });
            }
          } else {
            // Routine update (lastSeen/updatedAt only) - suppress logging unless in verbose mode
            if (verboseMode) {
              logger.debug('[Change Streams] Device routine update (lastSeen/updatedAt):', {
                deviceId: device.deviceId,
              });
            }
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

          // Publish to MQTT for real-time client updates
          // mqttService.publish(MQTT_CONFIG.TOPICS.READINGS_NEW, {
          //   reading,
          // });

          // Publish to device-specific topic
          if (reading.deviceId) {
            // mqttService.publish(`devices/${reading.deviceId}/readings`, {
            //   reading,
            // });
          }

          // Check for anomalies and publish warnings
          const hasAnomalies = checkForAnomalies(reading);
          if (hasAnomalies.length > 0) {
            // mqttService.publish(MQTT_CONFIG.TOPICS.READINGS_ANOMALY, {
            //   deviceId: reading.deviceId,
            //   anomalies: hasAnomalies,
            //   reading,
            // });
          }

          logger.debug('[Change Streams] Published new reading:', {
            deviceId: reading.deviceId,
            parameters: Object.keys(reading).filter(k => 
              ['pH', 'turbidity', 'tds'].includes(k)
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

          // Only publish if role or status changed (important updates)
          if (updatedFields.role || updatedFields.status) {
            // mqttService.publish(MQTT_CONFIG.TOPICS.USERS_UPDATED, {
            //   userId: user.uid,
            //   updates: updatedFields,
            // });

            const isProduction = process.env.NODE_ENV === 'production';
            if (!isProduction) {
              logger.info('[Change Streams] Published user update:', {
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
      logger.info('[Change Streams] Real-time monitoring active ✓ (with deduplication)');
    } else {
      logger.info('[Change Streams] All change streams initialized successfully (with deduplication and optimized filtering)');
    }

  } catch (error) {
    changeStreamsInitialized = false; // Reset flag on failure to allow retry
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
    } else if (reading.pH < SENSOR_THRESHOLDS.pH.min || 
               reading.pH > SENSOR_THRESHOLDS.pH.max) {
      anomalies.push({
        parameter: 'pH',
        value: reading.pH,
        severity: 'Warning',
        threshold: { min: SENSOR_THRESHOLDS.pH.min, max: SENSOR_THRESHOLDS.pH.max },
      });
    }
  }

  // Turbidity anomalies
  if (reading.turbidity !== undefined) {
    if (reading.turbidity > SENSOR_THRESHOLDS.turbidity.critical) {
      anomalies.push({
        parameter: 'turbidity',
        value: reading.turbidity,
        severity: 'Critical',
        threshold: { max: SENSOR_THRESHOLDS.turbidity.critical },
      });
    } else if (reading.turbidity > SENSOR_THRESHOLDS.turbidity.warning) {
      anomalies.push({
        parameter: 'turbidity',
        value: reading.turbidity,
        severity: 'Warning',
        threshold: { max: SENSOR_THRESHOLDS.turbidity.warning },
      });
    }
  }

  // TDS anomalies
  if (reading.tds !== undefined) {
    if (reading.tds > SENSOR_THRESHOLDS.tds.critical) {
      anomalies.push({
        parameter: 'tds',
        value: reading.tds,
        severity: 'Critical',
        threshold: { max: SENSOR_THRESHOLDS.tds.critical },
      });
    } else if (reading.tds > SENSOR_THRESHOLDS.tds.warning) {
      anomalies.push({
        parameter: 'tds',
        value: reading.tds,
        severity: 'Warning',
        threshold: { max: SENSOR_THRESHOLDS.tds.warning },
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
    
    // Reset initialization flag and clear deduplication maps
    changeStreamsInitialized = false;
    processedDeviceChanges.clear();
    processedAlertChanges.clear();
    
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
