/**
 * Analytics Schedulers (Merged)
 * Sends comprehensive analytics reports at scheduled intervals
 * 
 * @module schedulers/sendAnalytics
 * 
 * Features:
 * - Daily reports: Every day at 6:00 PM Manila time (24-hour period)
 * - Weekly reports: Every Monday at 6:00 PM Manila time (7-day period)
 * - Monthly reports: 1st of each month at 6:00 PM Manila time (30-day period)
 * - Respects user notification preferences (sendScheduledAlerts toggle)
 * - Professional HTML emails with device status, alerts, and water quality metrics
 * - Comprehensive logging with period-specific prefixes
 */

import {logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";

import {
  sendAnalyticsEmail,
  EMAIL_USER_SECRET_REF,
  EMAIL_PASSWORD_SECRET_REF,
} from "../config/email";
import type {AnalyticsEmailData} from "../config/email";
import {db} from "../config/firebase";
import {COLLECTIONS, SCHEDULER_CONFIG, SCHEDULER_MESSAGES, ANALYTICS_PERIODS} from "../constants";
import type {NotificationPreferences} from "../types";
import {
  generateDeviceStatusReport,
  getAlertCounts,
  getRecentAlerts,
} from "../utils/analyticsHelpers";

/**
 * Report type for analytics
 */
type ReportType = "daily" | "weekly" | "monthly";

/**
 * Shared Analytics Scheduler Logic
 * 
 * Core function that handles analytics report generation and distribution
 * Used by all three scheduler exports (daily, weekly, monthly)
 * 
 * @param reportType - Type of report: "daily", "weekly", or "monthly"
 * @param period - Time period in milliseconds (from ANALYTICS_PERIODS)
 * @param logPrefix - Prefix for log messages (e.g., "[DAILY]", "[WEEKLY]")
 * 
 * Business Rules:
 * - Only sends to users with sendScheduledAlerts: true
 * - Respects emailNotifications toggle
 * - Generates fresh analytics for the specified period
 * - Logs all activities with period-specific prefix
 * 
 * Email Contents:
 * - System health summary (device counts, health score)
 * - Alert summary by severity
 * - Top 5 devices with status and latest readings
 * - Recent 10 alerts with details
 */
async function sendScheduledAnalytics(
  reportType: ReportType,
  period: number,
  logPrefix: string
): Promise<void> {
  logger.info(`${logPrefix}[Asia/Manila] Starting ${reportType} analytics report generation...`);

  try {
    const end = Date.now();
    const start = end - period;

    // ===================================
    // 1. FETCH NOTIFICATION PREFERENCES
    // ===================================
    // Get users with:
    // - emailNotifications enabled
    // - sendScheduledAlerts enabled
    const subscribedUsersSnapshot = await db
      .collection(COLLECTIONS.USERS)
      .where("notificationPreferences.emailNotifications", "==", true)
      .where("notificationPreferences.sendScheduledAlerts", "==", true)
      .get();

    if (subscribedUsersSnapshot.empty) {
      logger.info(`${logPrefix}[Asia/Manila] ${SCHEDULER_MESSAGES.NO_RECIPIENTS}`);
      return;
    }

    logger.info(
      `${logPrefix}[Asia/Manila] Found ${subscribedUsersSnapshot.size} users subscribed to ${reportType} analytics`
    );

    // ===================================
    // 2. GENERATE ANALYTICS DATA
    // ===================================
    logger.info(`${logPrefix}[Asia/Manila] Generating ${reportType} analytics data...`);

    // Generate device status report
    const deviceReport = await generateDeviceStatusReport();

    // Get alert counts for the period
    const alertCounts = await getAlertCounts(start, end);

    // Get recent alerts
    const recentAlerts = await getRecentAlerts(start, 10);

    // Log analytics summary with period-specific details
    const periodDescription = 
      reportType === "daily" ? "" :
      reportType === "weekly" ? " in past 7 days" :
      " in past 30 days";

    logger.info(
      `${logPrefix}[Asia/Manila] Analytics generated: ` +
        `${deviceReport.summary.totalDevices} devices, ` +
        `${alertCounts.total} alerts (${alertCounts.Critical} critical)${periodDescription}`
    );

    // ===================================
    // 3. SEND REPORTS TO EACH USER
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
          `${logPrefix}[Asia/Manila] User ${userDoc.id} matched preference query but has no notificationPreferences field`
        );
        continue;
      }

      const preferences: NotificationPreferences = {
        ...rawPreferences,
        userId: rawPreferences.userId ?? userDoc.id,
      };

      if (!preferences.email) {
        logger.warn(
          `${logPrefix}[Asia/Manila] Skipping user ${preferences.userId} due to missing notification email`
        );
        continue;
      }

      const firstName = (userData.firstname as string) || "User";
      const lastName = (userData.lastname as string) || "";
      const nameCandidate = `${firstName} ${lastName}`.trim();
      const recipientName = nameCandidate.length > 0 ? nameCandidate : "Team Member";

      // Prepare email data
      const emailData: AnalyticsEmailData = {
        recipientEmail: preferences.email,
        recipientName,
        reportType,
        periodStart: new Date(start),
        periodEnd: new Date(end),
        deviceSummary: deviceReport.summary,
        alertCounts,
        topDevices: deviceReport.devices.slice(0, 5).map((d) => ({
          deviceId: d.deviceId,
          name: d.name,
          status: d.status,
          uptime: d.uptime,
          latestReading: d.latestReading,
        })),
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

      // Send email
      try {
        await sendAnalyticsEmail(emailData);
        emailsSent++;
        logger.info(`${logPrefix}[Asia/Manila] Sent ${reportType} analytics to ${preferences.email}`);
      } catch (error) {
        emailsFailed++;
        logger.error(
          `${logPrefix}[Asia/Manila] Failed to send ${reportType} analytics to ${preferences.email}:`,
          error
        );
        // Continue with other recipients
      }
    }

    // ===================================
    // 4. LOG SUMMARY
    // ===================================
    logger.info(
      `${logPrefix}[Asia/Manila] ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} analytics completed: ` +
        `${emailsSent} emails sent, ` +
        `${emailsFailed} emails failed`
    );

    if (emailsSent > 0) {
      logger.info(`${logPrefix}[Asia/Manila] ${SCHEDULER_MESSAGES.ANALYTICS_COMPLETE}`);
    }
  } catch (error) {
    logger.error(`${logPrefix}[Asia/Manila] Error sending ${reportType} analytics:`, error);
    throw error; // Allow retry
  }
}

// =====================================================
// EXPORTED SCHEDULER FUNCTIONS
// =====================================================

/**
 * Send Daily Analytics Scheduler
 * 
 * Runs every evening at 6:00 PM Manila time
 * Generates and sends 24-hour analytics reports to subscribed users
 * 
 * Schedule: "0 18 * * *" (Daily at 6:00 PM)
 * Period: 24 hours
 */
export const sendDailyAnalytics = onSchedule(
  {
    schedule: "0 18 * * *",
    timeZone: SCHEDULER_CONFIG.TIMEZONE,
    retryCount: SCHEDULER_CONFIG.RETRY_COUNT,
    secrets: [EMAIL_USER_SECRET_REF, EMAIL_PASSWORD_SECRET_REF],
  },
  async () => {
    await sendScheduledAnalytics("daily", ANALYTICS_PERIODS.DAILY, "[DAILY]");
  }
);

/**
 * Send Weekly Analytics Scheduler
 * 
 * Runs every Monday at 6:00 PM Manila time
 * Generates and sends 7-day analytics reports to subscribed users
 * 
 * Schedule: "0 18 * * 1" (Every Monday at 6:00 PM)
 * Period: 7 days
 */
export const sendWeeklyAnalytics = onSchedule(
  {
    schedule: "0 18 * * 1",
    timeZone: SCHEDULER_CONFIG.TIMEZONE,
    retryCount: SCHEDULER_CONFIG.RETRY_COUNT,
    secrets: [EMAIL_USER_SECRET_REF, EMAIL_PASSWORD_SECRET_REF],
  },
  async () => {
    await sendScheduledAnalytics("weekly", ANALYTICS_PERIODS.WEEKLY, "[WEEKLY]");
  }
);

/**
 * Send Monthly Analytics Scheduler
 * 
 * Runs on 1st of every month at 6:00 PM Manila time
 * Generates and sends 30-day analytics reports to subscribed users
 * 
 * Schedule: "0 18 1 * *" (1st of month at 6:00 PM)
 * Period: 30 days
 */
export const sendMonthlyAnalytics = onSchedule(
  {
    schedule: "0 18 1 * *",
    timeZone: SCHEDULER_CONFIG.TIMEZONE,
    retryCount: SCHEDULER_CONFIG.RETRY_COUNT,
    secrets: [EMAIL_USER_SECRET_REF, EMAIL_PASSWORD_SECRET_REF],
  },
  async () => {
    await sendScheduledAnalytics("monthly", ANALYTICS_PERIODS.MONTHLY, "[MONTHLY]");
  }
);
