/**
 * Alert Helper Utilities
 * Functions for creating and managing water quality alerts
 *
 * @module utils/alertHelpers
 *
 * Purpose: Centralize alert creation and notification logic
 * Used by: processSensorData, alertManagement
 */

import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";

import {db} from "../config/firebase";
import {COLLECTIONS} from "../constants/database.constants";
import type {
  WaterParameter,
  AlertSeverity,
  AlertType,
  TrendDirection,
  WaterQualityAlert,
} from "../types/Alert.Types";
import type {NotificationPreferences} from "../types/User.Types";

import {getParameterName, getParameterUnit} from "./thresholdHelpers";

/**
 * Device location information
 */
export interface DeviceLocation {
  building?: string;
  floor?: string;
}

/**
 * Alert content (message and recommended action)
 */
export interface AlertContent {
  message: string;
  recommendedAction: string;
}

/**
 * Generate alert message and recommended action based on alert parameters
 *
 * Algorithm:
 * 1. Format location prefix if available
 * 2. Generate message based on alert type (threshold vs trend)
 * 3. Generate recommended action based on severity
 *
 * @param {*} parameter - Water parameter that triggered the alert
 * @param {*} value - Current sensor value
 * @param {*} severity - Alert severity level
 * @param {*} alertType - Type of alert (threshold or trend)
 * @param {*} trendDirection - Optional trend direction for trend alerts
 * @param {*} location - Optional device location information
 * @return {AlertContent} Alert content with message and recommended action
 *
 * @example
 * const content = generateAlertContent(
 *   'ph', 9.2, 'Critical', 'threshold',
 *   undefined, { building: 'Main Lab', floor: 'Floor 2' }
 * );
 * // content.message: "[Main Lab, Floor 2] pH Level has reached critical level: 9.2"
 * // content.recommendedAction: "Immediate action required..."
 */
export function generateAlertContent(
  parameter: WaterParameter,
  value: number,
  severity: AlertSeverity,
  alertType: AlertType,
  trendDirection?: TrendDirection,
  location?: DeviceLocation
): AlertContent {
  const paramName = getParameterName(parameter);
  const unit = getParameterUnit(parameter);
  const valueStr = `${value.toFixed(2)}${unit ? " " + unit : ""}`;

  // Format location prefix for message
  const locationPrefix =
    location?.building && location?.floor ?
      `[${location.building}, ${location.floor}] ` :
      location?.building ?
        `[${location.building}] ` :
        "";

  // Format location context for recommended action
  const locContext =
    location?.building && location?.floor ?
      ` at ${location.building}, ${location.floor}` :
      location?.building ?
        ` at ${location.building}` :
        "";

  let message = "";
  let recommendedAction = "";

  // Generate content based on alert type
  if (alertType === "threshold") {
    const severityText = severity.toLowerCase();
    message = `${locationPrefix}${paramName} has reached ${severityText} level: ${valueStr}`;

    // Generate action based on severity
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
 * Create water quality alert in Firestore
 *
 * Process:
 * 1. Fetch device information (name, location)
 * 2. Generate alert message and recommended action
 * 3. Create alert document in Firestore
 * 4. Update document with its own ID
 *
 * @param {*} deviceId - Device ID that triggered the alert
 * @param {*} parameter - Water parameter that exceeded threshold
 * @param {*} alertType - Type of alert (threshold or trend)
 * @param {*} severity - Alert severity level
 * @param {*} currentValue - Current sensor reading value
 * @param {*} thresholdValue - Threshold value that was exceeded (null for trend alerts)
 * @param {*} trendDirection - Optional trend direction for trend alerts
 * @param {*} metadata - Optional additional metadata
 * @return {Promise<string>} Promise resolving to created alert ID
 *
 * @example
 * const alertId = await createAlert(
 *   'device123',
 *   'ph',
 *   'threshold',
 *   'Critical',
 *   9.2,
 *   9.0,
 *   undefined,
 *   { location: 'Building A' }
 * );
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
  const deviceLocation: DeviceLocation = {};

  // Fetch device information from Firestore
  try {
    const deviceDoc = await db.collection(COLLECTIONS.DEVICES).doc(deviceId).get();

    if (deviceDoc.exists) {
      const deviceData = deviceDoc.data();
      deviceName = deviceData?.name || deviceId;

      // Extract location information if available
      if (deviceData?.metadata?.location) {
        const location = deviceData.metadata.location;
        if (location.building) deviceLocation.building = location.building;
        if (location.floor) deviceLocation.floor = location.floor;
      }
    }
  } catch (error) {
    logger.warn("Failed to fetch device information:", error);
  }

  // Generate alert message and recommended action
  const {message, recommendedAction} = generateAlertContent(
    parameter,
    currentValue,
    severity,
    alertType,
    trendDirection,
    deviceLocation
  );

  // Prepare alert document data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertData: Record<string, any> = {
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

  // Create alert document
  const alertRef = await db.collection(COLLECTIONS.ALERTS).add(alertData);

  // Update with alert ID
  await alertRef.update({alertId: alertRef.id});

  logger.info(`Alert created: ${alertRef.id}`, {deviceId, parameter, severity});

  return alertRef.id;
}

/**
 * Get users who should be notified for an alert
 *
 * Filtering logic:
 * 1. User must have email notifications enabled
 * 2. Alert severity must match user preferences
 * 3. Alert parameter must match user preferences (if specified)
 * 4. Alert device must match user preferences (if specified)
 * 5. Current time must not be in user's quiet hours
 *
 * @param {*} alert - Alert data to determine recipients for
 * @return {Promise<NotificationPreferences[]>} Promise resolving to array of notification preferences for eligible users
 *
 * @example
 * const recipients = await getNotificationRecipients(alertData);
 * console.log(`Sending to ${recipients.length} users`);
 */
export async function getNotificationRecipients(
  alert: Partial<WaterQualityAlert>
): Promise<NotificationPreferences[]> {
  try {
    // IMPORTANT: notificationPreferences is a SUBCOLLECTION, not a field
    // We need to query all users and then check their subcollections
    const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();

    const recipients: NotificationPreferences[] = [];
    const currentHour = new Date().getHours();

    logger.info(`Checking notification preferences for ${usersSnapshot.size} users`);

    // For each user, query their notificationPreferences subcollection
    for (const userDoc of usersSnapshot.docs) {
      try {
        // Query the notificationPreferences subcollection for this user
        const prefsSnapshot = await userDoc.ref
          .collection(COLLECTIONS.NOTIFICATION_PREFERENCES)
          .where("emailNotifications", "==", true)
          .limit(1)
          .get();

        // If user has no preferences or email notifications disabled, skip
        if (prefsSnapshot.empty) {
          continue;
        }

        // Get the first (and should be only) preference document
        const prefDoc = prefsSnapshot.docs[0];
        const prefs = prefDoc.data() as NotificationPreferences;

        // Ensure required fields exist
        if (!prefs.email) {
          logger.warn(`User ${userDoc.id} has emailNotifications enabled but no email address`);
          continue;
        }

        const preferences: NotificationPreferences = {
          ...prefs,
          userId: prefs.userId ?? userDoc.id,
          alertSeverities: prefs.alertSeverities ?? ["Critical", "Warning", "Advisory"],
          parameters: prefs.parameters ?? [],
          devices: prefs.devices ?? [],
        };

        // Check severity filter
        if (!preferences.alertSeverities.includes(alert.severity!)) {
          logger.debug(`User ${userDoc.id} filtered out: severity mismatch`);
          continue;
        }

        // Check parameter filter (empty array means all parameters)
        if (preferences.parameters.length > 0 && !preferences.parameters.includes(alert.parameter!)) {
          logger.debug(`User ${userDoc.id} filtered out: parameter mismatch`);
          continue;
        }

        // Check device filter (empty array means all devices)
        if (preferences.devices.length > 0 && !preferences.devices.includes(alert.deviceId!)) {
          logger.debug(`User ${userDoc.id} filtered out: device mismatch`);
          continue;
        }

        // Check quiet hours
        if (
          preferences.quietHoursEnabled &&
          preferences.quietHoursStart &&
          preferences.quietHoursEnd
        ) {
          const startHour = parseInt(preferences.quietHoursStart.split(":")[0]);
          const endHour = parseInt(preferences.quietHoursEnd.split(":")[0]);
          if (currentHour >= startHour && currentHour < endHour) {
            logger.debug(`User ${userDoc.id} filtered out: quiet hours active`);
            continue;
          }
        }

        recipients.push(preferences);
        logger.info(`Added recipient: ${preferences.email} (${userDoc.id})`);
      } catch (error) {
        logger.warn(`Error checking preferences for user ${userDoc.id}:`, error);
        // Continue to next user
      }
    }

    logger.info(`Found ${recipients.length} notification recipient(s) for alert`);
    return recipients;
  } catch (error) {
    logger.error("Error fetching notification recipients:", error);
    return [];
  }
}

/**
 * Calculate device uptime based on last seen timestamp
 *
 * @param {*} lastSeenTimestamp - Last seen timestamp in milliseconds
 * @return {string} Human-readable uptime string
 *
 * @example
 * calculateUptime(Date.now() - 3600000) // "1 hours ago"
 * calculateUptime(Date.now() - 1800000) // "< 1 hour"
 */
export function calculateUptime(lastSeenTimestamp: number): string {
  const now = Date.now();
  const diff = now - lastSeenTimestamp;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  return hours < 1 ? "< 1 hour" : `${hours} hours ago`;
}
