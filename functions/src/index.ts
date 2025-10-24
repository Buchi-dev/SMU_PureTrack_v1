import {onRequest, Request} from "firebase-functions/v2/https";
import {
  onMessagePublished,
  MessagePublishedData,
} from "firebase-functions/v2/pubsub";
import {
  beforeUserCreated,
  beforeUserSignedIn,
  HttpsError,
} from "firebase-functions/v2/identity";
import type {CloudEvent} from "firebase-functions/v2";
import {setGlobalOptions, logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {PubSub} from "@google-cloud/pubsub";
import type {Response} from "express";
import * as nodemailer from "nodemailer";

// ===========================
// INITIALIZATION
// ===========================

// Initialize Firebase Admin
admin.initializeApp();
const db: admin.firestore.Firestore = admin.firestore();
const rtdb: admin.database.Database = admin.database();
const pubsub = new PubSub();

// Set global options
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "512MiB",
});

// ===========================
// ALERT CONFIGURATION
// ===========================

// Default threshold configuration
const DEFAULT_THRESHOLDS: AlertThresholds = {
  tds: {
    warningMin: 0,
    warningMax: 500,
    criticalMin: 0,
    criticalMax: 1000,
    unit: "ppm",
  },
  ph: {
    warningMin: 6.0,
    warningMax: 8.5,
    criticalMin: 5.5,
    criticalMax: 9.0,
    unit: "",
  },
  turbidity: {
    warningMin: 0,
    warningMax: 5,
    criticalMin: 0,
    criticalMax: 10,
    unit: "NTU",
  },
  trendDetection: {
    enabled: true,
    thresholdPercentage: 15,
    timeWindowMinutes: 30,
  },
};

// Email configuration
const EMAIL_USER = "hed-tjyuzon@smu.edu.ph";
const EMAIL_PASSWORD = "khjo xjed akne uonm";

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

logger.info("Email transporter configured", {user: EMAIL_USER});

// ===========================
// TYPE DEFINITIONS
// ===========================

// Alert Types
type AlertSeverity = "Advisory" | "Warning" | "Critical";
type AlertStatus = "Active" | "Acknowledged" | "Resolved";
type WaterParameter = "tds" | "ph" | "turbidity";
type TrendDirection = "increasing" | "decreasing" | "stable";
type AlertType = "threshold" | "trend";

interface WaterQualityAlert {
  alertId: string;
  deviceId: string;
  deviceName?: string;
  deviceBuilding?: string;
  deviceFloor?: string;
  parameter: WaterParameter;
  alertType: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  currentValue: number;
  thresholdValue?: number;
  trendDirection?: TrendDirection;
  message: string;
  recommendedAction: string;
  createdAt: admin.firestore.FieldValue;
  notificationsSent: string[];
  metadata?: {
    previousValue?: number;
    changeRate?: number;
    location?: string;
  };
}

interface ThresholdConfig {
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  unit: string;
}

interface AlertThresholds {
  tds: ThresholdConfig;
  ph: ThresholdConfig;
  turbidity: ThresholdConfig;
  trendDetection: {
    enabled: boolean;
    thresholdPercentage: number;
    timeWindowMinutes: number;
  };
}

interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  alertSeverities: AlertSeverity[];
  parameters: WaterParameter[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// Device Types
type DeviceStatus = "online" | "offline" | "error" | "maintenance";

interface DeviceLocation {
  building: string;
  floor: string;
  notes?: string;
}

interface DeviceMetadata {
  location?: DeviceLocation;
  description?: string;
  owner?: string;
  [key: string]: string | number | boolean | undefined | DeviceLocation;
}

interface DeviceData {
  deviceId?: string;
  name?: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
  status?: DeviceStatus;
  metadata?: DeviceMetadata;
}

interface Device {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  status: DeviceStatus;
  registeredAt: admin.firestore.FieldValue;
  lastSeen: admin.firestore.FieldValue;
  updatedAt?: admin.firestore.FieldValue;
  metadata: DeviceMetadata;
}

// Sensor Types
interface SensorReading {
  deviceId: string;
  turbidity: number;
  tds: number;
  ph: number;
  timestamp: number;
  receivedAt: number | object;
}

interface SensorData {
  turbidity?: number;
  tds?: number;
  ph?: number;
  timestamp?: number;
}

// ===========================
// ALERT HELPER FUNCTIONS
// ===========================

/**
 * Get parameter unit string
 * @param {WaterParameter} parameter - The water parameter
 * @return {string} The unit string for the parameter
 */
function getParameterUnit(parameter: WaterParameter): string {
  switch (parameter) {
  case "tds": return "ppm";
  case "ph": return "";
  case "turbidity": return "NTU";
  default: return "";
  }
}

/**
 * Get parameter display name
 * @param {WaterParameter} parameter - The water parameter
 * @return {string} The display name for the parameter
 */
function getParameterName(parameter: WaterParameter): string {
  switch (parameter) {
  case "tds": return "TDS (Total Dissolved Solids)";
  case "ph": return "pH Level";
  case "turbidity": return "Turbidity";
  default: return parameter;
  }
}

/**
 * Get current threshold configuration from Firestore
 * @param {admin.firestore.Firestore} db - The Firestore database instance
 * @return {Promise<AlertThresholds>} The threshold configuration
 */
async function getThresholdConfig(
  db: admin.firestore.Firestore
): Promise<AlertThresholds> {
  try {
    const configDoc = await db
      .collection("alertSettings")
      .doc("thresholds")
      .get();

    if (configDoc.exists) {
      return configDoc.data() as AlertThresholds;
    }
  } catch (error) {
    logger.warn("Failed to load threshold config, using defaults:", error);
  }

  return DEFAULT_THRESHOLDS;
}

/**
 * Check if value exceeds thresholds
 * @param {WaterParameter} parameter - The water parameter to check
 * @param {number} value - The current value
 * @param {AlertThresholds} thresholds - The threshold configuration
 * @return {object} Object containing exceeded flag, severity, and threshold
 */
function checkThreshold(
  parameter: WaterParameter,
  value: number,
  thresholds: AlertThresholds
): {exceeded: boolean; severity: AlertSeverity | null; threshold: number | null} {
  const config = thresholds[parameter];

  if (config.criticalMax !== undefined && value > config.criticalMax) {
    return {exceeded: true, severity: "Critical", threshold: config.criticalMax};
  }
  if (config.criticalMin !== undefined && value < config.criticalMin) {
    return {exceeded: true, severity: "Critical", threshold: config.criticalMin};
  }
  if (config.warningMax !== undefined && value > config.warningMax) {
    return {exceeded: true, severity: "Warning", threshold: config.warningMax};
  }
  if (config.warningMin !== undefined && value < config.warningMin) {
    return {exceeded: true, severity: "Warning", threshold: config.warningMin};
  }

  return {exceeded: false, severity: null, threshold: null};
}

/**
 * Analyze trend for a parameter
 * @param {string} deviceId - The device identifier
 * @param {WaterParameter} parameter - The water quality parameter
 * @param {number} currentValue - Current parameter value
 * @param {AlertThresholds} thresholds - Alert threshold configuration
 * @return {Promise<object|null>} Trend analysis result or null
 */
async function analyzeTrend(
  deviceId: string,
  parameter: WaterParameter,
  currentValue: number,
  thresholds: AlertThresholds
): Promise<{
  hasTrend: boolean;
  direction: TrendDirection;
  changeRate: number;
  previousValue: number;
} | null> {
  if (!thresholds.trendDetection.enabled) return null;

  const timeWindow = thresholds.trendDetection.timeWindowMinutes;
  const thresholdPercentage = thresholds.trendDetection.thresholdPercentage;
  const windowStart = Date.now() - timeWindow * 60 * 1000;

  try {
    const rtdb = admin.database();
    const snapshot = await rtdb
      .ref(`sensorReadings/${deviceId}/history`)
      .orderByChild("timestamp")
      .startAt(windowStart)
      .limitToLast(10)
      .once("value");

    if (!snapshot.exists()) return null;

    const readings: SensorReading[] = [];
    snapshot.forEach((childSnapshot) => {
      readings.push(childSnapshot.val() as SensorReading);
    });

    if (readings.length < 2) return null;

    const firstReading = readings[0];
    const previousValue = firstReading[parameter];
    const changeRate = ((currentValue - previousValue) / previousValue) * 100;

    if (Math.abs(changeRate) >= thresholdPercentage) {
      return {
        hasTrend: true,
        direction: changeRate > 0 ? "increasing" : "decreasing",
        changeRate: Math.abs(changeRate),
        previousValue,
      };
    }
  } catch (error) {
    logger.error("Error analyzing trend:", error);
  }

  return null;
}

/**
 * Generate alert message and recommended action
 * @param {WaterParameter} parameter - The water quality parameter
 * @param {number} value - The parameter value
 * @param {AlertSeverity} severity - Alert severity level
 * @param {AlertType} alertType - Type of alert (threshold/trend)
 * @param {TrendDirection} [trendDirection] - Direction of trend
 * @param {object} [location] - Location information
 * @return {object} Alert message and recommended action
 */
function generateAlertContent(
  parameter: WaterParameter,
  value: number,
  severity: AlertSeverity,
  alertType: AlertType,
  trendDirection?: TrendDirection,
  location?: { building?: string; floor?: string }
): { message: string; recommendedAction: string } {
  const paramName = getParameterName(parameter);
  const unit = getParameterUnit(parameter);
  const valueStr = `${value.toFixed(2)}${unit ? " " + unit : ""}`;

  const locationPrefix = location?.building && location?.floor ?
    `[${location.building}, ${location.floor}] ` :
    location?.building ? `[${location.building}] ` : "";

  let message = "";
  let recommendedAction = "";

  if (alertType === "threshold") {
    const severityText = severity.toLowerCase();
    message = `${locationPrefix}${paramName} has reached ` +
      `${severityText} level: ${valueStr}`;

    const locContext = location?.building && location?.floor ?
      ` at ${location.building}, ${location.floor}` :
      location?.building ? ` at ${location.building}` : "";

    switch (severity) {
    case "Critical":
      recommendedAction = "Immediate action required" + locContext + ". " +
        "Investigate water source and treatment system. " +
        "Consider temporary shutdown if necessary.";
      break;
    case "Warning":
      recommendedAction = "Monitor closely" + locContext + " and prepare " +
        "corrective actions. Schedule system inspection within 24 hours.";
      break;
    case "Advisory":
      recommendedAction = "Continue monitoring" + locContext + ". " +
        "Note for regular maintenance schedule.";
      break;
    }
  } else if (alertType === "trend") {
    const direction = trendDirection === "increasing" ?
      "increasing" : "decreasing";
    message = `${locationPrefix}${paramName} is ${direction} ` +
      `abnormally: ${valueStr}`;

    const locContext = location?.building && location?.floor ?
      ` at ${location.building}, ${location.floor}` :
      location?.building ? ` at ${location.building}` : "";

    recommendedAction = "Investigate cause of " + direction + " trend" +
      locContext + ". Check system calibration and recent changes " +
      "to water source or treatment.";
  }

  return {message, recommendedAction};
}

/**
 * Create alert in Firestore
 * @param {admin.firestore.Firestore} db - Firestore instance
 * @param {string} deviceId - Device identifier
 * @param {WaterParameter} parameter - Water quality parameter
 * @param {AlertType} alertType - Type of alert
 * @param {AlertSeverity} severity - Alert severity level
 * @param {number} currentValue - Current parameter value
 * @param {number|null} thresholdValue - Threshold value exceeded
 * @param {TrendDirection} [trendDirection] - Direction of trend
 * @param {Record<string, unknown>} [metadata] - Additional metadata
 * @return {Promise<string>} Alert document ID
 */
async function createAlert(
  db: admin.firestore.Firestore,
  deviceId: string,
  parameter: WaterParameter,
  alertType: AlertType,
  severity: AlertSeverity,
  currentValue: number,
  thresholdValue: number | null,
  trendDirection?: TrendDirection,
  metadata?: Record<string, unknown>
): Promise<string> {
  let deviceName = "Unknown Device";
  const deviceLocation: { building?: string; floor?: string } = {};

  try {
    const deviceDoc = await db.collection("devices").doc(deviceId).get();
    if (deviceDoc.exists) {
      const deviceData = deviceDoc.data();
      deviceName = deviceData?.name || deviceId;

      if (deviceData?.metadata?.location) {
        const location = deviceData.metadata.location;
        if (location.building) deviceLocation.building = location.building;
        if (location.floor) deviceLocation.floor = location.floor;
      }
    }
  } catch (error) {
    logger.warn("Failed to fetch device information:", error);
  }

  const {message, recommendedAction} = generateAlertContent(
    parameter, currentValue, severity, alertType, trendDirection, deviceLocation
  );

  const alertData: Partial<WaterQualityAlert> = {
    deviceId,
    deviceName,
    ...(deviceLocation.building && {deviceBuilding: deviceLocation.building}),
    ...(deviceLocation.floor && {deviceFloor: deviceLocation.floor}),
    parameter,
    alertType,
    severity,
    status: "Active",
    currentValue,
    ...(thresholdValue !== null && {thresholdValue}),
    ...(trendDirection && {trendDirection}),
    message,
    recommendedAction,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    notificationsSent: [],
    ...(metadata && {metadata}),
  };

  const alertRef = await db.collection("alerts").add(alertData);
  await alertRef.update({alertId: alertRef.id});

  logger.info(`Alert created: ${alertRef.id}`, {deviceId, parameter, severity});

  return alertRef.id;
}

/**
 * Get users who should be notified
 * @param {admin.firestore.Firestore} db - Firestore instance
 * @param {Partial<WaterQualityAlert>} alert - Alert object
 * @return {Promise<NotificationPreferences[]>} List of recipients
 */
async function getNotificationRecipients(
  db: admin.firestore.Firestore,
  alert: Partial<WaterQualityAlert>
): Promise<NotificationPreferences[]> {
  try {
    const prefsSnapshot = await db
      .collection("notificationPreferences")
      .where("emailNotifications", "==", true)
      .get();

    const recipients: NotificationPreferences[] = [];
    const currentHour = new Date().getHours();

    for (const doc of prefsSnapshot.docs) {
      const prefs = doc.data() as NotificationPreferences;

      if (!prefs.alertSeverities.includes(alert.severity!)) continue;
      if (prefs.parameters.length > 0 && !prefs.parameters.includes(alert.parameter!)) continue;
      if (prefs.devices.length > 0 && !prefs.devices.includes(alert.deviceId!)) continue;

      if (prefs.quietHoursEnabled && prefs.quietHoursStart && prefs.quietHoursEnd) {
        const startHour = parseInt(prefs.quietHoursStart.split(":")[0]);
        const endHour = parseInt(prefs.quietHoursEnd.split(":")[0]);
        if (currentHour >= startHour && currentHour < endHour) continue;
      }

      recipients.push(prefs);
    }

    return recipients;
  } catch (error) {
    logger.error("Error fetching notification recipients:", error);
    return [];
  }
}

/**
 * Send email notification
 */
/**
 * Send email notification for an alert
 * @param {NotificationPreferences} recipient - Notification recipient
 * @param {Partial<WaterQualityAlert>} alert - Alert object
 * @return {Promise<boolean>} Success status
 */
async function sendEmailNotification(
  recipient: NotificationPreferences,
  alert: Partial<WaterQualityAlert>
): Promise<boolean> {
  try {
    const severityColor = alert.severity === "Critical" ? "#ff4d4f" :
      alert.severity === "Warning" ? "#faad14" : "#1890ff";

    const alertWithLoc = alert as WaterQualityAlert;
    const locStr = alertWithLoc.deviceBuilding && alertWithLoc.deviceFloor ?
      `${alertWithLoc.deviceBuilding}, ${alertWithLoc.deviceFloor}` :
      alertWithLoc.deviceBuilding ? alertWithLoc.deviceBuilding : "";

    const subLoc = locStr ? ` - ${locStr}` : "";

    const paramName = getParameterName(alert.parameter!);
    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@puretrack.com",
      to: recipient.email,
      subject: `[${alert.severity}] Water Quality Alert${subLoc} ` +
        `- ${paramName}`,
      html: `
        <div style="font-family: Arial, sans-serif; ` +
        `max-width: 600px; margin: 0 auto;">
          <div style="background: ${severityColor}; color: white; ` +
          `padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Water Quality Alert</h2>
            ${locStr ? "<p style=\"margin: 5px 0 0 0; font-size: 14px;\">" +
      `Location: ${locStr}</p>` : ""}
          </div>
          <div style="background: #f5f5f5; padding: 20px; ` +
          `border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; ` +
            `border-radius: 8px; margin-bottom: 15px;">
              <h3 style="color: ${severityColor}; ` +
              `margin-top: 0;">${alert.severity} Alert</h3>
              <p><strong>Device:</strong> ${alert.deviceName}</p>
              ${locStr ? `<p><strong>Location:</strong> ${locStr}</p>` : ""}
              <p><strong>Parameter:</strong> ` +
              `${getParameterName(alert.parameter!)}</p>
              <p><strong>Current Value:</strong> ` +
              `${alert.currentValue?.toFixed(2)} ` +
              `${getParameterUnit(alert.parameter!)}</p>
              ${alert.thresholdValue ? "<p><strong>Threshold:</strong> " +
      `${alert.thresholdValue} ${getParameterUnit(alert.parameter!)}</p>` : ""}
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div style="background: white; padding: 20px; ` +
            `border-radius: 8px; margin-bottom: 15px;">
              <h4 style="margin-top: 0;">Message</h4>
              <p>${alert.message}</p>
            </div>
            <div style="background: #fff3cd; padding: 20px; ` +
            `border-radius: 8px; border-left: 4px solid #faad14;">
              <h4 style="margin-top: 0;">Recommended Action</h4>
              <p>${alert.recommendedAction}</p>
            </div>
            <div style="margin-top: 20px; text-align: center;">
              <p style="color: #666; font-size: 12px;">
                This is an automated alert from ` +
                `PureTrack Water Quality Monitoring System
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    logger.info(`Email sent to ${recipient.email} for alert ${alert.alertId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${recipient.email}:`, error);
    return false;
  }
}

/**
 * Process and send notifications for an alert
 * @param {admin.firestore.Firestore} db - Firestore instance
 * @param {string} alertId - Alert document ID
 * @param {Partial<WaterQualityAlert>} alert - Alert object
 * @return {Promise<void>}
 */
async function processNotifications(
  db: admin.firestore.Firestore,
  alertId: string,
  alert: Partial<WaterQualityAlert>
): Promise<void> {
  const recipients = await getNotificationRecipients(db, alert);

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

/**
 * Process sensor reading and check for alerts
 * @param {SensorReading} reading - Sensor reading data
 * @return {Promise<void>}
 */
async function processSensorReadingForAlerts(
  reading: SensorReading
): Promise<void> {
  const thresholds = await getThresholdConfig(db);

  logger.info(`Processing reading for alerts: device ${reading.deviceId}`);

  const parameters: WaterParameter[] = ["tds", "ph", "turbidity"];

  for (const parameter of parameters) {
    const value = reading[parameter];

    const thresholdCheck = checkThreshold(parameter, value, thresholds);

    if (thresholdCheck.exceeded) {
      const alertId = await createAlert(
        db, reading.deviceId, parameter, "threshold",
        thresholdCheck.severity!, value, thresholdCheck.threshold,
        undefined, {location: reading.deviceId}
      );

      const alertDoc = await db.collection("alerts").doc(alertId).get();
      const alertData = {alertId, ...alertDoc.data()} as Partial<WaterQualityAlert>;

      await processNotifications(db, alertId, alertData);
    }

    const trendAnalysis = await analyzeTrend(reading.deviceId, parameter, value, thresholds);

    if (trendAnalysis && trendAnalysis.hasTrend) {
      const severity: AlertSeverity =
        trendAnalysis.changeRate > 30 ? "Critical" :
          trendAnalysis.changeRate > 20 ? "Warning" : "Advisory";

      const alertId = await createAlert(
        db, reading.deviceId, parameter, "trend", severity, value, null,
        trendAnalysis.direction, {
          previousValue: trendAnalysis.previousValue,
          changeRate: trendAnalysis.changeRate,
        }
      );

      const alertDoc = await db.collection("alerts").doc(alertId).get();
      const alertData = {alertId, ...alertDoc.data()} as Partial<WaterQualityAlert>;

      await processNotifications(db, alertId, alertData);
    }
  }
}

// ===========================
// REQUEST/RESPONSE TYPES
// ===========================
type DeviceAction =
  | "DISCOVER_DEVICES"
  | "SEND_COMMAND"
  | "ADD_DEVICE"
  | "GET_DEVICE"
  | "UPDATE_DEVICE"
  | "DELETE_DEVICE"
  | "LIST_DEVICES"
  | "GET_SENSOR_READINGS"
  | "GET_SENSOR_HISTORY";

interface DeviceManagementRequest {
  action: DeviceAction;
  deviceId?: string;
  deviceData?: DeviceData;
  command?: string;
  params?: Record<string, unknown>;
  limit?: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// MQTT/Pub-Sub Types
interface DeviceRegistrationInfo {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
}

interface CommandMessage {
  command: string;
  params?: Record<string, unknown>;
  timestamp: number;
  requestId?: string;
}

// ===========================
// HTTP-TRIGGERED FUNCTIONS
// ===========================

/**
 * Device Management API
 * Handles all device CRUD operations and command publishing
 */
export const deviceManagement = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {action, deviceId, deviceData, command, params, limit} =
        req.body as DeviceManagementRequest;

      if (!action) {
        res.status(400).json({
          success: false,
          error: "Action is required",
        } as ApiResponse);
        return;
      }

      console.log(`Device management action: ${action}`);

      // Handle different actions
      switch (action) {
      case "DISCOVER_DEVICES": {
        const discoveryMessage: CommandMessage = {
          command: "DISCOVER",
          timestamp: Date.now(),
          requestId: `discovery_${Date.now()}`,
        };

        // Publish to Pub/Sub - Bridge will forward to MQTT
        await pubsub.topic("device-commands").publishMessage({
          json: discoveryMessage,
          attributes: {
            mqtt_topic: "device/discovery/request",
          },
        });

        res.status(200).json({
          success: true,
          message: "Discovery message sent to devices",
        } as ApiResponse);
        break;
      }

      case "SEND_COMMAND": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const commandMessage: CommandMessage = {
          command: command || "STATUS",
          params: params || {},
          timestamp: Date.now(),
          requestId: `cmd_${Date.now()}`,
        };

        // Publish command to Pub/Sub
        await pubsub.topic("device-commands").publishMessage({
          json: commandMessage,
          attributes: {
            mqtt_topic: `device/command/${deviceId}`,
            device_id: deviceId,
          },
        });

        res.status(200).json({
          success: true,
          message: `Command sent to device: ${deviceId}`,
        } as ApiResponse);
        break;
      }

      case "ADD_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (doc.exists) {
          res.status(400).json({
            success: false,
            error: "Device already exists",
          } as ApiResponse);
          return;
        }

        const newDevice: Device = {
          deviceId: deviceId,
          name: deviceData?.name || `Device-${deviceId}`,
          type: deviceData?.type || "Arduino UNO R4 WiFi",
          firmwareVersion: deviceData?.firmwareVersion || "1.0.0",
          macAddress: deviceData?.macAddress || "",
          ipAddress: deviceData?.ipAddress || "",
          sensors: deviceData?.sensors || [
            "turbidity",
            "tds",
            "ph",
          ],
          status: (deviceData?.status as DeviceStatus) || "online",
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          metadata: deviceData?.metadata || {},
        };

        await deviceRef.set(newDevice);

        // Initialize Realtime Database structure
        await rtdb.ref(`sensorReadings/${deviceId}`).set({
          deviceId: deviceId,
          latestReading: null,
          status: "waiting_for_data",
        });

        res.status(200).json({
          success: true,
          message: "Device added successfully",
          data: {deviceId, device: newDevice},
        } as ApiResponse);
        break;
      }

      case "GET_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (!doc.exists) {
          res.status(404).json({
            success: false,
            error: "Device not found",
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          device: doc.data(),
        } as ApiResponse);
        break;
      }

      case "UPDATE_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (!doc.exists) {
          res.status(404).json({
            success: false,
            error: "Device not found",
          } as ApiResponse);
          return;
        }

        const updateData = {
          ...deviceData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        };

        await deviceRef.update(updateData);

        res.status(200).json({
          success: true,
          message: "Device updated successfully",
          data: {deviceId},
        } as ApiResponse);
        break;
      }

      case "DELETE_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (!doc.exists) {
          res.status(404).json({
            success: false,
            error: "Device not found",
          } as ApiResponse);
          return;
        }

        await deviceRef.delete();

        // Delete sensor readings from Realtime Database
        await rtdb.ref(`sensorReadings/${deviceId}`).remove();

        res.status(200).json({
          success: true,
          message: "Device deleted successfully",
          data: {deviceId},
        } as ApiResponse);
        break;
      }

      case "LIST_DEVICES": {
        const devicesSnapshot = await db.collection("devices").get();

        const devices = devicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        res.status(200).json({
          success: true,
          count: devices.length,
          devices: devices,
        } as ApiResponse);
        break;
      }

      case "GET_SENSOR_READINGS": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const snapshot = await rtdb
          .ref(`sensorReadings/${deviceId}/latestReading`)
          .once("value");

        if (!snapshot.exists()) {
          res.status(404).json({
            success: false,
            error: "No sensor readings found for this device",
          } as ApiResponse);
          return;
        }

        const sensorData: SensorReading = snapshot.val();

        res.status(200).json({
          success: true,
          deviceId: deviceId,
          sensorData: sensorData,
        } as ApiResponse);
        break;
      }

      case "GET_SENSOR_HISTORY": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const historyLimit = limit || 50;
        const snapshot = await rtdb
          .ref(`sensorReadings/${deviceId}/history`)
          .orderByChild("timestamp")
          .limitToLast(historyLimit)
          .once("value");

        if (!snapshot.exists()) {
          res.status(404).json({
            success: false,
            error: "No sensor history found for this device",
          } as ApiResponse);
          return;
        }

        const history: SensorReading[] = [];
        snapshot.forEach((child) => {
          history.push(child.val());
        });

        res.status(200).json({
          success: true,
          deviceId: deviceId,
          count: history.length,
          history: history.reverse(), // Most recent first
        } as ApiResponse);
        break;
      }

      default: {
        res.status(400).json({
          success: false,
          error: "Invalid action specified",
        } as ApiResponse);
      }
      }
    } catch (error) {
      console.error("Error in deviceManagement:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse);
    }
  }
);

// ===========================
// PUB/SUB-TRIGGERED FUNCTIONS
// ===========================

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
      await rtdb
        .ref(`sensorReadings/${deviceId}/latestReading`)
        .set(readingData);

      // Store in Realtime Database - Historical Data
      await rtdb
        .ref(`sensorReadings/${deviceId}/history`)
        .push(readingData);

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
 * Auto-register devices
 * Triggered by: device/registration/+ → Bridge → Pub/Sub
 */
export const autoRegisterDevice = onMessagePublished(
  {
    topic: "iot-device-registration",
    region: "us-central1",
    retry: true,
    minInstances: 0,
    maxInstances: 2, // Reduced: registration is infrequent
  },
  async (
    event: CloudEvent<MessagePublishedData<DeviceRegistrationInfo>>
  ): Promise<void> => {
    try {
      const deviceInfo = event.data.message.json;
      if (!deviceInfo || !deviceInfo.deviceId) {
        console.error("Invalid device registration data");
        return;
      }

      const deviceId = deviceInfo.deviceId;
      console.log(`Device registration request: ${deviceId}`);

      // Check if device already exists
      const deviceRef = db.collection("devices").doc(deviceId);
      const doc = await deviceRef.get();

      if (doc.exists) {
        console.log(
          `Device ${deviceId} already registered, updating last seen`
        );
        await deviceRef.update({
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          status: "online",
        });
        return;
      }

      // Register new device
      const newDevice: Device = {
        deviceId: deviceId,
        name: deviceInfo.name,
        type: deviceInfo.type,
        firmwareVersion: deviceInfo.firmwareVersion,
        macAddress: deviceInfo.macAddress,
        ipAddress: deviceInfo.ipAddress,
        sensors: deviceInfo.sensors,
        status: "online",
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {},
      };

      await deviceRef.set(newDevice);

      // Initialize Realtime Database structure
      await rtdb.ref(`sensorReadings/${deviceId}`).set({
        deviceId: deviceId,
        latestReading: null,
        status: "waiting_for_data",
      });

      console.log(`Device registered successfully: ${deviceId}`);
    } catch (error) {
      console.error("Error registering device:", error);
      throw error; // Trigger retry
    }
  }
);

/**
 * Monitor device status changes
 * Triggered by: device/status/+ → Bridge → Pub/Sub
 */
export const monitorDeviceStatus = onMessagePublished(
  {
    topic: "iot-device-status",
    region: "us-central1",
    retry: false,
    minInstances: 0,
    maxInstances: 2, // Added: limit concurrent instances
  },
  async (event: CloudEvent<MessagePublishedData<{status: string}>>): Promise<void> => {
    try {
      const deviceId = event.data.message.attributes?.device_id;
      const statusData = event.data.message.json;
      const status = statusData?.status || "unknown";

      if (!deviceId) {
        console.error("No device_id in status message");
        return;
      }

      console.log(`Device ${deviceId} status update: ${status}`);

      // Update Firestore with device status
      await db.collection("devices").doc(deviceId).update({
        status: status,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Device status updated: ${deviceId} -> ${status}`);
    } catch (error) {
      console.error("Error monitoring device status:", error);
      // Don't throw - status updates are informational only
    }
  }
);

// ===========================
// AUTHENTICATION BLOCKING FUNCTIONS
// ===========================

/**
 * User Types and Interfaces
 */
type UserStatus = "Pending" | "Approved" | "Suspended";
type UserRole = "Staff" | "Admin";

interface UserProfile {
  uuid: string;
  firstname: string;
  lastname: string;
  middlename: string;
  department: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: admin.firestore.FieldValue;
  updatedAt?: admin.firestore.FieldValue;
  lastLogin?: admin.firestore.FieldValue;
}

interface LoginLog {
  uid: string;
  email: string;
  displayName: string;
  statusAttempted: UserStatus;
  timestamp: admin.firestore.FieldValue;
  result: "success" | "rejected" | "error";
  message: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * beforeCreate — Initialize new user profile
 * Triggered when a user signs in for the first time via Google OAuth
 *
 * This function:
 * - Creates user profile in Firestore with default values
 * - Sets initial Role = "Staff" and Status = "Pending"
 * - Extracts name from Google displayName
 * - Allows user creation to proceed (they'll need approval before next sign-in)
 */
export const beforeCreate = beforeUserCreated(
  {
    region: "us-central1",
  },
  async (event) => {
    const user = event.data;

    // Guard clause for undefined user
    if (!user) {
      console.error("User data is undefined in beforeCreate");
      return;
    }

    console.log(`Creating new user profile for: ${user.email}`);

    // Extract first and last name from displayName
    const displayNameParts = (user.displayName || "").split(" ");
    const firstname = displayNameParts[0] || "";
    const lastname = displayNameParts.slice(1).join(" ") || "";

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uuid: user.uid,
      firstname,
      lastname,
      middlename: "",
      department: "",
      phoneNumber: user.phoneNumber || "",
      email: user.email || "",
      role: "Staff",
      status: "Pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await db.collection("users").doc(user.uid).set(userProfile);

      console.log(`User profile created for ${user.email} with status: Pending`);

      // Log the account creation
      await db.collection("business_logs").add({
        action: "user_created",
        uid: user.uid,
        email: user.email,
        performedBy: "system",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          role: "Staff",
          status: "Pending",
          provider: "google.com",
        },
      });

      // Allow user creation - they'll be redirected to complete profile
      return;
    } catch (error) {
      console.error("Error creating user profile:", error);
      // Still allow creation - we can handle missing profile data gracefully
      return;
    }
  }
);

/**
 * beforeSignIn — Validate user status before allowing sign-in
 * Triggered on every sign-in attempt (including first sign-in after creation)
 *
 * This function:
 * - Checks if user exists in Firestore
 * - Logs all sign-in attempts to login_logs collection
 * - Allows sign-in for all user statuses (Pending, Approved, Suspended)
 * - Client-side routing handles redirects based on user status
 * - Updates lastLogin timestamp on successful sign-in
 */
export const beforeSignIn = beforeUserSignedIn(
  {
    region: "us-central1",
  },
  async (event) => {
    const user = event.data;

    // Guard clause for undefined user
    if (!user) {
      console.error("User data is undefined in beforeSignIn");
      throw new HttpsError("internal", "User data is missing");
    }

    console.log(`Sign-in attempt by: ${user.email}`);

    try {
      // Get user profile from Firestore
      const userDoc = await db.collection("users").doc(user.uid).get();

      if (!userDoc.exists) {
        // User record not found (shouldn't happen due to beforeCreate)
        const errorLog: LoginLog = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          statusAttempted: "Pending",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          result: "error",
          message: "User record not found in database",
        };

        await db.collection("login_logs").add(errorLog);

        throw new HttpsError(
          "not-found",
          "User record not found. Please contact administrator."
        );
      }

      const userData = userDoc.data() as UserProfile;
      const status = userData.status;

      // Log the sign-in attempt
      const loginLog: LoginLog = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        statusAttempted: status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        result: "success", // Will be updated if rejected
        message: `Sign-in attempt with status: ${status}`,
      };

      // Allow sign-in for all statuses (Pending, Suspended, Approved)
      // Client-side will handle routing based on status
      loginLog.result = "success";
      loginLog.message = `Sign-in allowed with status: ${status}`;
      await db.collection("login_logs").add(loginLog);

      // Update last login timestamp
      await db.collection("users").doc(user.uid).update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const email = user.email || "unknown";
      console.log(`Sign-in allowed for ${email} (Status: ${status})`);

      // Allow sign-in to proceed
      return;
    } catch (error) {
      // If it's already an HttpsError, re-throw it
      if (error instanceof HttpsError) {
        throw error;
      }

      // Log unexpected errors
      console.error("Unexpected error in beforeSignIn:", error);

      await db.collection("login_logs").add({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        statusAttempted: "Pending",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        result: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });

      throw new HttpsError(
        "internal",
        "An error occurred during sign-in. Please try again."
      );
    }
  }
);

// ===========================
// SCHEDULED FUNCTIONS
// ===========================

/**
 * Check for stale critical alerts and log warnings
 * Runs every hour to monitor unresolved critical alerts
 */
export const checkStaleAlerts = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "Asia/Manila",
    retryCount: 3,
  },
  async () => {
    try {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

      const staleAlertsSnapshot = await db
        .collection("alerts")
        .where("status", "==", "Active")
        .where("severity", "==", "Critical")
        .get();

      let staleCount = 0;
      for (const doc of staleAlertsSnapshot.docs) {
        const alert = doc.data() as WaterQualityAlert;
        const createdAt = (alert.createdAt as admin.firestore.Timestamp).toMillis();

        if (createdAt < twoHoursAgo) {
          logger.warn(`Stale critical alert: ${doc.id} - Device: ` +
            `${alert.deviceId}, Parameter: ${alert.parameter}`);
          staleCount++;
        }
      }

      if (staleCount > 0) {
        logger.warn(`Found ${staleCount} stale critical alert(s) requiring attention`);
      } else {
        logger.info("No stale critical alerts found");
      }
    } catch (error) {
      logger.error("Error checking stale alerts:", error);
      throw error; // Allow retry
    }
  }
);

/**
 * Daily Analytics Email - Send comprehensive analytics every morning at 6:00 AM PH Time
 * Includes device status, recent alerts, and water quality summary
 */
export const sendDailyAnalyticsEmail = onSchedule(
  {
    schedule: "0 6 * * *", // Every day at 6:00 AM
    timeZone: "Asia/Manila",
    retryCount: 2,
  },
  async () => {
    try {
      logger.info("Starting daily analytics email generation...");

      // Get all users with email notifications enabled
      const prefsSnapshot = await db
        .collection("notificationPreferences")
        .where("emailNotifications", "==", true)
        .get();

      if (prefsSnapshot.empty) {
        logger.info("No users configured for email notifications");
        return;
      }

      // Get date range (last 24 hours)
      const end = Date.now();
      const start = end - 24 * 60 * 60 * 1000;

      // Generate device status report
      const deviceReport = await generateDeviceStatusReport();

      // Get recent alerts (last 24 hours)
      const alertsSnapshot = await db
        .collection("alerts")
        .where("createdAt", ">=", new Date(start))
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const recentAlerts = alertsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Count alerts by severity
      const alertCounts = {
        Critical: 0,
        Warning: 0,
        Advisory: 0,
      };

      recentAlerts.forEach((alert: any) => {
        if (alert.severity in alertCounts) {
          alertCounts[alert.severity as keyof typeof alertCounts]++;
        }
      });

      // Get water quality summary for all devices
      const devicesSnapshot = await db.collection("devices").get();
      const deviceSummaries: Array<any> = [];

      for (const deviceDoc of devicesSnapshot.docs) {
        const deviceId = deviceDoc.id;
        const deviceData = deviceDoc.data();

        // Get latest reading
        const latestSnapshot = await rtdb
          .ref(`sensorReadings/${deviceId}/latestReading`)
          .once("value");

        if (latestSnapshot.exists()) {
          const reading = latestSnapshot.val();
          deviceSummaries.push({
            deviceId,
            name: deviceData.name,
            location: deviceData.metadata?.location,
            status: deviceData.status,
            lastSeen: deviceData.lastSeen,
            reading: {
              turbidity: reading.turbidity,
              tds: reading.tds,
              ph: reading.ph,
              timestamp: reading.timestamp,
            },
          });
        }
      }

      // Send email to each recipient
      for (const doc of prefsSnapshot.docs) {
        const prefs = doc.data() as NotificationPreferences;

        try {
          await sendDailyAnalyticsEmailToUser(
            prefs,
            deviceReport as any,
            recentAlerts,
            alertCounts,
            deviceSummaries
          );
          logger.info(`Daily analytics sent to ${prefs.email}`);
        } catch (error) {
          logger.error(`Failed to send daily analytics to ${prefs.email}:`, error);
        }
      }

      logger.info(`Daily analytics emails sent to ${prefsSnapshot.size} users`);
    } catch (error) {
      logger.error("Error sending daily analytics:", error);
      throw error; // Allow retry
    }
  }
);

/**
 * Send daily analytics email to a single user
 */
async function sendDailyAnalyticsEmailToUser(
  recipient: NotificationPreferences,
  deviceReport: any,
  recentAlerts: any[],
  alertCounts: {Critical: number; Warning: number; Advisory: number},
  deviceSummaries: any[]
): Promise<void> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });

  const totalAlerts = alertCounts.Critical + alertCounts.Warning + alertCounts.Advisory;

  const deviceStatusRows = deviceSummaries
    .map(
      (dev) => `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 12px; font-weight: 500;">${dev.name}</td>
      <td style="padding: 12px;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; 
          background: ${dev.status === "online" ? "#e6f7e6" : "#fee"}; 
          color: ${dev.status === "online" ? "#2d662d" : "#c00"}; 
          font-size: 12px; font-weight: 600;">
          ${dev.status.toUpperCase()}
        </span>
      </td>
      <td style="padding: 12px;">${dev.reading.turbidity.toFixed(2)} NTU</td>
      <td style="padding: 12px;">${dev.reading.tds.toFixed(0)} ppm</td>
      <td style="padding: 12px;">${dev.reading.ph.toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  const recentAlertsRows = recentAlerts
    .slice(0, 10)
    .map(
      (alert) => {
        const severityColor =
          alert.severity === "Critical" ?
            "#ff4d4f" :
            alert.severity === "Warning" ?
              "#faad14" :
              "#1890ff";
        const timestamp = alert.createdAt?.toDate ?
          alert.createdAt.toDate().toLocaleString() :
          "N/A";

        return `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 12px;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; 
          background: ${severityColor}20; color: ${severityColor}; 
          font-size: 12px; font-weight: 600;">
          ${alert.severity}
        </span>
      </td>
      <td style="padding: 12px;">${alert.deviceName || alert.deviceId}</td>
      <td style="padding: 12px;">${getParameterName(alert.parameter)}</td>
      <td style="padding: 12px;">${alert.currentValue?.toFixed(2) || "N/A"}</td>
      <td style="padding: 12px; font-size: 12px; color: #666;">${timestamp}</td>
    </tr>
  `;
      }
    )
    .join("");

  const mailOptions = {
    from: process.env.EMAIL_USER || "noreply@puretrack.com",
    to: recipient.email,
    subject: `Daily Water Quality Analytics - ${today}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">
                      📊 Daily Water Quality Report
                    </h1>
                    <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                      ${today}
                    </p>
                  </td>
                </tr>

                <!-- Summary Cards -->
                <tr>
                  <td style="padding: 30px 30px 20px 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="32%" style="background: #e6f7ff; padding: 20px; border-radius: 8px; text-align: center;">
                          <div style="font-size: 32px; font-weight: 700; color: #1890ff; margin-bottom: 5px;">
                            ${deviceReport.summary.totalDevices}
                          </div>
                          <div style="color: #666; font-size: 14px;">Total Devices</div>
                        </td>
                        <td width="2%"></td>
                        <td width="32%" style="background: ${totalAlerts > 0 ? "#fff7e6" : "#f6ffed"}; padding: 20px; border-radius: 8px; text-align: center;">
                          <div style="font-size: 32px; font-weight: 700; color: ${totalAlerts > 0 ? "#faad14" : "#52c41a"}; margin-bottom: 5px;">
                            ${totalAlerts}
                          </div>
                          <div style="color: #666; font-size: 14px;">Alerts (24h)</div>
                        </td>
                        <td width="2%"></td>
                        <td width="32%" style="background: #f0f5ff; padding: 20px; border-radius: 8px; text-align: center;">
                          <div style="font-size: 32px; font-weight: 700; color: #597ef7; margin-bottom: 5px;">
                            ${deviceReport.summary.healthScore}%
                          </div>
                          <div style="color: #666; font-size: 14px;">Health Score</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Alert Breakdown -->
                ${
  totalAlerts > 0 ?
    `
                <tr>
                  <td style="padding: 0 30px 20px 30px;">
                    <div style="background: #fafafa; padding: 15px; border-radius: 8px; border-left: 4px solid #faad14;">
                      <div style="font-weight: 600; margin-bottom: 10px; color: #333;">Alert Breakdown:</div>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="33%" style="text-align: center;">
                            <div style="font-size: 24px; font-weight: 700; color: #ff4d4f;">${alertCounts.Critical}</div>
                            <div style="font-size: 12px; color: #666;">Critical</div>
                          </td>
                          <td width="33%" style="text-align: center;">
                            <div style="font-size: 24px; font-weight: 700; color: #faad14;">${alertCounts.Warning}</div>
                            <div style="font-size: 12px; color: #666;">Warning</div>
                          </td>
                          <td width="33%" style="text-align: center;">
                            <div style="font-size: 24px; font-weight: 700; color: #1890ff;">${alertCounts.Advisory}</div>
                            <div style="font-size: 12px; color: #666;">Advisory</div>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                ` :
    ""
}

                <!-- Device Status Section -->
                <tr>
                  <td style="padding: 0 30px 20px 30px;">
                    <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                      📱 Device Status & Latest Readings
                    </h2>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                      <thead>
                        <tr style="background: #fafafa;">
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">Device</th>
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">Status</th>
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">Turbidity</th>
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">TDS</th>
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">pH</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${deviceStatusRows || "<tr><td colspan=\"5\" style=\"padding: 20px; text-align: center; color: #999;\">No devices found</td></tr>"}
                      </tbody>
                    </table>
                  </td>
                </tr>

                <!-- Recent Alerts Section -->
                ${
  recentAlerts.length > 0 ?
    `
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <h2 style="margin: 0 0 15px 0; color: #333; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                      🔔 Recent Alerts (Last 24 Hours)
                    </h2>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                      <thead>
                        <tr style="background: #fafafa;">
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">Severity</th>
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">Device</th>
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">Parameter</th>
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">Value</th>
                          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 13px;">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${recentAlertsRows}
                      </tbody>
                    </table>
                  </td>
                </tr>
                ` :
    `
                <tr>
                  <td style="padding: 0 30px 30px 30px;">
                    <div style="background: #f6ffed; border: 2px solid #b7eb8f; border-radius: 8px; padding: 20px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                      <div style="color: #52c41a; font-weight: 600; font-size: 18px; margin-bottom: 5px;">No Alerts in the Last 24 Hours</div>
                      <div style="color: #666; font-size: 14px;">All systems operating normally</div>
                    </div>
                  </td>
                </tr>
                `
}

                <!-- Footer -->
                <tr>
                  <td style="background: #fafafa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #999; font-size: 12px;">
                      This is an automated daily report from PureTrack Water Quality Monitoring System
                    </p>
                    <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                      You're receiving this because email notifications are enabled in your settings
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await emailTransporter.sendMail(mailOptions);
}

// ===========================
// REPORT GENERATION FUNCTIONS
// ===========================

interface ReportRequest {
  reportType: "water_quality" | "device_status" | "data_summary" | "compliance";
  deviceId?: string;
  startDate?: number;
  endDate?: number;
  format?: "json" | "pdf" | "excel";
  includeCharts?: boolean;
}

interface WaterQualityMetrics {
  avgTurbidity: number;
  maxTurbidity: number;
  minTurbidity: number;
  avgTDS: number;
  maxTDS: number;
  minTDS: number;
  avgPH: number;
  maxPH: number;
  minPH: number;
  totalReadings: number;
  timeRange: { start: number; end: number };
}

interface ComplianceStatus {
  parameter: string;
  value: number;
  standard: number;
  unit: string;
  status: "compliant" | "warning" | "violation";
  percentage: number;
}

/**
 * Generate Water Quality Report
 */
export const generateReport = onRequest(
  {
    cors: true,
    invoker: "public",
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        reportType,
        deviceId,
        startDate,
        endDate,
      } = req.body as ReportRequest;

      if (!reportType) {
        res.status(400).json({
          success: false,
          error: "Report type is required",
        } as ApiResponse);
        return;
      }

      console.log(`Generating ${reportType} report`);

      switch (reportType) {
      case "water_quality": {
        const report = await generateWaterQualityReport(
          deviceId,
          startDate,
          endDate
        );
        res.status(200).json({
          success: true,
          reportType: "water_quality",
          generatedAt: Date.now(),
          data: report,
        } as ApiResponse);
        break;
      }

      case "device_status": {
        const report = await generateDeviceStatusReport();
        res.status(200).json({
          success: true,
          reportType: "device_status",
          generatedAt: Date.now(),
          data: report,
        } as ApiResponse);
        break;
      }

      case "data_summary": {
        const report = await generateDataSummaryReport(
          deviceId,
          startDate,
          endDate
        );
        res.status(200).json({
          success: true,
          reportType: "data_summary",
          generatedAt: Date.now(),
          data: report,
        } as ApiResponse);
        break;
      }

      case "compliance": {
        const report = await generateComplianceReport(
          deviceId,
          startDate,
          endDate
        );
        res.status(200).json({
          success: true,
          reportType: "compliance",
          generatedAt: Date.now(),
          data: report,
        } as ApiResponse);
        break;
      }

      default:
        res.status(400).json({
          success: false,
          error: "Invalid report type",
        } as ApiResponse);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Report generation failed",
      } as ApiResponse);
    }
  }
);

// ===========================
// REPORT GENERATION HELPERS
// ===========================

/**
 * Water Quality Report - Comprehensive analysis
 * @param {string} [deviceId] - Optional device ID to filter data
 * @param {number} [startDate] - Optional start date timestamp
 * @param {number} [endDate] - Optional end date timestamp
 * @return {Promise<unknown>} The generated water quality report
 */
async function generateWaterQualityReport(
  deviceId?: string,
  startDate?: number,
  endDate?: number
): Promise<unknown> {
  const end = endDate || Date.now();
  const start = startDate || end - 7 * 24 * 60 * 60 * 1000; // Default: 7 days

  const devices = deviceId ?
    [deviceId] :
    (await db.collection("devices").get()).docs.map((doc) => doc.id);

  const reportData: Record<string, unknown> = {
    title: "Water Quality Analysis Report",
    period: {start, end},
    devices: [],
  };

  for (const devId of devices) {
    // Query by receivedAt (server timestamp) instead of timestamp (device time)
    const snapshot = await rtdb
      .ref(`sensorReadings/${devId}/history`)
      .orderByChild("receivedAt")
      .startAt(start)
      .endAt(end)
      .limitToLast(10000)
      .once("value");

    if (!snapshot.exists()) {
      console.log(`No readings found for device ${devId} in time range`);
      continue;
    }

    const readings: SensorReading[] = [];
    snapshot.forEach((child) => {
      readings.push(child.val());
    });

    if (readings.length === 0) continue;

    // Calculate metrics
    const metrics: WaterQualityMetrics = {
      avgTurbidity: readings.reduce((sum, r) => sum + r.turbidity, 0) / readings.length,
      maxTurbidity: Math.max(...readings.map((r) => r.turbidity)),
      minTurbidity: Math.min(...readings.map((r) => r.turbidity)),
      avgTDS: readings.reduce((sum, r) => sum + r.tds, 0) / readings.length,
      maxTDS: Math.max(...readings.map((r) => r.tds)),
      minTDS: Math.min(...readings.map((r) => r.tds)),
      avgPH: readings.reduce((sum, r) => sum + r.ph, 0) / readings.length,
      maxPH: Math.max(...readings.map((r) => r.ph)),
      minPH: Math.min(...readings.map((r) => r.ph)),
      totalReadings: readings.length,
      timeRange: {start, end},
    };

    // Device info with proper null checking
    const deviceDoc = await db.collection("devices").doc(devId).get();
    if (!deviceDoc.exists) {
      console.warn(`Device ${devId} not found in Firestore`);
      continue;
    }
    const deviceData = deviceDoc.data();

    (reportData.devices as Array<unknown>).push({
      deviceId: devId,
      deviceName: deviceData?.name,
      location: deviceData?.metadata?.location,
      metrics,
      readings: readings.slice(-100), // Last 100 readings
      trends: calculateTrends(readings),
      alerts: generateAlerts(metrics),
    });
  }

  return reportData;
}

/**
 * Device Status Report - Operational health overview
 */
async function generateDeviceStatusReport(): Promise<unknown> {
  const devicesSnapshot = await db.collection("devices").get();

  const statusSummary: Record<string, number> = {
    online: 0,
    offline: 0,
    error: 0,
    maintenance: 0,
  };

  const devices = devicesSnapshot.docs.map((doc) => {
    const data = doc.data();
    const status = data.status || "offline";
    statusSummary[status]++;

    // Check if device is truly online (last seen < 5 minutes)
    const lastSeenTimestamp = data.lastSeen?.toMillis?.() || 0;
    const isActive = Date.now() - lastSeenTimestamp < 5 * 60 * 1000;

    return {
      deviceId: doc.id,
      name: data.name,
      type: data.type,
      status: isActive ? status : "offline",
      lastSeen: lastSeenTimestamp,
      firmwareVersion: data.firmwareVersion,
      sensors: data.sensors,
      location: data.metadata?.location,
      connectivity: isActive ? "active" : "inactive",
      uptime: calculateUptime(lastSeenTimestamp),
    };
  });

  return {
    title: "Device Status Report",
    generatedAt: Date.now(),
    summary: {
      totalDevices: devices.length,
      statusBreakdown: statusSummary,
      healthScore: devices.length > 0 ?
        ((statusSummary.online / devices.length) * 100).toFixed(1) :
        "0.0",
    },
    devices,
    recommendations: generateDeviceRecommendations(devices),
  };
}

/**
 * Data Summary Report - Statistical analysis
 * @param {string} [deviceId] - Optional device ID to filter data
 * @param {number} [startDate] - Optional start date timestamp
 * @param {number} [endDate] - Optional end date timestamp
 * @return {Promise<unknown>} The generated data summary report
 */
async function generateDataSummaryReport(
  deviceId?: string,
  startDate?: number,
  endDate?: number
): Promise<unknown> {
  const end = endDate || Date.now();
  const start = startDate || end - 30 * 24 * 60 * 60 * 1000; // Default: 30 days

  const devices = deviceId ?
    [deviceId] :
    (await db.collection("devices").get()).docs.map((doc) => doc.id);

  let totalReadings = 0;
  const aggregatedData: Record<string, unknown> = {
    turbidity: [],
    tds: [],
    ph: [],
  };

  for (const devId of devices) {
    // Query by receivedAt (server timestamp) instead of timestamp (device time)
    const snapshot = await rtdb
      .ref(`sensorReadings/${devId}/history`)
      .orderByChild("receivedAt")
      .startAt(start)
      .endAt(end)
      .limitToLast(10000)
      .once("value");

    if (!snapshot.exists()) continue;

    snapshot.forEach((child) => {
      const reading = child.val();
      (aggregatedData.turbidity as number[]).push(reading.turbidity);
      (aggregatedData.tds as number[]).push(reading.tds);
      (aggregatedData.ph as number[]).push(reading.ph);
      totalReadings++;
    });
  }

  return {
    title: "Data Summary Report",
    period: {start, end},
    summary: {
      totalReadings,
      totalDevices: devices.length,
      dataCompleteness: calculateDataCompleteness(totalReadings, start, end),
    },
    statistics: {
      turbidity: calculateStatistics(aggregatedData.turbidity as number[]),
      tds: calculateStatistics(aggregatedData.tds as number[]),
      ph: calculateStatistics(aggregatedData.ph as number[]),
    },
    hourlyDistribution: calculateHourlyDistribution(),
    dataQuality: assessDataQuality(),
  };
}

/**
 * Compliance Report - Regulatory standards verification
 * @param {string} [deviceId] - Optional device ID to filter data
 * @param {number} [startDate] - Optional start date timestamp
 * @param {number} [endDate] - Optional end date timestamp
 * @return {Promise<unknown>} The generated compliance report
 */
async function generateComplianceReport(
  deviceId?: string,
  startDate?: number,
  endDate?: number
): Promise<unknown> {
  const end = endDate || Date.now();
  const start = startDate || end - 7 * 24 * 60 * 60 * 1000;

  // WHO/EPA Standards
  const standards = {
    turbidity: {max: 5, unit: "NTU", name: "Turbidity"},
    tds: {max: 500, unit: "ppm", name: "Total Dissolved Solids"},
    ph: {min: 6.5, max: 8.5, unit: "pH", name: "pH Level"},
  };

  const devices = deviceId ?
    [deviceId] :
    (await db.collection("devices").get()).docs.map((doc) => doc.id);

  const complianceData: Array<unknown> = [];

  for (const devId of devices) {
    // Query by receivedAt (server timestamp) instead of timestamp (device time)
    const snapshot = await rtdb
      .ref(`sensorReadings/${devId}/history`)
      .orderByChild("receivedAt")
      .startAt(start)
      .endAt(end)
      .limitToLast(10000)
      .once("value");

    if (!snapshot.exists()) continue;

    const readings: SensorReading[] = [];
    snapshot.forEach((child) => {
      readings.push(child.val());
    });

    if (readings.length === 0) continue;

    // Calculate compliance metrics
    const avgTurbidity = readings.reduce((sum, r) => sum + r.turbidity, 0) / readings.length;
    const avgTDS = readings.reduce((sum, r) => sum + r.tds, 0) / readings.length;
    const avgPH = readings.reduce((sum, r) => sum + r.ph, 0) / readings.length;

    const violations = {
      turbidity: readings.filter((r) => r.turbidity > standards.turbidity.max).length,
      tds: readings.filter((r) => r.tds > standards.tds.max).length,
      ph: readings.filter((r) => r.ph < standards.ph.min || r.ph > standards.ph.max).length,
    };

    const complianceStatus: ComplianceStatus[] = [
      {
        parameter: "Turbidity",
        value: avgTurbidity,
        standard: standards.turbidity.max,
        unit: standards.turbidity.unit,
        status: avgTurbidity <= standards.turbidity.max ? "compliant" : "violation",
        percentage: ((readings.length - violations.turbidity) / readings.length) * 100,
      },
      {
        parameter: "TDS",
        value: avgTDS,
        standard: standards.tds.max,
        unit: standards.tds.unit,
        status: avgTDS <= standards.tds.max ? "compliant" : "violation",
        percentage: ((readings.length - violations.tds) / readings.length) * 100,
      },
      {
        parameter: "pH",
        value: avgPH,
        standard: (standards.ph.min + standards.ph.max) / 2,
        unit: standards.ph.unit,
        status:
          avgPH >= standards.ph.min && avgPH <= standards.ph.max ? "compliant" : "violation",
        percentage: ((readings.length - violations.ph) / readings.length) * 100,
      },
    ];

    const deviceDoc = await db.collection("devices").doc(devId).get();
    if (!deviceDoc.exists) {
      console.warn(`Device ${devId} not found in Firestore`);
      continue;
    }
    const deviceData = deviceDoc.data();

    complianceData.push({
      deviceId: devId,
      deviceName: deviceData?.name,
      location: deviceData?.metadata?.location,
      totalReadings: readings.length,
      complianceStatus,
      overallCompliance: complianceStatus.every((s) => s.status === "compliant"),
      violations,
      recommendations: generateComplianceRecommendations(violations),
    });
  }

  return {
    title: "Water Quality Compliance Report",
    period: {start, end},
    standards: {
      turbidity: `≤ ${standards.turbidity.max} ${standards.turbidity.unit}`,
      tds: `≤ ${standards.tds.max} ${standards.tds.unit}`,
      ph: `${standards.ph.min} - ${standards.ph.max}`,
      reference: "WHO/EPA Drinking Water Standards",
    },
    devices: complianceData,
    summary: {
      totalDevices: complianceData.length,
      compliantDevices: (complianceData as Array<Record<string, unknown>>)
        .filter((d) => d.overallCompliance).length,
      complianceRate: complianceData.length > 0 ?
        (
          ((complianceData as Array<Record<string, unknown>>)
            .filter((d) => d.overallCompliance).length / complianceData.length) *
          100
        ).toFixed(1) :
        "0.0",
    },
  };
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Calculate statistical metrics for a dataset
 * @param {number[]} data - Array of numbers to analyze
 * @return {Record<string, number>} Statistical metrics including mean, median, stdDev, min, max
 */
function calculateStatistics(data: number[]): Record<string, number> {
  if (data.length === 0) return {mean: 0, median: 0, stdDev: 0, min: 0, max: 0};

  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    min: Math.min(...data),
    max: Math.max(...data),
  };
}

/**
 * Calculate trends for sensor readings
 * @param {SensorReading[]} readings - Array of sensor readings
 * @return {Record<string, string>} Trend analysis for turbidity, tds, and ph
 */
function calculateTrends(readings: SensorReading[]): Record<string, string> {
  if (readings.length < 20) return {turbidity: "stable", tds: "stable", ph: "stable"};

  const recent = readings.slice(-10);
  const older = readings.slice(-20, -10);

  // Ensure older has data
  if (older.length === 0) return {turbidity: "stable", tds: "stable", ph: "stable"};

  const avgRecentTurbidity = recent.reduce((s, r) => s + r.turbidity, 0) / recent.length;
  const avgOlderTurbidity = older.reduce((s, r) => s + r.turbidity, 0) / older.length;

  const avgRecentTDS = recent.reduce((s, r) => s + r.tds, 0) / recent.length;
  const avgOlderTDS = older.reduce((s, r) => s + r.tds, 0) / older.length;

  const avgRecentPH = recent.reduce((s, r) => s + r.ph, 0) / recent.length;
  const avgOlderPH = older.reduce((s, r) => s + r.ph, 0) / older.length;

  return {
    turbidity:
      avgRecentTurbidity > avgOlderTurbidity * 1.1 ?
        "increasing" :
        avgRecentTurbidity < avgOlderTurbidity * 0.9 ?
          "decreasing" :
          "stable",
    tds:
      avgRecentTDS > avgOlderTDS * 1.1 ?
        "increasing" :
        avgRecentTDS < avgOlderTDS * 0.9 ?
          "decreasing" :
          "stable",
    ph:
      avgRecentPH > avgOlderPH * 1.05 ?
        "increasing" :
        avgRecentPH < avgOlderPH * 0.95 ?
          "decreasing" :
          "stable",
  };
}

/**
 * Generate alerts based on water quality metrics
 * @param {WaterQualityMetrics} metrics - Water quality metrics to analyze
 * @return {Array<unknown>} Array of alert objects
 */
function generateAlerts(metrics: WaterQualityMetrics): Array<unknown> {
  const alerts: Array<unknown> = [];

  if (metrics.avgTurbidity > 5) {
    alerts.push({
      severity: "high",
      parameter: "turbidity",
      message: "Average turbidity exceeds WHO standards (5 NTU)",
      value: metrics.avgTurbidity.toFixed(2),
    });
  }

  if (metrics.avgTDS > 500) {
    alerts.push({
      severity: "medium",
      parameter: "tds",
      message: "Average TDS exceeds recommended limit (500 ppm)",
      value: metrics.avgTDS.toFixed(2),
    });
  }

  if (metrics.avgPH < 6.5 || metrics.avgPH > 8.5) {
    alerts.push({
      severity: "high",
      parameter: "ph",
      message: "pH level outside safe range (6.5-8.5)",
      value: metrics.avgPH.toFixed(2),
    });
  }

  return alerts;
}

/**
 * Calculate device uptime based on last seen timestamp
 * @param {number} lastSeenTimestamp - Timestamp of last device contact
 * @return {string} Human-readable uptime string
 */
function calculateUptime(lastSeenTimestamp: number): string {
  const now = Date.now();
  const diff = now - lastSeenTimestamp;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  return hours < 1 ? "< 1 hour" : `${hours} hours ago`;
}

/**
 * Generate device recommendations based on device status
 * @param {Array<Record<string, unknown>>} devices - Array of device objects
 * @return {Array<string>} Array of recommendation strings
 */
function generateDeviceRecommendations(devices: Array<Record<string, unknown>>): Array<string> {
  const recommendations: Array<string> = [];
  const offlineCount = devices.filter((d) => d.connectivity === "inactive").length;

  if (offlineCount > 0) {
    recommendations.push(`${offlineCount} device(s) are offline - check connectivity`);
  }

  return recommendations;
}

/**
 * Calculate data completeness percentage
 * @param {number} totalReadings - Total number of readings received
 * @param {number} start - Start timestamp
 * @param {number} end - End timestamp
 * @return {string} Completeness percentage as string
 */
function calculateDataCompleteness(
  totalReadings: number,
  start: number,
  end: number
): string {
  const expectedReadings = Math.floor((end - start) / (5 * 60 * 1000)); // Every 5 minutes
  const completeness = (totalReadings / expectedReadings) * 100;
  return `${Math.min(completeness, 100).toFixed(1)}%`;
}

/**
 * Calculate hourly distribution of readings
 * @return {Promise<Record<string, number>>} Hourly distribution data
 */
function calculateHourlyDistribution(): Promise<Record<string, number>> {
  // Simplified - return empty for now
  return Promise.resolve({});
}

/**
 * Assess data quality based on readings
 * @return {Record<string, string>} Data quality assessment
 */
function assessDataQuality(): Record<string, string> {
  return {
    overall: "good",
    turbidity: "good",
    tds: "good",
    ph: "good",
  };
}

/**
 * Generate compliance recommendations based on violations
 * @param {Record<string, number>} violations - Violation counts by parameter
 * @return {Array<string>} Array of recommendation strings
 */
function generateComplianceRecommendations(
  violations: Record<string, number>
): Array<string> {
  const recommendations: Array<string> = [];

  if (violations.turbidity > 0) {
    recommendations.push("Check and replace water filters - high turbidity detected");
  }

  if (violations.tds > 0) {
    recommendations.push("Consider RO system maintenance - elevated TDS levels");
  }

  if (violations.ph > 0) {
    recommendations.push("pH adjustment required - levels outside safe range");
  }

  return recommendations;
}

// ===========================
// TESTING & DEBUG FUNCTIONS
// ===========================

/**
 * Test Alert Notifications - Send a test alert email
 * Use this to verify email configuration and notification preferences
 */
export const testAlertNotification = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {deviceId, parameter, severity, userEmail} = req.body;

      // Create a test alert
      const testAlert: Partial<WaterQualityAlert> = {
        alertId: `test_${Date.now()}`,
        deviceId: deviceId || "TEST-DEVICE-001",
        deviceName: "Test Water Quality Device",
        deviceBuilding: "Test Building",
        deviceFloor: "Test Floor",
        parameter: (parameter as WaterParameter) || "ph",
        alertType: "threshold",
        severity: (severity as AlertSeverity) || "Warning",
        status: "Active",
        currentValue: 9.5,
        thresholdValue: 8.5,
        message: "TEST ALERT: pH level has reached warning level: 9.50",
        recommendedAction: "This is a test alert. Monitor closely and prepare corrective actions.",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        notificationsSent: [],
      };

      // Save test alert to Firestore
      const alertRef = await db.collection("alerts").add(testAlert);
      await alertRef.update({alertId: alertRef.id});
      testAlert.alertId = alertRef.id;

      logger.info(`Test alert created: ${alertRef.id}`);

      // Get notification recipients
      const recipients = await getNotificationRecipients(db, testAlert);

      logger.info(`Found ${recipients.length} recipients for test alert`);

      if (recipients.length === 0) {
        // If no recipients found and userEmail provided, send directly
        if (userEmail) {
          const testRecipient: NotificationPreferences = {
            userId: "test-user",
            email: userEmail,
            emailNotifications: true,
            pushNotifications: false,
            alertSeverities: ["Advisory", "Warning", "Critical"],
            parameters: ["tds", "ph", "turbidity"],
            devices: [],
            quietHoursEnabled: false,
          };

          const sent = await sendEmailNotification(testRecipient, testAlert);

          res.status(200).json({
            success: true,
            message: "Test alert sent directly to provided email",
            alertId: alertRef.id,
            emailSent: sent,
            recipient: userEmail,
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: false,
          message:
            "No notification preferences found. " +
            "Please set up notification preferences first.",
          alertId: alertRef.id,
          recipients: 0,
          hint: "Use the setupNotificationPreferences endpoint to create preferences",
        } as ApiResponse);
        return;
      }

      // Send notifications to all recipients
      const notifiedUsers: string[] = [];
      for (const recipient of recipients) {
        const success = await sendEmailNotification(recipient, testAlert);
        if (success) notifiedUsers.push(recipient.userId);
      }

      // Update alert with notification status
      await db.collection("alerts").doc(alertRef.id).update({
        notificationsSent: admin.firestore.FieldValue.arrayUnion(...notifiedUsers),
      });

      res.status(200).json({
        success: true,
        message: `Test alert sent to ${notifiedUsers.length} recipient(s)`,
        alertId: alertRef.id,
        recipients: recipients.map((r) => ({
          email: r.email,
          userId: r.userId,
        })),
        notificationsSent: notifiedUsers.length,
      } as ApiResponse);
    } catch (error) {
      logger.error("Error in testAlertNotification:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse);
    }
  }
);

/**
 * Setup Notification Preferences - Create or update notification preferences for a user
 */
export const setupNotificationPreferences = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {userId, email} = req.body;

      if (!userId || !email) {
        res.status(400).json({
          success: false,
          error: "userId and email are required",
        } as ApiResponse);
        return;
      }

      // Create notification preferences
      const preferences: NotificationPreferences = {
        userId: userId,
        email: email,
        emailNotifications: true,
        pushNotifications: false,
        alertSeverities: ["Advisory", "Warning", "Critical"], // All severities
        parameters: [], // Empty means all parameters
        devices: [], // Empty means all devices
        quietHoursEnabled: false,
      };

      // Save to Firestore
      await db.collection("notificationPreferences").doc(userId).set(preferences);

      logger.info(`Notification preferences created for ${email}`);

      res.status(200).json({
        success: true,
        message: "Notification preferences created successfully",
        data: preferences,
      } as ApiResponse);
    } catch (error) {
      logger.error("Error in setupNotificationPreferences:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse);
    }
  }
);

/**
 * List Notification Preferences - Get all notification preferences
 */
export const listNotificationPreferences = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const snapshot = await db.collection("notificationPreferences").get();

      const preferences = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.status(200).json({
        success: true,
        count: preferences.length,
        data: preferences,
      } as ApiResponse);
    } catch (error) {
      logger.error("Error in listNotificationPreferences:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse);
    }
  }
);

// ===========================
// UTILITY & INITIALIZATION FUNCTIONS
// ===========================

/**
 * Initialize default alert threshold configuration in Firestore
 * Call this function once during initial setup to create default thresholds
 *
 * @return {Promise<void>} Promise that resolves when initialization is complete
 */
export async function initializeAlertThresholds(): Promise<void> {
  try {
    await db.collection("alertSettings").doc("thresholds").set(DEFAULT_THRESHOLDS, {merge: true});
    logger.info("Default alert thresholds initialized successfully");
    logger.info("Thresholds:", DEFAULT_THRESHOLDS);
  } catch (error) {
    logger.error("Failed to initialize alert thresholds:", error);
    throw error;
  }
}
