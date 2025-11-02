import type {
  WaterParameter,
  NotificationPreferences,
  WaterQualityAlert,
} from "../types";
import {emailTransporter} from "../config/email";
import {getParameterName, getParameterUnit} from "./helpers";

/**
 * Send email notification for an alert
 * @param {NotificationPreferences} recipient - Notification recipient
 * @param {Partial<WaterQualityAlert>} alert - Alert object
 * @return {Promise<boolean>} Success status
 */
export async function sendEmailNotification(
  recipient: NotificationPreferences,
  alert: Partial<WaterQualityAlert>
): Promise<boolean> {
  try {
    const severityColor =
      alert.severity === "Critical" ? "#ff4d4f" :
        alert.severity === "Warning" ? "#faad14" : "#1890ff";

    const alertWithLoc = alert as WaterQualityAlert;
    const locStr =
      alertWithLoc.deviceBuilding && alertWithLoc.deviceFloor ?
        `${alertWithLoc.deviceBuilding}, ${alertWithLoc.deviceFloor}` :
        alertWithLoc.deviceBuilding ? alertWithLoc.deviceBuilding : "";

    const subLoc = locStr ? ` - ${locStr}` : "";

    const paramName = getParameterName(alert.parameter!);
    const mailOptions = {
      from: "noreply@puretrack.com",
      to: recipient.email,
      subject: `[${alert.severity}] Water Quality Alert${subLoc} - ${paramName}`,
      html: generateAlertEmailHTML(alert, severityColor, locStr),
    };

    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${recipient.email}:`, error);
    return false;
  }
}

/**
 * Generate HTML for alert email
 * @param {Partial<WaterQualityAlert>} alert - Alert data
 * @param {string} severityColor - Color code for severity level
 * @param {string} locStr - Location string
 * @return {string} Generated HTML string
 */
function generateAlertEmailHTML(
  alert: Partial<WaterQualityAlert>,
  severityColor: string,
  locStr: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px;
      margin: 0 auto;">
      <div style="background: ${severityColor}; color: white; padding: 20px;
        border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Water Quality Alert</h2>
        ${locStr ?
    "<p style=\"margin: 5px 0 0 0; font-size: 14px;\">Location: " +
    `${locStr}</p>` :
    ""}
      </div>
      <div style="background: #f5f5f5; padding: 20px;
        border-radius: 0 0 8px 8px;">
        <div style="background: white; padding: 20px; border-radius: 8px;
          margin-bottom: 15px;">
          <h3 style="color: ${severityColor}; margin-top: 0;">` +
    `${alert.severity} Alert</h3>
          <p><strong>Device:</strong> ${alert.deviceName}</p>
          ${locStr ? `<p><strong>Location:</strong> ${locStr}</p>` : ""}
          <p><strong>Parameter:</strong> ` +
    `${getParameterName(alert.parameter!)}</p>
          <p><strong>Current Value:</strong> ` +
    `${alert.currentValue?.toFixed(2)} ` +
    `${getParameterUnit(alert.parameter!)}</p>
          ${alert.thresholdValue ?
    `<p><strong>Threshold:</strong> ${alert.thresholdValue} ` +
    `${getParameterUnit(alert.parameter!)}</p>` :
    ""}
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div style="background: white; padding: 20px; border-radius: 8px;
          margin-bottom: 15px;">
          <h4 style="margin-top: 0;">Message</h4>
          <p>${alert.message}</p>
        </div>
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px;
          border-left: 4px solid #faad14;">
          <h4 style="margin-top: 0;">Recommended Action</h4>
          <p>${alert.recommendedAction}</p>
        </div>
        <div style="margin-top: 20px; text-align: center;">
          <p style="color: #666; font-size: 12px;">
            This is an automated alert from PureTrack Water Quality Monitoring System
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Send daily analytics email to a user
 * @param {NotificationPreferences} recipient - Email recipient info
 * @param {any} deviceReport - Device status report
 * @param {any[]} recentAlerts - Array of recent alerts
 * @param {any} alertCounts - Alert counts by severity
 * @param {any[]} deviceSummaries - Device summaries
 * @return {Promise<void>}
 */
export async function sendDailyAnalyticsEmail(
  recipient: NotificationPreferences,
  deviceReport: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  recentAlerts: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  alertCounts: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  deviceSummaries: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<void> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });

  const totalAlerts = alertCounts.Critical + alertCounts.Warning + alertCounts.Advisory;

  const mailOptions = {
    from: "noreply@puretrack.com",
    to: recipient.email,
    subject: `Daily Water Quality Analytics - ${today}`,
    html: generateDailyAnalyticsHTML(
      today,
      deviceReport,
      totalAlerts,
      alertCounts,
      deviceSummaries,
      recentAlerts
    ),
  };

  await emailTransporter.sendMail(mailOptions);
}

/**
 * Generate HTML for daily analytics email
 * @param {string} today - Today's date string
 * @param {any} deviceReport - Device status report
 * @param {number} totalAlerts - Total number of alerts
 * @param {any} alertCounts - Alert counts by severity
 * @param {any[]} deviceSummaries - Device summaries
 * @param {any[]} recentAlerts - Array of recent alerts
 * @return {string} Generated HTML string
 */
function generateDailyAnalyticsHTML(
  today: string,
  deviceReport: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  totalAlerts: number,
  alertCounts: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  deviceSummaries: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  recentAlerts: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
): string {
  const deviceStatusRows = deviceSummaries
    .map((dev) => {
      const bgColor = dev.status === "online" ? "#e6f7e6" : "#fee";
      const textColor = dev.status === "online" ? "#2d662d" : "#c00";
      return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px; font-weight: 500;">${dev.name}</td>
          <td style="padding: 12px;">
            <span style="display: inline-block; padding: 4px 12px;
              border-radius: 12px; background: ${bgColor}; color: ${textColor};
              font-size: 12px; font-weight: 600;">
              ${dev.status.toUpperCase()}
            </span>
          </td>
          <td style="padding: 12px;">
            ${dev.reading.turbidity.toFixed(2)} NTU
          </td>
          <td style="padding: 12px;">
            ${dev.reading.tds.toFixed(0)} ppm
          </td>
          <td style="padding: 12px;">
            ${dev.reading.ph.toFixed(2)}
          </td>
        </tr>
      `;
    })
    .join("");

  const recentAlertsRows = recentAlerts
    .slice(0, 10)
    .map((alert) => {
      const severityColor =
        alert.severity === "Critical" ? "#ff4d4f" :
          alert.severity === "Warning" ? "#faad14" : "#1890ff";
      const timestamp = alert.createdAt?.toDate ?
        alert.createdAt.toDate().toLocaleString() :
        "N/A";

      return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px;">
            <span style="display: inline-block; padding: 4px 12px;
              border-radius: 12px; background: ${severityColor}20;
              color: ${severityColor}; font-size: 12px; font-weight: 600;">
              ${alert.severity}
            </span>
          </td>
          <td style="padding: 12px;">
            ${alert.deviceName || alert.deviceId}
          </td>
          <td style="padding: 12px;">
            ${getParameterName(alert.parameter as WaterParameter)}
          </td>
          <td style="padding: 12px;">
            ${alert.currentValue?.toFixed(2) || "N/A"}
          </td>
          <td style="padding: 12px; font-size: 12px; color: #666;">
            ${timestamp}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;
      background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
              style="background-color: white; border-radius: 8px;
              overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg,
                  #667eea 0%, #764ba2 100%); padding: 30px;
                  text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 28px;
                    font-weight: 700;">
                    📊 Daily Water Quality Report
                  </h1>
                  <p style="margin: 10px 0 0 0;
                    color: rgba(255,255,255,0.9); font-size: 16px;">
                    ${today}
                  </p>
                </td>
              </tr>

              <!-- Summary Cards -->
              <tr>
                <td style="padding: 30px 30px 20px 30px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="32%" style="background: #e6f7ff;
                        padding: 20px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700;
                          color: #1890ff; margin-bottom: 5px;">
                          ${deviceReport.summary.totalDevices}
                        </div>
                        <div style="color: #666; font-size: 14px;">
                          Total Devices
                        </div>
                      </td>
                      <td width="2%"></td>
                      <td width="32%"
                        style="background: ${totalAlerts > 0 ?
    "#fff7e6" :
    "#f6ffed"};
                        padding: 20px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700;
                          color: ${totalAlerts > 0 ? "#faad14" : "#52c41a"};
                          margin-bottom: 5px;">
                          ${totalAlerts}
                        </div>
                        <div style="color: #666; font-size: 14px;">
                          Alerts (24h)
                        </div>
                      </td>
                      <td width="2%"></td>
                      <td width="32%" style="background: #f0f5ff;
                        padding: 20px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700;
                          color: #597ef7; margin-bottom: 5px;">
                          ${deviceReport.summary.healthScore}%
                        </div>
                        <div style="color: #666; font-size: 14px;">
                          Health Score
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Device Status Section -->
              <tr>
                <td style="padding: 0 30px 20px 30px;">
                  <h2 style="margin: 0 0 15px 0; color: #333;
                    font-size: 20px; border-bottom: 2px solid #667eea;
                    padding-bottom: 10px;">
                    📱 Device Status & Latest Readings
                  </h2>
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="border: 1px solid #e0e0e0; border-radius: 8px;
                    overflow: hidden;">
                    <thead>
                      <tr style="background: #fafafa;">
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          Device
                        </th>
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          Status
                        </th>
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          Turbidity
                        </th>
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          TDS
                        </th>
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          pH
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      ${deviceStatusRows ||
    "<tr><td colspan=\"5\" style=\"padding: 20px; " +
    "text-align: center; color: #999;\">" +
    "No devices found</td></tr>"}
                    </tbody>
                  </table>
                </td>
              </tr>

              ${
  recentAlerts.length > 0 ?
    `
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                  <h2 style="margin: 0 0 15px 0; color: #333;
                    font-size: 20px; border-bottom: 2px solid #667eea;
                    padding-bottom: 10px;">
                    🔔 Recent Alerts (Last 24 Hours)
                  </h2>
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="border: 1px solid #e0e0e0; border-radius: 8px;
                    overflow: hidden;">
                    <thead>
                      <tr style="background: #fafafa;">
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          Severity
                        </th>
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          Device
                        </th>
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          Parameter
                        </th>
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          Value
                        </th>
                        <th style="padding: 12px; text-align: left;
                          font-weight: 600; color: #666; font-size: 13px;">
                          Time
                        </th>
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
                  <div style="background: #f6ffed; border: 2px solid #b7eb8f;
                    border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                    <div style="color: #52c41a; font-weight: 600;
                      font-size: 18px; margin-bottom: 5px;">
                      No Alerts in the Last 24 Hours
                    </div>
                    <div style="color: #666; font-size: 14px;">
                      All systems operating normally
                    </div>
                  </div>
                </td>
              </tr>
              `
}

              <!-- Footer -->
              <tr>
                <td style="background: #fafafa; padding: 20px 30px;
                  text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 0; color: #999; font-size: 12px;">
                    This is an automated daily report from
                    PureTrack Water Quality Monitoring System
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Create email transporter for alert digests
 * Uses environment variables for credentials
 */
export async function createTransporter(): Promise<any> {
  // Re-use existing emailTransporter from config
  return emailTransporter;
}

/**
 * Send email using transporter
 * @param transporter - Nodemailer transporter
 * @param options - Email options (to, subject, html)
 */
export async function sendEmail(
  transporter: any,
  options: {
    to: string;
    subject: string;
    html: string;
  }
): Promise<void> {
  const mailOptions = {
    from: "noreply@smu.edu.ph",
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
}
