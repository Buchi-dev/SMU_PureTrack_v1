import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";
import type {
  WaterParameter,
  AlertSeverity,
  AlertType,
  TrendDirection,
  AlertThresholds,
  SensorReading,
  WaterQualityAlert,
  NotificationPreferences,
} from "../types";
import {DEFAULT_THRESHOLDS} from "../config/alerts";
import {db, rtdb} from "../config/firebase";

/**
 * Get parameter unit string
 * @param {WaterParameter} parameter - Water parameter name
 * @return {string} Unit string for the parameter
 */
export function getParameterUnit(parameter: WaterParameter): string {
  switch (parameter) {
  case "tds":
    return "ppm";
  case "ph":
    return "";
  case "turbidity":
    return "NTU";
  default:
    return "";
  }
}

/**
 * Get parameter display name
 * @param {WaterParameter} parameter - Water parameter name
 * @return {string} Display name for the parameter
 */
export function getParameterName(parameter: WaterParameter): string {
  switch (parameter) {
  case "tds":
    return "TDS (Total Dissolved Solids)";
  case "ph":
    return "pH Level";
  case "turbidity":
    return "Turbidity";
  default:
    return parameter;
  }
}

/**
 * Get current threshold configuration from Firestore
 */
export async function getThresholdConfig(): Promise<AlertThresholds> {
  try {
    const configDoc = await db.collection("alertSettings").doc("thresholds").get();

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
 * @param {WaterParameter} parameter - Water parameter name
 * @param {number} value - Current sensor value
 * @param {AlertThresholds} thresholds - Threshold configuration
 * @return {object} Threshold check result
 */
export function checkThreshold(
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
 * @param {string} deviceId - Device ID
 * @param {WaterParameter} parameter - Water parameter name
 * @param {number} currentValue - Current sensor value
 * @param {AlertThresholds} thresholds - Threshold configuration
 * @return {Promise<object | null>} Trend analysis result or null
 */
export async function analyzeTrend(
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
 * @param {WaterParameter} parameter - Water parameter name
 * @param {number} value - Current sensor value
 * @param {AlertSeverity} severity - Alert severity level
 * @param {AlertType} alertType - Type of alert
 * @param {TrendDirection} [trendDirection] - Optional trend direction
 * @param {object} [location] - Optional location data
 * @return {object} Alert message and recommended action
 */
export function generateAlertContent(
  parameter: WaterParameter,
  value: number,
  severity: AlertSeverity,
  alertType: AlertType,
  trendDirection?: TrendDirection,
  location?: {building?: string; floor?: string}
): {message: string; recommendedAction: string} {
  const paramName = getParameterName(parameter);
  const unit = getParameterUnit(parameter);
  const valueStr = `${value.toFixed(2)}${unit ? " " + unit : ""}`;

  const locationPrefix =
    location?.building && location?.floor ?
      `[${location.building}, ${location.floor}] ` :
      location?.building ? `[${location.building}] ` : "";

  let message = "";
  let recommendedAction = "";

  if (alertType === "threshold") {
    const severityText = severity.toLowerCase();
    message = `${locationPrefix}${paramName} has reached ${severityText} level: ${valueStr}`;

    const locContext =
      location?.building && location?.floor ?
        ` at ${location.building}, ${location.floor}` :
        location?.building ? ` at ${location.building}` : "";

    switch (severity) {
    case "Critical":
      recommendedAction =
          "Immediate action required" +
          locContext +
          ". " +
          "Investigate water source and treatment system. " +
          "Consider temporary shutdown if necessary.";
      break;
    case "Warning":
      recommendedAction =
          "Monitor closely" +
          locContext +
          " and prepare " +
          "corrective actions. Schedule system inspection within 24 hours.";
      break;
    case "Advisory":
      recommendedAction =
          "Continue monitoring" + locContext + ". " + "Note for regular maintenance schedule.";
      break;
    }
  } else if (alertType === "trend") {
    const direction = trendDirection === "increasing" ? "increasing" : "decreasing";
    message = `${locationPrefix}${paramName} is ${direction} abnormally: ${valueStr}`;

    const locContext =
      location?.building && location?.floor ?
        ` at ${location.building}, ${location.floor}` :
        location?.building ? ` at ${location.building}` : "";

    recommendedAction =
      "Investigate cause of " +
      direction +
      " trend" +
      locContext +
      ". Check system calibration and recent changes " +
      "to water source or treatment.";
  }

  return {message, recommendedAction};
}

/**
 * Create alert in Firestore
 * @param {string} deviceId - Device ID
 * @param {WaterParameter} parameter - Water parameter name
 * @param {AlertType} alertType - Type of alert
 * @param {AlertSeverity} severity - Alert severity level
 * @param {number} currentValue - Current sensor value
 * @param {number | null} thresholdValue - Threshold value that was exceeded
 * @param {TrendDirection} [trendDirection] - Optional trend direction
 * @param {object} [metadata] - Optional metadata
 * @return {Promise<string>} Created alert ID
 */
export async function createAlert(
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
  const deviceLocation: {building?: string; floor?: string} = {};

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
    parameter,
    currentValue,
    severity,
    alertType,
    trendDirection,
    deviceLocation
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
 * @param {Partial<WaterQualityAlert>} alert - Alert data
 * @return {Promise<NotificationPreferences[]>} Array of notification recipients
 */
export async function getNotificationRecipients(
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
 * Calculate device uptime based on last seen timestamp
 * @param {number} lastSeenTimestamp - Last seen timestamp in milliseconds
 * @return {string} Human-readable uptime string
 */
export function calculateUptime(lastSeenTimestamp: number): string {
  const now = Date.now();
  const diff = now - lastSeenTimestamp;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  return hours < 1 ? "< 1 hour" : `${hours} hours ago`;
}

/**
 * Calculate statistical metrics for a dataset
 * @param {number[]} data - Array of numeric data
 * @return {Record<string, number>} Statistical metrics
 */
export function calculateStatistics(data: number[]): Record<string, number> {
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
 * @return {Record<string, string>} Trend direction for each parameter
 */
export function calculateTrends(readings: SensorReading[]): Record<string, string> {
  if (readings.length < 20) return {turbidity: "stable", tds: "stable", ph: "stable"};

  const recent = readings.slice(-10);
  const older = readings.slice(-20, -10);

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
 * Calculate data completeness percentage
 * @param {number} totalReadings - Total number of readings received
 * @param {number} start - Start timestamp
 * @param {number} end - End timestamp
 * @return {string} Data completeness percentage
 */
export function calculateDataCompleteness(
  totalReadings: number,
  start: number,
  end: number
): string {
  const expectedReadings = Math.floor((end - start) / (5 * 60 * 1000)); // Every 5 minutes
  const completeness = (totalReadings / expectedReadings) * 100;
  return `${Math.min(completeness, 100).toFixed(1)}%`;
}
