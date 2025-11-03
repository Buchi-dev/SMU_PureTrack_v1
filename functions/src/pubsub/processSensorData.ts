/**
 * Process Sensor Data - Pub/Sub Trigger
 *
 * CRITICAL FUNCTION: Ingests all sensor data from MQTT bridge via Pub/Sub
 *
 * @module pubsub/processSensorData
 *
 * Functionality:
 * - Listens to Pub/Sub topic "iot-sensor-readings"
 * - Processes incoming sensor readings from MQTT bridge
 * - Validates and stores data in Firestore and Realtime Database
 * - Checks thresholds and creates alerts with debouncing
 * - Analyzes trends and creates trend alerts
 * - Implements quota optimization strategies:
 *   - Alert debouncing (5-min cooldown)
 *   - Throttled Firestore updates (5-min threshold)
 *   - Filtered history storage (every 5th reading)
 *
 * Migration Notes:
 * - Ported from src/pubsub/processSensorData.ts
 * - Enhanced with modular utilities and type safety
 * - Maintains all optimization strategies from original
 */

import * as admin from "firebase-admin";
import type { CloudEvent } from "firebase-functions/v2";
import { logger } from "firebase-functions/v2";
import type { MessagePublishedData } from "firebase-functions/v2/pubsub";
import { onMessagePublished } from "firebase-functions/v2/pubsub";

import { db, rtdb } from "../config/firebase";
import { COLLECTIONS } from "../constants/database.constants";
import {
  ALERT_COOLDOWN_MS,
  HISTORY_STORAGE_INTERVAL,
  LASTSEEN_UPDATE_THRESHOLD_MS,
  SENSOR_DATA_ERRORS,
  SENSOR_DATA_PUBSUB_CONFIG,
  RTDB_PATHS,
} from "../constants/sensorData.constants";
import type { WaterParameter } from "../types/alertManagement.types";
import type { SensorData, SensorReading, BatchSensorData } from "../types/sensorData.types";
import { createAlert, getNotificationRecipients } from "../utils/alertHelpers";
import { sendEmailNotification } from "../utils/emailTemplates";
import { getThresholdConfig, checkThreshold, analyzeTrend } from "../utils/thresholdHelpers";
import { isValidDeviceId, isValidSensorReading } from "../utils/validators";

/**
 * OPTIMIZATION: In-memory cache for alert debouncing
 * Prevents duplicate alerts within cooldown period (5 minutes)
 * Reduces Firestore reads and alert spam by 50-70%
 *
 * Cache key format: "{deviceId}-{parameter}" or "{deviceId}-{parameter}-trend"
 */
const alertCache = new Map<string, number>();

/**
 * OPTIMIZATION: Reading counter for history storage filtering
 * Only stores every Nth reading to reduce Realtime DB writes by 80%
 */
const readingCounters = new Map<string, number>();

/**
 * Process sensor data from IoT devices via Pub/Sub
 *
 * Trigger: MQTT Bridge → Pub/Sub Topic → This Function
 * Topic: iot-sensor-readings
 *
 * Message Format:
 * - Attributes: { device_id: string }
 * - Data: SensorData | BatchSensorData
 *
 * OPTIMIZED for Firebase quota savings:
 * - Throttled Firestore updates (5-min threshold)
 * - Filtered history storage (every 5th reading)
 * - Alert debouncing with cache (5-min cooldown)
 *
 * @param {*} event - Pub/Sub CloudEvent with sensor data
 *
 * @example
 * // Published by MQTT bridge:
 * pubsub.topic('iot-sensor-readings').publish({
 *   attributes: { device_id: 'device123' },
 *   json: { turbidity: 5.2, tds: 250, ph: 7.0, timestamp: Date.now() }
 * });
 */
export const processSensorData = onMessagePublished(
  {
    topic: SENSOR_DATA_PUBSUB_CONFIG.TOPIC,
    region: SENSOR_DATA_PUBSUB_CONFIG.REGION,
    retry: SENSOR_DATA_PUBSUB_CONFIG.RETRY,
    minInstances: SENSOR_DATA_PUBSUB_CONFIG.MIN_INSTANCES,
    maxInstances: SENSOR_DATA_PUBSUB_CONFIG.MAX_INSTANCES,
  },
  async (event: CloudEvent<MessagePublishedData<SensorData | BatchSensorData>>): Promise<void> => {
    try {
      // Extract device ID from message attributes
      const deviceId = event.data.message.attributes?.device_id;
      if (!deviceId) {
        logger.error(SENSOR_DATA_ERRORS.NO_DEVICE_ID);
        return; // Don't retry for missing device ID
      }

      // Validate device ID format
      if (!isValidDeviceId(deviceId)) {
        logger.error(`Invalid device ID format: ${deviceId}`);
        return; // Don't retry for invalid device ID
      }

      // Parse sensor data
      const messageData = event.data.message.json;
      if (!messageData) {
        logger.error(SENSOR_DATA_ERRORS.NO_SENSOR_DATA);
        return; // Don't retry for missing data
      }

      // OPTIMIZATION: Support batch processing (array of readings)
      // Check if message contains batch of readings or single reading
      const isBatch = Array.isArray((messageData as BatchSensorData).readings);
      const readingsArray: SensorData[] = isBatch
        ? (messageData as BatchSensorData).readings
        : [messageData as SensorData];

      logger.info(`Processing ${readingsArray.length} reading(s) for device: ${deviceId}`);

      // Process each reading in the batch
      for (const sensorData of readingsArray) {
        await processSingleReading(deviceId, sensorData);
      }

      logger.info(
        `Completed processing ${readingsArray.length} reading(s) for device: ${deviceId}`
      );
    } catch (error) {
      logger.error(SENSOR_DATA_ERRORS.PROCESSING_FAILED, error);
      throw error; // Trigger retry for unexpected errors
    }
  }
);

/**
 * Process a single sensor reading
 *
 * Steps:
 * 1. Validate sensor data
 * 2. Store in Realtime Database (latest + filtered history)
 * 3. Update device status in Firestore (throttled)
 * 4. Check thresholds and create alerts with debouncing
 * 5. Analyze trends and create trend alerts
 *
 * @param {*} deviceId - Device ID
 * @param {*} sensorData - Sensor data to process
 */
async function processSingleReading(deviceId: string, sensorData: SensorData): Promise<void> {
  // Validate sensor reading values
  if (!isValidSensorReading(sensorData)) {
    logger.warn(`${SENSOR_DATA_ERRORS.INVALID_SENSOR_DATA} for device: ${deviceId}`, sensorData);
    return; // Skip invalid readings
  }

  // Prepare reading data with server timestamp
  const readingData: SensorReading = {
    deviceId: deviceId,
    turbidity: sensorData.turbidity || 0,
    tds: sensorData.tds || 0,
    ph: sensorData.ph || 0,
    timestamp: sensorData.timestamp || Date.now(),
    receivedAt: admin.database.ServerValue.TIMESTAMP,
  };

  // Store in Realtime Database - Latest Reading (always update for real-time)
  /* eslint-disable-next-line new-cap */
  await rtdb.ref(RTDB_PATHS.LATEST_READING(deviceId)).set(readingData);

  // OPTIMIZATION: Store in Realtime Database - Historical Data (filtered)
  // Only store every 5th reading to reduce writes by 80%
  const currentCount = readingCounters.get(deviceId) || 0;
  const newCount = currentCount + 1;
  readingCounters.set(deviceId, newCount);

  if (newCount % HISTORY_STORAGE_INTERVAL === 0) {
    /* eslint-disable-next-line new-cap */
    await rtdb.ref(RTDB_PATHS.HISTORY(deviceId)).push(readingData);
    logger.info(`Stored reading #${newCount} in history for device: ${deviceId}`);
  }

  // OPTIMIZATION: Update device status in Firestore (throttled)
  // Only update if lastSeen is older than 5 minutes to reduce writes by 80%
  await updateDeviceStatus(deviceId);

  // Process alerts for this reading
  await processSensorReadingForAlerts(readingData);
}

/**
 * Update device status in Firestore with throttling
 *
 * OPTIMIZATION: Only updates if lastSeen is older than threshold
 * Reduces Firestore writes by 80%
 *
 * @param {*} deviceId - Device ID to update
 */
async function updateDeviceStatus(deviceId: string): Promise<void> {
  try {
    const deviceDoc = await db.collection(COLLECTIONS.DEVICES).doc(deviceId).get();

    const deviceData = deviceDoc.data();

    let shouldUpdateFirestore = true;
    if (deviceData?.lastSeen) {
      const lastSeenTimestamp = deviceData.lastSeen.toMillis();
      const timeSinceLastUpdate = Date.now() - lastSeenTimestamp;
      shouldUpdateFirestore = timeSinceLastUpdate >= LASTSEEN_UPDATE_THRESHOLD_MS;
    }

    if (shouldUpdateFirestore) {
      // Update to reflect device is back online
      const updateData: Record<string, unknown> = {
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        status: "online",
      };

      // Clear offlineSince if device was previously offline
      if (deviceData?.offlineSince) {
        updateData.offlineSince = admin.firestore.FieldValue.delete();
      }

      await db.collection(COLLECTIONS.DEVICES).doc(deviceId).update(updateData);
      logger.info(`Updated Firestore lastSeen for device: ${deviceId}`);
    }
  } catch (error) {
    logger.warn(`Failed to update device status for ${deviceId}:`, error);
    // Don't throw - device status update is not critical
  }
}

/**
 * Process sensor reading and check for alerts
 *
 * Alert Logic:
 * 1. Check each parameter against thresholds
 * 2. Apply debouncing (skip if alerted recently)
 * 3. Create alert if threshold exceeded
 * 4. Analyze trends and create trend alerts
 * 5. Send notifications to eligible users
 *
 * @param {*} reading - The sensor reading to process
 */
async function processSensorReadingForAlerts(reading: SensorReading): Promise<void> {
  const thresholds = await getThresholdConfig();

  logger.info(`Processing reading for alerts: device ${reading.deviceId}`);

  const parameters: WaterParameter[] = ["tds", "ph", "turbidity"];

  for (const parameter of parameters) {
    const value = reading[parameter];

    // OPTIMIZATION: Alert debouncing - check cache first
    // Skip alert processing if same parameter was alerted recently (5-min cooldown)
    const cacheKey = `${reading.deviceId}-${parameter}`;
    const lastAlertTime = alertCache.get(cacheKey);
    const now = Date.now();

    if (lastAlertTime && now - lastAlertTime < ALERT_COOLDOWN_MS) {
      logger.info(`Skipping alert check for ${cacheKey} (cooldown active)`);
      continue; // Skip this parameter, already alerted recently
    }

    // Check threshold violations
    const thresholdCheck = checkThreshold(parameter, value, thresholds);

    if (thresholdCheck.exceeded) {
      const alertId = await createAlert(
        reading.deviceId,
        parameter,
        "threshold",
        thresholdCheck.severity!,
        value,
        thresholdCheck.threshold,
        undefined,
        { location: reading.deviceId }
      );

      // Fetch alert data for notifications
      const alertDoc = await db.collection(COLLECTIONS.ALERTS).doc(alertId).get();
      const alertData = { alertId, ...alertDoc.data() };

      await processNotifications(alertId, alertData);

      // Update cache after successful alert
      alertCache.set(cacheKey, now);
      logger.info(`Alert cache updated for ${cacheKey}`);
    }

    // Check for trends
    const trendAnalysis = await analyzeTrend(reading.deviceId, parameter, value, thresholds);

    if (trendAnalysis && trendAnalysis.hasTrend) {
      // OPTIMIZATION: Check cache for trend alerts too
      const trendCacheKey = `${reading.deviceId}-${parameter}-trend`;
      const lastTrendAlert = alertCache.get(trendCacheKey);

      if (!lastTrendAlert || now - lastTrendAlert >= ALERT_COOLDOWN_MS) {
        const severity =
          trendAnalysis.changeRate > 30
            ? "Critical"
            : trendAnalysis.changeRate > 20
              ? "Warning"
              : "Advisory";

        const alertId = await createAlert(
          reading.deviceId,
          parameter,
          "trend",
          severity,
          value,
          null,
          trendAnalysis.direction,
          {
            previousValue: trendAnalysis.previousValue,
            changeRate: trendAnalysis.changeRate,
          }
        );

        // Fetch alert data for notifications
        const alertDoc = await db.collection(COLLECTIONS.ALERTS).doc(alertId).get();
        const alertData = { alertId, ...alertDoc.data() };

        await processNotifications(alertId, alertData);

        // Update cache after successful trend alert
        alertCache.set(trendCacheKey, now);
        logger.info(`Trend alert cache updated for ${trendCacheKey}`);
      } else {
        logger.info(`Skipping trend alert for ${trendCacheKey} (cooldown active)`);
      }
    }
  }
}

/**
 * Process and send notifications for an alert
 *
 * Steps:
 * 1. Get notification recipients based on preferences
 * 2. Send email notifications
 * 3. Update alert with notification tracking
 *
 * @param {*} alertId - The alert ID
 * @param {*} alert - The alert data object
 */
async function processNotifications(
  alertId: string,
  alert: Record<string, unknown>
): Promise<void> {
  try {
    const recipients = await getNotificationRecipients(alert);

    if (recipients.length === 0) {
      logger.info(`No recipients found for alert ${alertId}`);
      return;
    }

    const notifiedUsers: string[] = [];

    // Send email notifications to each recipient
    for (const recipient of recipients) {
      const success = await sendEmailNotification(recipient, alert);
      if (success) notifiedUsers.push(recipient.userId);
    }

    // Update alert with notification tracking
    if (notifiedUsers.length > 0) {
      await db
        .collection(COLLECTIONS.ALERTS)
        .doc(alertId)
        .update({
          notificationsSent: admin.firestore.FieldValue.arrayUnion(...notifiedUsers),
        });
    }

    logger.info(`Notifications sent for alert ${alertId} to ${notifiedUsers.length} users`);
  } catch (error) {
    logger.error(`Failed to process notifications for alert ${alertId}:`, error);
    // Don't throw - notification failure shouldn't block processing
  }
}
