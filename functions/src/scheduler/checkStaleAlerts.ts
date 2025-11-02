/**
 * Stale Alerts Scheduler
 * Monitors unresolved critical alerts and sends email notifications
 * to admins and staff based on their notification preferences
 *
 * @module scheduler/checkStaleAlerts
 *
 * Features:
 * - Runs every hour to check for stale critical alerts (>2 hours old)
 * - Queries notification preferences to determine recipients
 * - Sends personalized email notifications to subscribed users
 * - Respects quiet hours settings
 * - Logs comprehensive monitoring data
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { sendStaleAlertEmail } from "../config/email";
import type { StaleAlertEmailData } from "../config/email";
import { db } from "../config/firebase";
import {
  COLLECTIONS,
  STALE_ALERT_THRESHOLD_MS,
  SCHEDULER_CONFIG,
  SCHEDULER_ERRORS,
  SCHEDULER_MESSAGES,
} from "../constants";
import type { WaterQualityAlert, NotificationPreferences, Device } from "../types";

/**
 * Stale alert with device information
 */
interface StaleAlertInfo {
  alertId: string;
  deviceId: string;
  deviceName?: string;
  parameter: string;
  value: number;
  severity: string;
  createdAt: Date;
  hoursStale: number;
}

/**
 * Check if current time is within user's quiet hours
 *
 * @param {*} preferences - User notification preferences
 * @return {boolean} true if within quiet hours, false otherwise
 */
function isWithinQuietHours(preferences: NotificationPreferences): boolean {
  if (
    !preferences.quietHoursEnabled ||
    !preferences.quietHoursStart ||
    !preferences.quietHoursEnd
  ) {
    return false;
  }

  const now = new Date();
  const currentTime = now.toLocaleTimeString("en-US", {
    timeZone: SCHEDULER_CONFIG.TIMEZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const { quietHoursStart, quietHoursEnd } = preferences;

  // Handle quiet hours spanning midnight
  if (quietHoursStart <= quietHoursEnd) {
    return currentTime >= quietHoursStart && currentTime <= quietHoursEnd;
  } else {
    return currentTime >= quietHoursStart || currentTime <= quietHoursEnd;
  }
}

/**
 * Check if user should receive notifications for given alerts
 *
 * @param {*} preferences - User notification preferences
 * @param {*} alerts - Array of stale alerts
 * @return {boolean} true if user should be notified, false otherwise
 */
function shouldNotifyUser(preferences: NotificationPreferences, alerts: StaleAlertInfo[]): boolean {
  // Check if email notifications are enabled
  if (!preferences.emailNotifications) {
    return false;
  }

  // Check quiet hours
  if (isWithinQuietHours(preferences)) {
    logger.info(`User ${preferences.userId} is in quiet hours, skipping notification`);
    return false;
  }

  // Check if user has severity filters
  if (preferences.alertSeverities && preferences.alertSeverities.length > 0) {
    const hasMatchingSeverity = alerts.some((alert) =>
      preferences.alertSeverities.includes(alert.severity)
    );
    if (!hasMatchingSeverity) {
      return false;
    }
  }

  // Check if user has parameter filters
  if (preferences.parameters && preferences.parameters.length > 0) {
    const hasMatchingParameter = alerts.some((alert) =>
      preferences.parameters.includes(alert.parameter.toLowerCase())
    );
    if (!hasMatchingParameter) {
      return false;
    }
  }

  // Check if user has device filters
  if (preferences.devices && preferences.devices.length > 0) {
    const hasMatchingDevice = alerts.some((alert) => preferences.devices.includes(alert.deviceId));
    if (!hasMatchingDevice) {
      return false;
    }
  }

  return true;
}

/**
 * Filter alerts based on user preferences
 *
 * @param {*} preferences - User notification preferences
 * @param {*} alerts - Array of stale alerts
 * @return {StaleAlertInfo[]} Filtered array of alerts matching user preferences
 */
function filterAlertsForUser(
  preferences: NotificationPreferences,
  alerts: StaleAlertInfo[]
): StaleAlertInfo[] {
  let filtered = [...alerts];

  // Filter by severity
  if (preferences.alertSeverities && preferences.alertSeverities.length > 0) {
    filtered = filtered.filter((alert) => preferences.alertSeverities.includes(alert.severity));
  }

  // Filter by parameter
  if (preferences.parameters && preferences.parameters.length > 0) {
    filtered = filtered.filter((alert) =>
      preferences.parameters.includes(alert.parameter.toLowerCase())
    );
  }

  // Filter by device
  if (preferences.devices && preferences.devices.length > 0) {
    filtered = filtered.filter((alert) => preferences.devices.includes(alert.deviceId));
  }

  return filtered;
}

/**
 * Check Stale Alerts Scheduler
 *
 * Runs every hour to:
 * 1. Find critical alerts older than 2 hours that are still Active
 * 2. Query notification preferences for eligible users
 * 3. Send personalized email notifications
 * 4. Log monitoring data
 *
 * Business Rules:
 * - Only sends to users with emailNotifications enabled
 * - Respects quiet hours settings
 * - Filters alerts based on user preferences (severity, parameter, device)
 * - Sends personalized emails with only relevant alerts
 */
export const checkStaleAlerts = onSchedule(
  {
    schedule: SCHEDULER_CONFIG.STALE_ALERT_SCHEDULE,
    timeZone: SCHEDULER_CONFIG.TIMEZONE,
    retryCount: SCHEDULER_CONFIG.RETRY_COUNT,
  },
  async () => {
    logger.info("Starting stale alerts check...");

    try {
      const thresholdTime = Date.now() - STALE_ALERT_THRESHOLD_MS;

      // ===================================
      // 1. FETCH STALE CRITICAL ALERTS
      // ===================================
      const staleAlertsSnapshot = await db
        .collection(COLLECTIONS.ALERTS)
        .where("status", "==", "Active")
        .where("severity", "==", "Critical")
        .get();

      if (staleAlertsSnapshot.empty) {
        logger.info(SCHEDULER_MESSAGES.NO_STALE_ALERTS);
        return;
      }

      // Filter by time threshold and collect stale alerts
      const staleAlerts: StaleAlertInfo[] = [];
      const deviceIds = new Set<string>();

      for (const doc of staleAlertsSnapshot.docs) {
        const alert = doc.data() as WaterQualityAlert;
        const createdAt = (alert.createdAt as admin.firestore.Timestamp).toMillis();

        if (createdAt < thresholdTime) {
          const hoursStale = (Date.now() - createdAt) / (60 * 60 * 1000);

          staleAlerts.push({
            alertId: doc.id,
            deviceId: alert.deviceId,
            parameter: alert.parameter,
            value: alert.currentValue,
            severity: alert.severity,
            createdAt: new Date(createdAt),
            hoursStale,
          });

          deviceIds.add(alert.deviceId);

          logger.warn(
            `Stale critical alert: ${doc.id} - Device: ${alert.deviceId}, ` +
              `Parameter: ${alert.parameter}, Age: ${hoursStale.toFixed(1)} hours`
          );
        }
      }

      if (staleAlerts.length === 0) {
        logger.info(SCHEDULER_MESSAGES.NO_STALE_ALERTS);
        return;
      }

      logger.warn(`Found ${staleAlerts.length} stale critical alert(s) requiring attention`);

      // ===================================
      // 2. FETCH DEVICE INFORMATION
      // ===================================
      const deviceMap = new Map<string, Device>();

      if (deviceIds.size > 0) {
        try {
          const devicesSnapshot = await db
            .collection(COLLECTIONS.DEVICES)
            .where("deviceId", "in", Array.from(deviceIds))
            .get();

          devicesSnapshot.docs.forEach((doc) => {
            const device = doc.data() as Device;
            deviceMap.set(device.deviceId, device);
          });
        } catch (error) {
          logger.error(SCHEDULER_ERRORS.FETCH_DEVICES_FAILED, error);
          // Continue without device names
        }
      }

      // Enrich alerts with device names
      staleAlerts.forEach((alert) => {
        const device = deviceMap.get(alert.deviceId);
        if (device && device.name) {
          alert.deviceName = device.name;
        }
      });

      // ===================================
      // 3. FETCH NOTIFICATION PREFERENCES
      // ===================================
      const preferencesSnapshot = await db.collection(COLLECTIONS.NOTIFICATION_PREFERENCES).get();

      if (preferencesSnapshot.empty) {
        logger.warn("No notification preferences found - no emails will be sent");
        return;
      }

      // ===================================
      // 4. FETCH USER DATA
      // ===================================
      const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
      const userMap = new Map<string, { firstname: string; lastname: string; role: string }>();

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        userMap.set(doc.id, {
          firstname: userData.firstname || "User",
          lastname: userData.lastname || "",
          role: userData.role || "Staff",
        });
      });

      // ===================================
      // 5. SEND NOTIFICATIONS
      // ===================================
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const prefDoc of preferencesSnapshot.docs) {
        const preferences = prefDoc.data() as NotificationPreferences;

        // Check if user should receive notifications
        if (!shouldNotifyUser(preferences, staleAlerts)) {
          logger.info(`Skipping notification for user ${preferences.userId} (filters not met)`);
          continue;
        }

        // Filter alerts based on user preferences
        const filteredAlerts = filterAlertsForUser(preferences, staleAlerts);

        if (filteredAlerts.length === 0) {
          logger.info(`No matching alerts for user ${preferences.userId} after filtering`);
          continue;
        }

        // Get user name
        const user = userMap.get(preferences.userId);
        const recipientName = user ? `${user.firstname} ${user.lastname}`.trim() : "Team Member";

        // Prepare email data
        const emailData: StaleAlertEmailData = {
          recipientEmail: preferences.email,
          recipientName,
          staleAlerts: filteredAlerts,
          totalCount: filteredAlerts.length,
        };

        // Send email
        try {
          await sendStaleAlertEmail(emailData);
          emailsSent++;
          logger.info(
            `Sent stale alert email to ${preferences.email} ` + `(${filteredAlerts.length} alerts)`
          );
        } catch (error) {
          emailsFailed++;
          logger.error(`Failed to send stale alert email to ${preferences.email}:`, error);
          // Continue with other recipients
        }
      }

      // ===================================
      // 6. LOG SUMMARY
      // ===================================
      logger.info(
        "Stale alerts check completed: " +
          `${staleAlerts.length} stale alerts, ` +
          `${emailsSent} emails sent, ` +
          `${emailsFailed} emails failed`
      );

      if (emailsSent > 0) {
        logger.info(SCHEDULER_MESSAGES.STALE_ALERTS_DETECTED);
      }
    } catch (error) {
      logger.error("Error checking stale alerts:", error);
      throw error; // Allow retry
    }
  }
);
