/**
 * Email Configuration
 * Nodemailer setup for sending alert notifications
 *
 * @module config/email
 *
 * SECURITY NOTE:
 * Email credentials MUST be stored in Firebase Secret Manager.
 * Use Firebase CLI to set secrets:
 *   firebase functions:secrets:set EMAIL_USER
 *   firebase functions:secrets:set EMAIL_PASSWORD
 *
 * Then update function declarations to include secrets:
 *   export const myFunction = onSchedule(
 *     { schedule: '...', secrets: [EMAIL_USER, EMAIL_PASSWORD] },
 *     async (event) => { ... }
 *   );
 */

import {defineSecret} from "firebase-functions/params";
import {logger} from "firebase-functions/v2";
import * as nodemailer from "nodemailer";

/**
 * Email credentials from Firebase Secret Manager
 * These secrets must be configured before deploying functions that send emails
 */
const EMAIL_USER_SECRET = defineSecret("EMAIL_USER");
const EMAIL_PASSWORD_SECRET = defineSecret("EMAIL_PASSWORD");

/**
 * Get email configuration from secrets
 * Call this function inside your Cloud Function handlers
 * @return {object} Email credentials object with user and password
 */
export function getEmailCredentials(): { user: string; password: string } {
  const user = EMAIL_USER_SECRET.value();
  const password = EMAIL_PASSWORD_SECRET.value();

  if (!user || !password) {
    throw new Error(
      "Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD secrets using Firebase CLI."
    );
  }

  return {user, password};
}

export const EMAIL_USER_SECRET_REF = EMAIL_USER_SECRET;
export const EMAIL_PASSWORD_SECRET_REF = EMAIL_PASSWORD_SECRET;

/**
 * Create Nodemailer transporter with credentials
 * This should be called inside Cloud Function handlers where secrets are available
 *
 * @param {Object} credentials - Email credentials from getEmailCredentials()
 * @return {nodemailer.Transporter} Configured transporter
 */
function createEmailTransporter(credentials: {
  user: string;
  password: string;
}): nodemailer.Transporter {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: credentials.user,
      pass: credentials.password,
    },
  });

  return transporter;
}

/**
 * Email template for stale alert notifications
 */
export interface StaleAlertEmailData {
  recipientEmail: string;
  recipientName: string;
  staleAlerts: Array<{
    alertId: string;
    deviceId: string;
    deviceName?: string;
    parameter: string;
    value: number;
    severity: string;
    createdAt: Date;
    hoursStale: number;
  }>;
  totalCount: number;
}

/**
 * Email template for analytics reports
 */
export interface AnalyticsEmailData {
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
 * Email template for alert digests
 */
export interface DigestEmailData {
  recipientEmail: string;
  category: string;
  items: Array<{
    summary: string;
    timestamp: Date;
    value?: number;
    severity: string;
    deviceName?: string;
    parameter: string;
  }>;
  createdAt: Date;
  sendAttempts: number;
  ackToken: string;
  digestId: string;
}

/**
 * Send stale alert notification email
 *
 * @param {*} data - Email data with recipient and alert information
 * @return {Promise<void>} Promise that resolves when email is sent
 *
 * @example
 * await sendStaleAlertEmail({
 *   recipientEmail: 'admin@example.com',
 *   recipientName: 'John Admin',
 *   staleAlerts: [...],
 *   totalCount: 3
 * });
 */
export async function sendStaleAlertEmail(data: StaleAlertEmailData): Promise<void> {
  const {recipientEmail, recipientName, staleAlerts, totalCount} = data;

  // Get email credentials and create transporter
  const credentials = getEmailCredentials();
  const emailTransporter = createEmailTransporter(credentials);

  // Generate alert rows HTML
  const alertRows = staleAlerts
    .map(
      (alert) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        <span style="color: #dc2626; font-weight: 600;">${alert.severity}</span>
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.deviceName || alert.deviceId}
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.parameter.toUpperCase()}
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.value}
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.createdAt.toLocaleString("en-US", {timeZone: "Asia/Manila"})}
      </td>
      <td style="padding: 12px; color: #dc2626; font-weight: 600;">
        ${alert.hoursStale.toFixed(1)} hours
      </td>
    </tr>
  `
    )
    .join("");

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stale Critical Alerts Warning</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Stale Critical Alerts Warning</h1>
      <p style="color: #fee2e2; margin: 10px 0 0 0;">Water Quality Monitoring System</p>
    </div>
    
    <!-- Content -->
    <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 0;">
        Hello <strong>${recipientName}</strong>,
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        The system has detected <strong style="color: #dc2626;">${totalCount} critical alert(s)</strong> 
        that have been active for more than 2 hours without acknowledgment or resolution.
      </p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
        <p style="color: #991b1b; margin: 0; font-weight: 600;">
          ⚠️ Immediate Action Required
        </p>
        <p style="color: #7f1d1d; margin: 10px 0 0 0; font-size: 14px;">
          Critical alerts indicate potentially dangerous water quality conditions that require urgent attention.
        </p>
      </div>
      
      <!-- Alerts Table -->
      <div style="margin: 25px 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Severity</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Device</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Parameter</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Value</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Created At</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Time Stale</th>
            </tr>
          </thead>
          <tbody>
            ${alertRows}
          </tbody>
        </table>
      </div>
      
      <!-- Action Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || "https://your-app-url.com"}/dashboard/alerts" 
           style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Alerts Dashboard →
        </a>
      </div>
      
      <!-- Footer Info -->
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
          <strong>Next Steps:</strong>
        </p>
        <ul style="color: #6b7280; font-size: 14px; line-height: 1.8; margin: 10px 0;">
          <li>Log into the dashboard to review alert details</li>
          <li>Acknowledge each alert to indicate you're investigating</li>
          <li>Take corrective action based on alert severity</li>
          <li>Resolve alerts once the issue is addressed</li>
        </ul>
      </div>
      
      <!-- System Footer -->
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
          Water Quality Monitoring System - Automated Alert
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
          This is an automated notification. Please do not reply to this email.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
          Generated at: ${new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"})} (Asia/Manila)
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"Water Quality Alert System" <${credentials.user}>`,
    to: recipientEmail,
    subject: `⚠️ URGENT: ${totalCount} Critical Alert(s) Require Attention`,
    html: htmlContent,
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    logger.info(`Stale alert email sent successfully to ${recipientEmail}`);
  } catch (error) {
    logger.error(`Failed to send stale alert email to ${recipientEmail}:`, error);
    throw error;
  }
}

/**
 * Send analytics report email
 *
 * @param {*} data - Email data with analytics information
 * @return {Promise<void>} Promise that resolves when email is sent
 *
 * @example
 * await sendAnalyticsEmail({
 *   recipientEmail: 'admin@example.com',
 *   recipientName: 'John Admin',
 *   reportType: 'daily',
 *   ...analyticsData
 * });
 */
export async function sendAnalyticsEmail(data: AnalyticsEmailData): Promise<void> {
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

  // Get email credentials and create transporter
  const credentials = getEmailCredentials();
  const emailTransporter = createEmailTransporter(credentials);

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

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle} Analytics Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">📊 ${reportTitle} Analytics Report</h1>
      <p style="color: #dbeafe; margin: 10px 0 0 0;">${periodText}</p>
      <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">
        ${periodStart.toLocaleDateString("en-US", {timeZone: "Asia/Manila"})} - 
        ${periodEnd.toLocaleDateString("en-US", {timeZone: "Asia/Manila"})}
      </p>
    </div>
    
    <!-- Content -->
    <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-top: 0;">
        Hello <strong>${recipientName}</strong>,
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Here's your ${reportType} water quality monitoring analytics report for ${periodText.toLowerCase()}.
      </p>
      
      <!-- System Health Summary -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">
          🎯 System Health Summary
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Total Devices</p>
            <p style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 5px 0 0 0;">
              ${deviceSummary.totalDevices}
            </p>
          </div>
          <div>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Health Score</p>
            <p style="color: ${deviceSummary.healthScore >= 80 ? "#10b981" : deviceSummary.healthScore >= 60 ? "#f59e0b" : "#ef4444"}; 
               font-size: 24px; font-weight: 700; margin: 5px 0 0 0;">
              ${deviceSummary.healthScore}%
            </p>
          </div>
          <div>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Online Devices</p>
            <p style="color: #10b981; font-size: 24px; font-weight: 700; margin: 5px 0 0 0;">
              ${deviceSummary.onlineDevices}
            </p>
          </div>
          <div>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Offline Devices</p>
            <p style="color: #ef4444; font-size: 24px; font-weight: 700; margin: 5px 0 0 0;">
              ${deviceSummary.offlineDevices}
            </p>
          </div>
        </div>
      </div>

      <!-- Alert Summary -->
      <div style="background: ${alertCounts.Critical > 0 ? "#fef2f2" : "#f0fdf4"}; 
          border-left: 4px solid ${alertCounts.Critical > 0 ? "#dc2626" : "#10b981"}; 
          padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">
          ⚠️ Alert Summary (${periodText})
        </h3>
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <div>
            <span style="color: #dc2626; font-weight: 600; font-size: 20px;">${alertCounts.Critical}</span>
            <span style="color: #6b7280; font-size: 14px;"> Critical</span>
          </div>
          <div>
            <span style="color: #f59e0b; font-weight: 600; font-size: 20px;">${alertCounts.Warning}</span>
            <span style="color: #6b7280; font-size: 14px;"> Warning</span>
          </div>
          <div>
            <span style="color: #3b82f6; font-weight: 600; font-size: 20px;">${alertCounts.Advisory}</span>
            <span style="color: #6b7280; font-size: 14px;"> Advisory</span>
          </div>
          <div style="margin-left: auto;">
            <span style="color: #374151; font-weight: 700; font-size: 20px;">${alertCounts.total}</span>
            <span style="color: #6b7280; font-size: 14px;"> Total</span>
          </div>
        </div>
      </div>

      <!-- Top Devices Table -->
      ${
  topDevices.length > 0 ?
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
    ""
}

      <!-- Recent Alerts Table -->
      ${
  recentAlerts.length > 0 ?
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
      `
}

      <!-- Action Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.APP_URL || "https://your-app-url.com"}/dashboard" 
           style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Full Dashboard →
        </a>
      </div>
      
      <!-- System Footer -->
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
          Water Quality Monitoring System - ${reportTitle} Analytics
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
          This is an automated report. To manage your preferences, visit your dashboard settings.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
          Generated at: ${new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"})} (Asia/Manila)
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"Water Quality Analytics" <${credentials.user}>`,
    to: recipientEmail,
    subject: `📊 ${reportTitle} Analytics Report - ${periodText}`,
    html: htmlContent,
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    logger.info(`Analytics email (${reportType}) sent successfully to ${recipientEmail}`);
  } catch (error) {
    logger.error(`Failed to send analytics email to ${recipientEmail}:`, error);
    throw error;
  }
}

/**
 * Helper function to get severity badge color
 *
 * @param {string} severity - The severity level
 * @return {string} The color hex code for the severity badge
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
  case "Critical":
    return "#dc2626";
  case "Warning":
    return "#f59e0b";
  case "Advisory":
    return "#3b82f6";
  default:
    return "#6b7280";
  }
}

/**
 * Send alert digest email with batched notifications
 *
 * @param {*} data - Email data with digest information
 * @return {Promise<void>} Promise that resolves when email is sent
 *
 * @example
 * await sendDigestEmail({
 *   recipientEmail: 'user@example.com',
 *   category: 'ph_high',
 *   items: [...],
 *   createdAt: new Date(),
 *   sendAttempts: 0,
 *   ackToken: 'secure-token',
 *   digestId: 'user123_ph_high_2025-11-02'
 * });
 */
export async function sendDigestEmail(data: DigestEmailData): Promise<void> {
  const {recipientEmail, category, items, createdAt, sendAttempts, ackToken, digestId} = data;

  // Get email credentials and create transporter
  const credentials = getEmailCredentials();
  const emailTransporter = createEmailTransporter(credentials);

  const categoryName = category.replace(/_/g, " ").toUpperCase();
  const attemptText = `${sendAttempts + 1}/3`;
  const severityColor = getSeverityColor(items[0]?.severity || "Advisory");

  // Generate table rows
  const tableRows = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 12px;">
        <span style="display: inline-block; padding: 4px 8px; 
          border-radius: 4px; background: ${getSeverityColor(item.severity)}; 
          color: white; font-size: 11px; font-weight: 600;">
          ${item.severity}
        </span>
      </td>
      <td style="padding: 12px;">${item.deviceName || "Unknown"}</td>
      <td style="padding: 12px;">${item.summary}</td>
      <td style="padding: 12px; color: #666; font-size: 13px;">
        ${item.timestamp.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  })}
      </td>
    </tr>
  `
    )
    .join("");

  // Prepare chart data (only if items have values)
  const chartData = items
    .filter((item) => item.value !== undefined)
    .map((item) => ({
      x: item.timestamp.getTime(),
      y: item.value,
    }));

  const chartLabels = chartData.map((d) =>
    new Date(d.x).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );

  const chartValues = chartData.map((d) => d.y);

  // Acknowledgement URL
  const ackUrl = `${process.env.APP_URL || "https://puretrack.app"}/acknowledge?token=${ackToken}&id=${digestId}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0"></script>
</head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 700px; margin: 0 auto; background: white; 
    border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: ${severityColor}; color: white; padding: 24px;">
      <h2 style="margin: 0;">🚨 Water Quality Alert Digest</h2>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">
        Category: ${categoryName}
      </p>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.8;">
        ${items.length} alert${items.length !== 1 ? "s" : ""} aggregated since 
        ${createdAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  })}
      </p>
    </div>

    <!-- Alert Summary Table -->
    <div style="padding: 24px;">
      <h3 style="margin-top: 0; color: #333;">Alert Summary</h3>
      <table style="width: 100%; border-collapse: collapse; 
        border: 1px solid #e0e0e0; border-radius: 4px;">
        <thead>
          <tr style="background: #fafafa;">
            <th style="padding: 12px; text-align: left; font-weight: 600; 
              color: #666; font-size: 13px; border-bottom: 2px solid #e0e0e0;">
              Severity
            </th>
            <th style="padding: 12px; text-align: left; font-weight: 600; 
              color: #666; font-size: 13px; border-bottom: 2px solid #e0e0e0;">
              Device
            </th>
            <th style="padding: 12px; text-align: left; font-weight: 600; 
              color: #666; font-size: 13px; border-bottom: 2px solid #e0e0e0;">
              Issue
            </th>
            <th style="padding: 12px; text-align: left; font-weight: 600; 
              color: #666; font-size: 13px; border-bottom: 2px solid #e0e0e0;">
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    ${
  chartValues.length > 0 ?
    `
    <!-- Trend Visualization -->
    <div style="padding: 0 24px 24px 24px;">
      <h3 style="color: #333;">Trend Over Time</h3>
      <div style="background: #fafafa; padding: 16px; border-radius: 4px;">
        <canvas id="trendChart" width="600" height="250"></canvas>
      </div>
    </div>
    <script>
      const ctx = document.getElementById('trendChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ${JSON.stringify(chartLabels)},
          datasets: [{
            label: '${items[0].parameter.toUpperCase()} Value',
            data: ${JSON.stringify(chartValues)},
            borderColor: '${severityColor}',
            backgroundColor: '${severityColor}33',
            tension: 0.3,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {display: true, position: 'top'},
            tooltip: {enabled: true}
          },
          scales: {
            x: {grid: {display: false}},
            y: {beginAtZero: false}
          }
        }
      });
    </script>
    ` :
    ""
}

    <!-- Acknowledgement CTA -->
    <div style="padding: 0 24px 24px 24px;">
      <div style="background: #fff3cd; border-left: 4px solid #faad14; 
        padding: 16px; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; color: #856404;">
          ✅ Acknowledge This Digest
        </h4>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #856404;">
          Click below to stop receiving this alert. 
          You will NOT receive reminders after acknowledgement.
        </p>
        <a href="${ackUrl}" 
          style="display: inline-block; padding: 10px 20px; 
          background: #28a745; color: white; text-decoration: none; 
          border-radius: 4px; font-weight: 600;">
          Acknowledge & Stop Alerts
        </a>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #856404;">
          ⚠️ You have ${3 - sendAttempts} reminder${3 - sendAttempts !== 1 ? "s" : ""} left 
          (sent every 24 hours until acknowledged or max 3 attempts reached)
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f5f5f5; padding: 16px 24px; text-align: center; 
      border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        Automated alert from <strong>PureTrack</strong> Water Quality Monitoring System<br>
        Attempt ${sendAttempts + 1} of 3 • Next attempt in 24 hours if not acknowledged
      </p>
    </div>

  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"PureTrack Alerts" <${credentials.user}>`,
    to: recipientEmail,
    subject: `⚠️ Alert Digest: ${categoryName} (Attempt ${attemptText})`,
    html: htmlContent,
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    logger.info(`Digest email sent successfully to ${recipientEmail} (${digestId})`);
  } catch (error) {
    logger.error(`Failed to send digest email to ${recipientEmail}:`, error);
    throw error;
  }
}
