/**
 * Email Template Utilities
 * Functions for sending real-time alert email notifications
 *
 * @module utils/emailTemplates
 *
 * This module provides the interface for sending immediate alert notifications
 * when sensor thresholds are exceeded. It integrates with the centralized
 * email service to send real-time alerts to subscribed users.
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
