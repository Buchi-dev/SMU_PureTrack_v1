/**
 * Email Notifications
 * Unified module for sending all types of email notifications
 *
 * @module utils/emailNotifications
 *
 * This module provides high-level interfaces for sending email notifications
 * in the water quality monitoring system. It handles the business logic of
 * transforming application data into email-ready formats, then delegates to
 * the centralized email service for actual sending.
 *
 * Notification Types:
 * - Real-time alerts (threshold violations, trends)
 * - Analytics reports (daily, weekly, monthly)
 *
 * Features:
 * - Data transformation and formatting
 * - Template data preparation
 * - Error handling with boolean returns
 * - Consistent logging with prefixes
 */

import {logger} from "firebase-functions/v2";

import type {WaterQualityAlert} from "../types/Alert.Types";
import type {NotificationPreferences} from "../types/User.Types";

/**
 * Send real-time email notification for an alert
 *
 * This function is called by processSensorData when a threshold violation
 * or trend alert is detected. It sends an immediate email notification
 * to the recipient using the realTimeAlert.html template.
 *
 * @param {NotificationPreferences} recipient - Notification recipient preferences
 * @param {Record<string, unknown>} alert - Alert data object
 * @return {Promise<boolean>} true if email sent successfully, false otherwise
 *
 * @example
 * const success = await sendEmailNotification(recipient, alertData);
 * if (!success) {
 *   logger.error('Failed to send notification');
 * }
 */
export async function sendEmailNotification(
  recipient: NotificationPreferences,
  alert: Record<string, unknown>
): Promise<boolean> {
  try {
    // Extract alert data with type safety
    const alertData = alert as unknown as WaterQualityAlert;

    logger.info(
      `[Real-Time Alert] Preparing ${alertData.severity} alert email for ${recipient.email} (Alert: ${alertData.alertId})`
    );

    // Dynamically import email service helpers to avoid circular dependencies
    const {
      sendEmail,
      getSeverityColor,
      getAlertBoxBackground,
      getParameterUnit,
      getParameterDisplayName,
      formatEmailTimestamp,
    } = await import("./emailService");

    // Get recipient name
    const recipientName = recipient.userId || "User";

    // Get severity color and alert box background
    const severityColor = getSeverityColor(alertData.severity);
    const alertBoxBg = getAlertBoxBackground(alertData.severity);

    // Get parameter info
    const parameterDisplay = getParameterDisplayName(alertData.parameter);
    const unit = getParameterUnit(alertData.parameter);

    // Format values
    const currentValue = alertData.currentValue.toFixed(2);
    const thresholdValue = alertData.thresholdValue ? alertData.thresholdValue.toFixed(2) : "N/A";

    // Determine threshold label based on alert type
    const thresholdLabel =
      alertData.alertType === "threshold" ? "Threshold Value" : "Reference Value";

    // Format timestamp
    const timestamp = formatEmailTimestamp(
      alertData.createdAt.toDate ? alertData.createdAt.toDate() : new Date(),
      "Asia/Manila"
    );

    // Build device location section if available
    let deviceLocation = "";
    if (alertData.deviceBuilding || alertData.deviceFloor) {
      const building = alertData.deviceBuilding || "Unknown";
      const floor = alertData.deviceFloor || "Unknown";
      deviceLocation = `
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0; color: #6b7280; font-size: 13px;"><strong>📍 Location:</strong></p>
          <p style="margin: 4px 0 0 0; color: #111827; font-size: 14px;">
            Building: ${building} • Floor: ${floor}
          </p>
        </div>
      `;
    }

    // Dashboard URL
    const dashboardUrl = `${process.env.APP_URL || "https://my-app-da540.web.app"}/dashboard/alerts/${alertData.alertId}`;

    // Prepare template data
    const templateData = {
      recipientName,
      severity: alertData.severity,
      severityColor,
      alertBoxBg,
      deviceName: alertData.deviceName || alertData.deviceId,
      deviceId: alertData.deviceId,
      alertMessage: alertData.message,
      parameterDisplay,
      alertType: alertData.alertType === "threshold" ? "Threshold Violation" : "Trend Alert",
      currentValue,
      thresholdValue,
      thresholdLabel,
      unit,
      recommendedAction: alertData.recommendedAction,
      deviceLocation,
      dashboardUrl,
      alertId: alertData.alertId,
      timestamp,
    };

    // Send email using centralized service
    await sendEmail({
      to: recipient.email,
      subject: `🚨 ${alertData.severity} Alert: ${parameterDisplay} - ${alertData.deviceName || alertData.deviceId}`,
      templateName: "realTimeAlert",
      templateData,
      fromName: "Water Quality Alert System",
    });

    logger.info(
      `[Real-Time Alert] Successfully sent email to ${recipient.email} for alert ${alertData.alertId}`
    );
    return true;
  } catch (error) {
    logger.error(
      `[Real-Time Alert] Failed to send email to ${recipient.email}:`,
      error
    );
    return false;
  }
}

/**
 * Analytics email data interface
 */
interface AnalyticsEmailData {
  recipientEmail: string;
  recipientName: string;
  reportType: "daily" | "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  deviceSummary: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    healthScore: number;
  };
  alertCounts: {
    Critical: number;
    Warning: number;
    Advisory: number;
    total: number;
  };
  topDevices: Array<{
    deviceId: string;
    name: string;
    status: string;
    uptime: number;
    latestReading?: {
      ph?: number;
      tds?: number;
      turbidity?: number;
    };
  }>;
  recentAlerts: Array<{
    id: string;
    severity: string;
    deviceName?: string;
    parameter: string;
    value: number;
    createdAt: Date;
  }>;
}

/**
 * Send analytics report email notification
 *
 * This function is called by schedulers to send periodic analytics reports.
 * It transforms analytics data into email format and sends via the centralized
 * email service using the analytics.html template.
 *
 * @param {AnalyticsEmailData} data - Analytics report data
 * @return {Promise<boolean>} true if email sent successfully, false otherwise
 *
 * @example
 * const success = await sendAnalyticsNotification({
 *   recipientEmail: 'admin@example.com',
 *   recipientName: 'John Doe',
 *   reportType: 'daily',
 *   ...analyticsData
 * });
 */
export async function sendAnalyticsNotification(
  data: AnalyticsEmailData
): Promise<boolean> {
  try {
    const {
      recipientEmail,
      recipientName,
      reportType,
      periodStart,
      periodEnd,
      deviceSummary,
      alertCounts,
      topDevices,
      recentAlerts,
    } = data;

    logger.info(
      `[Analytics Notification] Preparing ${reportType} report for ${recipientEmail}`
    );

    // Dynamically import email service helpers
    const {
      sendEmail,
      getSeverityColor,
      getHealthScoreColor,
      formatEmailTimestamp,
    } = await import("./emailService");

    // Build report metadata
    const reportTitle = reportType.charAt(0).toUpperCase() + reportType.slice(1);
    const periodText =
      reportType === "daily" ?
        "Last 24 Hours" :
        reportType === "weekly" ?
          "Last 7 Days" :
          "Last 30 Days";

    // Generate device rows HTML
    const deviceRows = topDevices
      .slice(0, 5)
      .map(
        (device) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${device.name}
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        <span style="color: ${device.status === "online" ? "#10b981" : "#ef4444"}; font-weight: 600;">
          ${device.status.toUpperCase()}
        </span>
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${device.uptime}%
      </td>
      <td style="padding: 12px;">
        ${
  device.latestReading ?
    `pH: ${device.latestReading.ph?.toFixed(1) || "N/A"} | 
           TDS: ${device.latestReading.tds?.toFixed(0) || "N/A"} | 
           Turb: ${device.latestReading.turbidity?.toFixed(1) || "N/A"}` :
    "No data"
}
      </td>
    </tr>
  `
      )
      .join("");

    // Generate alert rows HTML
    const alertRows = recentAlerts
      .slice(0, 10)
      .map(
        (alert) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; 
          background: ${getSeverityColor(alert.severity)}; color: white; font-size: 11px; font-weight: 600;">
          ${alert.severity}
        </span>
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.deviceName || "Unknown"}
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.parameter.toUpperCase()}
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.value.toFixed(2)}
      </td>
      <td style="padding: 12px;">
        ${alert.createdAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  })}
      </td>
    </tr>
  `
      )
      .join("");

    // Generate device table section
    const deviceTable = topDevices.length > 0 ?
      `
      <div style="margin: 25px 0;">
        <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">
          🏆 Top Devices Status
        </h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 4px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Device</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Status</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Uptime</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Latest Readings</th>
            </tr>
          </thead>
          <tbody>
            ${deviceRows}
          </tbody>
        </table>
      </div>
      ` :
      "";

    // Generate alert table section
    const alertTable = recentAlerts.length > 0 ?
      `
      <div style="margin: 25px 0;">
        <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">
          🚨 Recent Alerts
        </h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 4px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Severity</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Device</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Parameter</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Value</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Time</th>
            </tr>
          </thead>
          <tbody>
            ${alertRows}
          </tbody>
        </table>
      </div>
      ` :
      `
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #166534; margin: 0; font-weight: 600;">
          ✅ No alerts during this period - System running smoothly!
        </p>
      </div>
      `;

    // Prepare template data
    const templateData = {
      recipientName,
      reportTitle,
      reportType,
      periodText,
      periodTextLower: periodText.toLowerCase(),
      periodRange: `${periodStart.toLocaleDateString("en-US", {timeZone: "Asia/Manila"})} - ${periodEnd.toLocaleDateString("en-US", {timeZone: "Asia/Manila"})}`,
      totalDevices: deviceSummary.totalDevices,
      onlineDevices: deviceSummary.onlineDevices,
      offlineDevices: deviceSummary.offlineDevices,
      healthScore: deviceSummary.healthScore,
      healthScoreColor: getHealthScoreColor(deviceSummary.healthScore),
      criticalCount: alertCounts.Critical,
      warningCount: alertCounts.Warning,
      advisoryCount: alertCounts.Advisory,
      totalAlerts: alertCounts.total,
      alertSummaryBg: alertCounts.Critical > 0 ? "#fef2f2" : "#f0fdf4",
      alertSummaryBorder: alertCounts.Critical > 0 ? "#dc2626" : "#10b981",
      deviceTable,
      alertTable,
      dashboardUrl: `${process.env.APP_URL || "https://my-app-da540.web.app"}/dashboard`,
      timestamp: formatEmailTimestamp(new Date(), "Asia/Manila"),
    };

    // Send email using centralized service
    await sendEmail({
      to: recipientEmail,
      subject: `📊 ${reportTitle} Analytics Report - ${periodText}`,
      templateName: "analytics",
      templateData,
      fromName: "Water Quality Analytics",
    });

    logger.info(
      `[Analytics Notification] Successfully sent ${reportType} report to ${recipientEmail}`
    );
    return true;
  } catch (error) {
    logger.error(
      `[Analytics Notification] Failed to send to ${data.recipientEmail}:`,
      error
    );
    return false;
  }
}
