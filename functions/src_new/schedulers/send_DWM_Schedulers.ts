/**
 * Unified Analytics Scheduler
 * Sends daily, weekly, and monthly analytics reports at 6:00 AM Manila time
 */

import {logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";

import {
  sendAnalyticsEmail,
  EMAIL_USER_SECRET_REF,
  EMAIL_PASSWORD_SECRET_REF,
  type AnalyticsEmailData,
} from "../config/email";
import {db} from "../config/firebase";
import {
  COLLECTIONS,
  SCHEDULER_CONFIG,
  SCHEDULER_MESSAGES,
  ANALYTICS_PERIODS,
} from "../constants";
import type {NotificationPreferences, WaterQualityAlert} from "../types";

/**
 * Get device status summary
 * @return {Promise<object>} Device summary with counts and health score
 */
async function getDeviceSummary(): Promise<{
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  healthScore: number;
}> {
  const devicesSnap = await db.collection(COLLECTIONS.DEVICES).get();
  const total = devicesSnap.size;
  const online = devicesSnap.docs.filter((d) => d.data().status === "online").length;
  return {
    totalDevices: total,
    onlineDevices: online,
    offlineDevices: total - online,
    healthScore: total > 0 ? parseFloat(((online / total) * 100).toFixed(1)) : 0,
  };
}

/**
 * Count alerts by severity within date range
 * @param {number} start - Start timestamp
 * @param {number} end - End timestamp
 * @return {Promise<object>} Alert counts by severity
 */
async function getAlertCounts(start: number, end: number): Promise<{
  Critical: number;
  Warning: number;
  Advisory: number;
  total: number;
}> {
  const alertsSnap = await db
    .collection(COLLECTIONS.ALERTS)
    .where("createdAt", ">=", new Date(start))
    .where("createdAt", "<=", new Date(end))
    .get();

  const counts = {Critical: 0, Warning: 0, Advisory: 0, total: 0};
  alertsSnap.docs.forEach((doc) => {
    const severity = doc.data().severity;
    if (severity === "Critical") counts.Critical++;
    else if (severity === "Warning") counts.Warning++;
    else if (severity === "Advisory") counts.Advisory++;
    counts.total++;
  });
  return counts;
}

/**
 * Get recent alerts within date range
 * @param {number} start - Start timestamp
 * @param {number} limit - Maximum alerts to return
 * @return {Promise<WaterQualityAlert[]>} Array of recent alerts
 */
async function getRecentAlerts(start: number, limit: number): Promise<WaterQualityAlert[]> {
  const alertsSnap = await db
    .collection(COLLECTIONS.ALERTS)
    .where("createdAt", ">=", new Date(start))
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return alertsSnap.docs.map((doc) => doc.data() as WaterQualityAlert);
}

/**
 * Get top devices ordered by last seen
 * @param {number} limit - Maximum devices to return
 * @return {Promise<Array>} Array of device summaries
 */
async function getTopDevices(limit: number): Promise<Array<{
  deviceId: string;
  name: string;
  status: string;
  uptime: number;
  latestReading?: {
    ph?: number;
    tds?: number;
    turbidity?: number;
  };
}>> {
  const devicesSnap = await db
    .collection(COLLECTIONS.DEVICES)
    .orderBy("lastSeen", "desc")
    .limit(limit)
    .get();

  return devicesSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      deviceId: data.deviceId || doc.id,
      name: data.name || "Unknown",
      status: data.status || "offline",
      uptime: 0,
      latestReading: {
        ph: data.latestReading?.ph,
        tds: data.latestReading?.tds,
        turbidity: data.latestReading?.turbidity,
      },
    };
  });
}

export const sendUnifiedAnalytics = onSchedule(
  {
    schedule: "0 6 * * *", // 6:00 AM daily
    timeZone: SCHEDULER_CONFIG.TIMEZONE,
    retryCount: SCHEDULER_CONFIG.RETRY_COUNT,
    secrets: [EMAIL_USER_SECRET_REF, EMAIL_PASSWORD_SECRET_REF],
  },
  async () => {
    logger.info("[UNIFIED][Asia/Manila] Starting unified analytics scheduler...");

    try {
      const now = new Date();
      const day = now.getDate();
      const weekday = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // ===================================
      // 1. DETERMINE REPORT TYPE
      // ===================================
      let reportType: "daily" | "weekly" | "monthly" = "daily";
      let period = ANALYTICS_PERIODS.DAILY;

      if (day === 1) {
        reportType = "monthly";
        period = ANALYTICS_PERIODS.MONTHLY;
      } else if (weekday === 1) {
        // Monday
        reportType = "weekly";
        period = ANALYTICS_PERIODS.WEEKLY;
      }

      const end = Date.now();
      const start = end - period;

      logger.info(
        `[UNIFIED][Asia/Manila] Selected report type: ${reportType.toUpperCase()} (${new Date(
          start
        ).toISOString()} - ${new Date(end).toISOString()})`
      );

      // ===================================
      // 2. FETCH USERS WITH ENABLED ALERTS
      // ===================================
      const subscribedUsersSnapshot = await db
        .collection(COLLECTIONS.USERS)
        .where("notificationPreferences.emailNotifications", "==", true)
        .where("notificationPreferences.sendScheduledAlerts", "==", true)
        .get();

      if (subscribedUsersSnapshot.empty) {
        logger.info("[UNIFIED][Asia/Manila] " + SCHEDULER_MESSAGES.NO_RECIPIENTS);
        return;
      }

      logger.info(
        `[UNIFIED][Asia/Manila] Found ${subscribedUsersSnapshot.size} users subscribed to ${reportType} analytics`
      );

      // ===================================
      // 3. GENERATE ANALYTICS DATA
      // ===================================
      logger.info("[UNIFIED][Asia/Manila] Generating analytics data...");

      const deviceSummary = await getDeviceSummary();
      const alertCounts = await getAlertCounts(start, end);
      const recentAlerts = await getRecentAlerts(start, 10);
      const topDevices = await getTopDevices(5);

      logger.info(
        `[UNIFIED][Asia/Manila] Generated ${reportType} analytics: ` +
          `${deviceSummary.totalDevices} devices, ${alertCounts.total} alerts`
      );

      // ===================================
      // 4. SEND REPORTS TO EACH USER
      // ===================================
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const userDoc of subscribedUsersSnapshot.docs) {
        const userData = userDoc.data() as FirebaseFirestore.DocumentData & {
          notificationPreferences?: NotificationPreferences;
        };

        const rawPreferences = userData.notificationPreferences;
        if (!rawPreferences) {
          logger.warn(
            `[UNIFIED][Asia/Manila] User ${userDoc.id} has no notificationPreferences field`
          );
          continue;
        }

        const preferences: NotificationPreferences = {
          ...rawPreferences,
          userId: rawPreferences.userId ?? userDoc.id,
        };

        if (!preferences.email) {
          logger.warn(
            `[UNIFIED][Asia/Manila] Skipping user ${preferences.userId} due to missing email`
          );
          continue;
        }

        const firstName = (userData.firstname as string) || "User";
        const lastName = (userData.lastname as string) || "";
        const recipientName = `${firstName} ${lastName}`.trim() || "Team Member";

        const emailData: AnalyticsEmailData = {
          recipientEmail: preferences.email,
          recipientName,
          reportType,
          periodStart: new Date(start),
          periodEnd: new Date(end),
          deviceSummary,
          alertCounts,
          topDevices,
          recentAlerts: recentAlerts.map((alert) => ({
            id: alert.alertId || "",
            severity: alert.severity,
            deviceName: alert.deviceName,
            parameter: alert.parameter,
            value: alert.currentValue,
            createdAt:
              alert.createdAt instanceof Date ?
                alert.createdAt :
                new Date(alert.createdAt.toMillis()),
          })),
        };

        try {
          await sendAnalyticsEmail(emailData);
          emailsSent++;
          logger.info(
            `[UNIFIED][Asia/Manila] Sent ${reportType} analytics to ${preferences.email}`
          );
        } catch (error) {
          emailsFailed++;
          logger.error(
            `[UNIFIED][Asia/Manila] Failed to send ${reportType} analytics to ${preferences.email}:`,
            error
          );
        }
      }

      // ===================================
      // 5. LOG SUMMARY
      // ===================================
      logger.info(
        `[UNIFIED][Asia/Manila] ${reportType.toUpperCase()} analytics completed: ` +
          `${emailsSent} emails sent, ${emailsFailed} failed`
      );

      if (emailsSent > 0) {
        logger.info("[UNIFIED][Asia/Manila] " + SCHEDULER_MESSAGES.ANALYTICS_COMPLETE);
      }
    } catch (error) {
      logger.error("[UNIFIED][Asia/Manila] Error in unified analytics scheduler:", error);
      throw error; // Allow retry
    }
  }
);
