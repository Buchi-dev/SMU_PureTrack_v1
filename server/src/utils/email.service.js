const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Email Service
 * Handles sending emails using nodemailer with external HTML templates
 */

/**
 * Load and cache HTML templates
 */
const templates = {
  weeklyReport: null,
  alert: null,
  test: null,
};

/**
 * Load HTML template from file
 * @param {string} templateName - Name of the template file (without .html)
 * @returns {string} - HTML template content
 */
function loadTemplate(templateName) {
  if (templates[templateName]) {
    return templates[templateName];
  }

  const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
  
  try {
    templates[templateName] = fs.readFileSync(templatePath, 'utf-8');
    return templates[templateName];
  } catch (error) {
    logger.error('[Email Service] Error loading template', {
      templateName,
      error: error.message,
    });
    throw new Error(`Email template '${templateName}' not found`);
  }
}

/**
 * Replace template placeholders with actual values
 * @param {string} template - HTML template string
 * @param {Object} data - Key-value pairs for replacement
 * @returns {string} - Processed HTML
 */
function renderTemplate(template, data) {
  let rendered = template;
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(placeholder, value || '');
  }
  
  return rendered;
}

/**
 * Create nodemailer transporter
 * Uses Gmail SMTP or configured SMTP settings
 */
const createTransporter = () => {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('[Email Service] SMTP not configured. Email notifications disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send weekly reports email to a user
 * @param {Object} user - User document with email and name
 * @param {Array} reports - Array of report documents (water quality, device status)
 * @returns {Promise<boolean>} - Success status
 */
async function sendWeeklyReportEmail(user, reports) {
  const transporter = createTransporter();
  
  if (!transporter) {
    logger.info('[Email Service] Skipping email - SMTP not configured', {
      recipientEmail: user.email,
    });
    return false;
  }

  try {
    const waterQualityReport = reports.find(r => r.type === 'water-quality');
    const deviceStatusReport = reports.find(r => r.type === 'device-status');

    // Build email HTML
    const emailHtml = buildWeeklyReportEmailHTML(user, waterQualityReport, deviceStatusReport);
    const emailText = buildWeeklyReportEmailText(user, waterQualityReport, deviceStatusReport);

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Water Quality Monitor'}" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Weekly Water Quality Report - ${new Date().toLocaleDateString()}`,
      text: emailText,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('[Email Service] Weekly report sent successfully', {
      recipientEmail: user.email,
      messageId: info.messageId,
    });
    return true;
  } catch (error) {
    logger.error('[Email Service] Error sending weekly report email', {
      recipientEmail: user.email,
      error: error.message,
    });
    return false;
  }
}

/**
 * Build HTML email for weekly reports using external template
 */
function buildWeeklyReportEmailHTML(user, waterQualityReport, deviceStatusReport) {
  const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  
  // Build water quality section
  const waterQualitySection = waterQualityReport ? `
    <div class="report-section">
      <h2 class="report-title">💧 Water Quality Summary</h2>
      <div class="metric">
        <span class="metric-label">Total Devices Monitored:</span>
        <span class="metric-value">${waterQualityReport.summary.totalDevices}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Total Readings:</span>
        <span class="metric-value">${waterQualityReport.summary.totalReadings.toLocaleString()}</span>
      </div>
      <div class="metric">
        <span class="metric-label">WHO Compliance Rate:</span>
        <span class="metric-value ${waterQualityReport.summary.complianceRate >= 80 ? 'status-good' : waterQualityReport.summary.complianceRate >= 60 ? 'status-warning' : 'status-critical'}">
          ${waterQualityReport.summary.complianceRate}%
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">Total Alerts:</span>
        <span class="metric-value ${waterQualityReport.summary.criticalAlerts > 0 ? 'status-critical' : 'status-good'}">
          ${waterQualityReport.summary.totalAlerts} (${waterQualityReport.summary.criticalAlerts} critical)
        </span>
      </div>
    </div>
  ` : '';

  // Build device status section
  const deviceStatusSection = deviceStatusReport ? `
    <div class="report-section">
      <h2 class="report-title">🖥️ Device Status Summary</h2>
      <div class="metric">
        <span class="metric-label">Total Devices:</span>
        <span class="metric-value">${deviceStatusReport.summary.totalDevices}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Online Devices:</span>
        <span class="metric-value status-good">${deviceStatusReport.summary.onlineDevices}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Offline Devices:</span>
        <span class="metric-value ${deviceStatusReport.summary.offlineDevices > 0 ? 'status-warning' : 'status-good'}">
          ${deviceStatusReport.summary.offlineDevices}
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">Average Uptime:</span>
        <span class="metric-value ${deviceStatusReport.summary.avgUptimePercentage >= 95 ? 'status-good' : deviceStatusReport.summary.avgUptimePercentage >= 80 ? 'status-warning' : 'status-critical'}">
          ${deviceStatusReport.summary.avgUptimePercentage}%
        </span>
      </div>
      <div class="metric">
        <span class="metric-label">Devices with Critical Alerts:</span>
        <span class="metric-value ${deviceStatusReport.summary.devicesWithCriticalAlerts > 0 ? 'status-critical' : 'status-good'}">
          ${deviceStatusReport.summary.devicesWithCriticalAlerts}
        </span>
      </div>
    </div>
  ` : '';

  // Load and render template
  const template = loadTemplate('weekly-report');
  
  return renderTemplate(template, {
    userName: user.name || user.email,
    waterQualitySection,
    deviceStatusSection,
    appUrl,
    currentYear: new Date().getFullYear(),
  });
}

/**
 * Build plain text email for weekly reports
 */
function buildWeeklyReportEmailText(user, waterQualityReport, deviceStatusReport) {
  let text = `Weekly Water Quality Report\n`;
  text += `Hello, ${user.name || user.email}!\n\n`;
  text += `Here's your weekly summary for the water quality monitoring system.\n\n`;

  if (waterQualityReport) {
    text += `WATER QUALITY SUMMARY\n`;
    text += `=====================\n`;
    text += `Total Devices Monitored: ${waterQualityReport.summary.totalDevices}\n`;
    text += `Total Readings: ${waterQualityReport.summary.totalReadings.toLocaleString()}\n`;
    text += `WHO Compliance Rate: ${waterQualityReport.summary.complianceRate}%\n`;
    text += `Total Alerts: ${waterQualityReport.summary.totalAlerts} (${waterQualityReport.summary.criticalAlerts} critical)\n\n`;
  }

  if (deviceStatusReport) {
    text += `DEVICE STATUS SUMMARY\n`;
    text += `=====================\n`;
    text += `Total Devices: ${deviceStatusReport.summary.totalDevices}\n`;
    text += `Online Devices: ${deviceStatusReport.summary.onlineDevices}\n`;
    text += `Offline Devices: ${deviceStatusReport.summary.offlineDevices}\n`;
    text += `Average Uptime: ${deviceStatusReport.summary.avgUptimePercentage}%\n`;
    text += `Devices with Critical Alerts: ${deviceStatusReport.summary.devicesWithCriticalAlerts}\n\n`;
  }

  text += `View full reports: ${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/reports\n\n`;
  text += `---\n`;
  text += `This is an automated report from your Water Quality Monitoring System.\n`;
  text += `To manage your notification preferences, visit your account settings.\n`;

  return text;
}

/**
 * Send alert notification email to a user using external template
 * @param {Object} user - User document with email and name
 * @param {Object} alert - Alert document
 * @returns {Promise<boolean>} - Success status
 */
async function sendAlertEmail(user, alert) {
  const transporter = createTransporter();
  
  if (!transporter) {
    return false;
  }

  try {
    const severityEmoji = {
      Critical: '[CRITICAL]',
      Warning: '[WARNING]',
      Advisory: '[INFO]',
    };

    const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Load and render template
    const template = loadTemplate('alert-email');
    const emailHtml = renderTemplate(template, {
      alertEmoji: severityEmoji[alert.severity],
      alertSeverity: alert.severity,
      alertSeverityClass: alert.severity.toLowerCase(),
      alertMessage: alert.message,
      deviceId: alert.deviceId,
      parameter: alert.parameter,
      value: alert.value,
      timestamp: alert.timestamp.toLocaleString(),
      appUrl,
    });

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Water Quality Monitor'}" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `${severityEmoji[alert.severity]} ${alert.severity} Alert: ${alert.message}`,
      text: `
${alert.severity} Alert
==================
Device: ${alert.deviceId}
Parameter: ${alert.parameter}
Value: ${alert.value}
Message: ${alert.message}
Time: ${alert.timestamp.toLocaleString()}

View alert details: ${appUrl}/admin/alerts
      `,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('[Email Service] Alert email sent successfully', {
      recipientEmail: user.email,
      messageId: info.messageId,
      alertSeverity: alert.severity,
    });
    return true;
  } catch (error) {
    logger.error('[Email Service] Error sending alert email', {
      recipientEmail: user.email,
      error: error.message,
    });
    return false;
  }
}

/**
 * Test email configuration using external template
 * Sends a test email to verify SMTP settings
 */
async function testEmailConfiguration(recipientEmail) {
  const transporter = createTransporter();
  
  if (!transporter) {
    throw new Error('SMTP not configured');
  }

  try {
    await transporter.verify();
    logger.info('[Email Service] SMTP connection verified successfully');

    if (recipientEmail) {
      // Load and render template
      const template = loadTemplate('test-email');
      const emailHtml = renderTemplate(template, {});

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Water Quality Monitor'}" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject: 'Test Email - Water Quality Monitor',
        text: 'This is a test email from your Water Quality Monitoring System. If you received this, your email configuration is working correctly!',
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('[Email Service] Test email sent successfully', {
        recipientEmail,
        messageId: info.messageId,
      });
    }

    return true;
  } catch (error) {
    logger.error('[Email Service] Email configuration test failed', {
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  sendWeeklyReportEmail,
  sendAlertEmail,
  testEmailConfiguration,
};
