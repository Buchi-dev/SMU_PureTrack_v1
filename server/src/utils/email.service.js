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
 * Create nodemailer transporter with connection pooling and extended timeouts
 * Uses Gmail SMTP or configured SMTP settings
 * Optimized for cloud environments (Render.com, etc.)
 */
const createTransporter = () => {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('[Email Service] SMTP not configured. Email notifications disabled.');
    return null;
  }

  logger.info('[Email Service] Creating SMTP transporter', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER,
    fromName: process.env.SMTP_FROM_NAME,
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Connection pooling to reuse connections (reduces timeout issues)
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Extended timeouts for cloud environments
    connectionTimeout: 60000, // 60 seconds (up from 2 minutes default timeout causing issues)
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    // Retry logic
    retry: {
      times: 3,
      interval: 5000, // 5 seconds between retries
    },
    debug: process.env.NODE_ENV !== 'production', // Only in development
    logger: process.env.NODE_ENV !== 'production', // Only in development
  });

  // Test the connection asynchronously (non-blocking)
  transporter.verify((error, success) => {
    if (error) {
      logger.error('[Email Service] SMTP connection verification failed', {
        error: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        hint: 'Check if SMTP port is blocked by cloud provider firewall',
      });
    } else {
      logger.info('[Email Service] SMTP connection verified successfully');
    }
  });

  return transporter;
};

/**
 * Send alert notification email to a user using external template
 * @param {Object} user - User document with email and name
 * @param {Object} alert - Alert document
 * @returns {Promise<boolean>} - Success status
 */
async function sendAlertEmail(user, alert) {
  logger.info('[Email Service] Starting email send process', {
    recipientEmail: user.email,
    alertId: alert.alertId,
    severity: alert.severity,
    parameter: alert.parameter,
  });

  const transporter = createTransporter();

  if (!transporter) {
    logger.error('[Email Service] No transporter available');
    return false;
  }

  try {
    const severityEmoji = {
      Critical: '[CRITICAL]',
      Warning: '[WARNING]',
      Advisory: '[INFO]',
    };

    const appUrl = process.env.CLIENT_URL;

    logger.debug('[Email Service] Preparing email template', {
      severity: alert.severity,
      templateData: {
        alertEmoji: severityEmoji[alert.severity],
        alertSeverity: alert.severity,
        alertSeverityClass: alert.severity.toLowerCase(),
        alertMessage: alert.message,
        deviceId: alert.deviceId,
        parameter: alert.parameter,
        value: alert.value,
        timestamp: alert.timestamp.toLocaleString(),
        appUrl,
      },
    });

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
      headers: {
        'X-Priority': alert.severity === 'Critical' ? '1' : '3',
        'X-Mailer': 'Water Quality Monitor System',
        'List-Unsubscribe': `<${appUrl}/unsubscribe?email=${encodeURIComponent(user.email)}>`,
      },
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

    logger.info('[Email Service] Sending email', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
    });

    const info = await transporter.sendMail(mailOptions);
    logger.info('[Email Service] Alert email sent successfully', {
      recipientEmail: user.email,
      messageId: info.messageId,
      alertSeverity: alert.severity,
      response: info.response,
      envelope: info.envelope,
    });
    return true;
  } catch (error) {
    logger.error('[Email Service] Error sending alert email', {
      recipientEmail: user.email,
      alertId: alert.alertId,
      error: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      command: error.command,
      stack: error.stack,
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
        headers: {
          'X-Mailer': 'Water Quality Monitor System',
          'X-Test-Email': 'true',
        },
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
  sendAlertEmail,
  testEmailConfiguration,
};
