import {onMessagePublished, MessagePublishedData} from "firebase-functions/v2/pubsub";
import type {CloudEvent} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";
import {db, rtdb} from "../config/firebase";
import type {
  SensorData,
  SensorReading,
  AlertSeverity,
  WaterParameter,
} from "../types";
import {
  getThresholdConfig,
  checkThreshold,
  analyzeTrend,
  createAlert,
  getNotificationRecipients,
} from "../utils/helpers";
import {sendEmailNotification} from "../utils/email-templates";

/**
 * Process sensor data from devices
 * Triggered by: device/sensordata/+ → Bridge → Pub/Sub
 */
export const processSensorData = onMessagePublished(
  {
    topic: "iot-sensor-readings",
    region: "us-central1",
    retry: true,
    minInstances: 0,
    maxInstances: 5,
  },
  async (event: CloudEvent<MessagePublishedData<SensorData>>): Promise<void> => {
    try {
      // Extract device ID from message attributes
      const deviceId = event.data.message.attributes?.device_id;
      if (!deviceId) {
        console.error("No device_id in message attributes");
        return;
      }

      // Parse sensor data
      const sensorData = event.data.message.json;
      if (!sensorData) {
        console.error("No sensor data in message");
        return;
      }

      console.log(`Processing sensor data for device: ${deviceId}`);

      // Prepare reading data
      const readingData: SensorReading = {
        deviceId: deviceId,
        turbidity: sensorData.turbidity || 0,
        tds: sensorData.tds || 0,
        ph: sensorData.ph || 0,
        timestamp: sensorData.timestamp || Date.now(),
        receivedAt: admin.database.ServerValue.TIMESTAMP,
      };

      // Store in Realtime Database - Latest Reading
      await rtdb.ref(`sensorReadings/${deviceId}/latestReading`).set(readingData);

      // Store in Realtime Database - Historical Data
      await rtdb.ref(`sensorReadings/${deviceId}/history`).push(readingData);

      // Update device status in Firestore
      await db.collection("devices").doc(deviceId).update({
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        status: "online",
      });

      // Process alerts for this reading
      await processSensorReadingForAlerts(readingData);

      console.log(`Sensor data processed for device: ${deviceId}`);
    } catch (error) {
      console.error("Error processing sensor data:", error);
      throw error; // Trigger retry
    }
  }
);

/**
 * Process sensor reading and check for alerts
 * @param {SensorReading} reading - The sensor reading to process
 * @return {Promise<void>}
 */
async function processSensorReadingForAlerts(
  reading: SensorReading
): Promise<void> {
  const thresholds = await getThresholdConfig();

  logger.info(`Processing reading for alerts: device ${reading.deviceId}`);

  const parameters: WaterParameter[] = ["tds", "ph", "turbidity"];

  for (const parameter of parameters) {
    const value = reading[parameter];

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
        {location: reading.deviceId}
      );

      const alertDoc = await db.collection("alerts").doc(alertId).get();
      const alertData = {alertId, ...alertDoc.data()};

      await processNotifications(alertId, alertData);
    }

    // Check for trends
    const trendAnalysis = await analyzeTrend(reading.deviceId, parameter, value, thresholds);

    if (trendAnalysis && trendAnalysis.hasTrend) {
      const severity: AlertSeverity =
        trendAnalysis.changeRate > 30 ? "Critical" :
          trendAnalysis.changeRate > 20 ? "Warning" : "Advisory";

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

      const alertDoc = await db.collection("alerts").doc(alertId).get();
      const alertData = {alertId, ...alertDoc.data()};

      await processNotifications(alertId, alertData);
    }
  }
}

/**
 * Process and send notifications for an alert
 * @param {string} alertId - The alert ID
 * @param {Record<string, unknown>} alert - The alert data object
 * @return {Promise<void>}
 */
async function processNotifications(
  alertId: string,
  alert: Record<string, unknown>
): Promise<void> {
  const recipients = await getNotificationRecipients(alert);

  if (recipients.length === 0) {
    logger.info(`No recipients found for alert ${alertId}`);
    return;
  }

  const notifiedUsers: string[] = [];

  for (const recipient of recipients) {
    const success = await sendEmailNotification(recipient, alert);
    if (success) notifiedUsers.push(recipient.userId);
  }

  await db.collection("alerts").doc(alertId).update({
    notificationsSent: admin.firestore.FieldValue.arrayUnion(...notifiedUsers),
  });

  logger.info(`Notifications sent for alert ${alertId} to ${notifiedUsers.length} users`);
}
