/**
 * Centralized Email Service
 * Provides a unified interface for sending all types of email notifications
 * using external HTML templates with dynamic data injection.
 *
 * @module utils/emailService
 *
 * Features:
 * - Template-based email generation
 * - Type-safe data injection
 * - Automatic template selection
 * - Error handling and logging
 * - Reusable across all schedulers
 *
 * Usage:
 * ```typescript
 * import { sendEmail } from './utils/emailService';
 *
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Alert Notification',
 *   templateName: 'staleAlert',
 *   templateData: { recipientName: 'John', ... }
 * });
 * ```
 */

import * as fs from "fs";
import * as path from "path";

import {logger} from "firebase-functions/v2";
import * as nodemailer from "nodemailer";

import {getEmailCredentials} from "../config/email";

/**
 * Email template names
 */
export type EmailTemplateName = "analytics" | "realTimeAlert";

/**
 * Base email options
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  templateName: EmailTemplateName;
  templateData: Record<string, unknown>;
  fromName?: string;
}

/**
 * Template data for analytics emails
 */
export interface AnalyticsTemplateData {
  recipientName: string;
  reportTitle: string;
  reportType: string;
  periodText: string;
  periodTextLower: string;
  periodRange: string;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  healthScore: number;
  healthScoreColor: string;
  criticalCount: number;
  warningCount: number;
  advisoryCount: number;
  totalAlerts: number;
  alertSummaryBg: string;
  alertSummaryBorder: string;
  deviceTable: string;
  alertTable: string;
  dashboardUrl: string;
  timestamp: string;
}

/**
 * Template data for real-time alert emails
 */
export interface RealTimeAlertTemplateData {
  recipientName: string;
  severity: string;
  severityColor: string;
  alertBoxBg: string;
  deviceName: string;
  deviceId: string;
  alertMessage: string;
  parameterDisplay: string;
  alertType: string;
  currentValue: string;
  thresholdValue: string;
  thresholdLabel: string;
  unit: string;
  recommendedAction: string;
  deviceLocation: string;
  dashboardUrl: string;
  alertId: string;
  timestamp: string;
}

/**
 * Load HTML template from file system
 *
 * @param {EmailTemplateName} templateName - Name of the template file
 * @return {string} Template HTML content
 */
function loadTemplate(templateName: EmailTemplateName): string {
  try {
    const templatePath = path.join(__dirname, "email_Templates", `${templateName}.html`);
    const template = fs.readFileSync(templatePath, "utf-8");
    return template;
  } catch (error) {
    logger.error(`Failed to load email template: ${templateName}`, error);
    throw new Error(`Email template not found: ${templateName}`);
  }
}

/**
 * Inject dynamic data into HTML template
 * Replaces all {{placeholder}} tokens with actual values
 *
 * @param {string} template - HTML template string
 * @param {Record<string, unknown>} data - Data object with values to inject
 * @return {string} Processed HTML with injected data
 */
function injectTemplateData(template: string, data: Record<string, unknown>): string {
  let result = template;

  // Replace all {{key}} placeholders with actual values
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, "g");
    const stringValue = value !== null && value !== undefined ? String(value) : "";
    result = result.replace(placeholder, stringValue);
  });

  return result;
}

/**
 * Create Nodemailer transporter
 * Reuses configuration from config/email.ts
 *
 * @return {nodemailer.Transporter} Configured email transporter
 */
function createTransporter(): nodemailer.Transporter {
  const credentials = getEmailCredentials();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: credentials.user,
      pass: credentials.password,
    },
  });
}

/**
 * Send email with specified template and data
 *
 * @param {SendEmailOptions} options - Email sending options
 * @return {Promise<void>} Promise that resolves when email is sent
 *
 * @throws {Error} If template loading or email sending fails
 *
 * @example
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Stale Alert Notification',
 *   templateName: 'staleAlert',
 *   templateData: {
 *     recipientName: 'John Doe',
 *     totalCount: 5,
 *     alertRows: '<tr>...</tr>',
 *     dashboardUrl: 'https://app.com/dashboard',
 *     timestamp: '2025-11-07 10:00 AM'
 *   }
 * });
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const {to, subject, templateName, templateData, fromName = "Water Quality Monitoring"} = options;

  try {
    // Load template
    logger.info(`[Email Service] Loading template: ${templateName}`);
    const template = loadTemplate(templateName);

    // Inject data into template
    const htmlContent = injectTemplateData(template, templateData);

    // Get credentials and create transporter
    const credentials = getEmailCredentials();
    const transporter = createTransporter();

    // Prepare mail options
    const mailOptions = {
      from: `"${fromName}" <${credentials.user}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html: htmlContent,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    logger.info(`[Email Service] Successfully sent ${templateName} email to ${to}`);
  } catch (error) {
    logger.error(`[Email Service] Failed to send ${templateName} email to ${to}:`, {
      subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Helper function to get severity badge color
 *
 * @param {string} severity - Alert severity level
 * @return {string} Hex color code for severity badge
 */
export function getSeverityColor(severity: string): string {
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
 * Helper function to get health score color
 *
 * @param {number} score - Health score percentage
 * @return {string} Hex color code
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

/**
 * Helper function to get alert box background color
 *
 * @param {string} severity - Alert severity level
 * @return {string} Hex color code for alert box background
 */
export function getAlertBoxBackground(severity: string): string {
  switch (severity) {
  case "Critical":
    return "#fef2f2";
  case "Warning":
    return "#fffbeb";
  case "Advisory":
    return "#eff6ff";
  default:
    return "#f9fafb";
  }
}

/**
 * Helper function to get parameter unit
 *
 * @param {string} parameter - Water quality parameter
 * @return {string} Unit symbol
 */
export function getParameterUnit(parameter: string): string {
  const param = parameter.toLowerCase();
  switch (param) {
  case "ph":
    return "";
  case "tds":
    return "ppm";
  case "turbidity":
    return "NTU";
  case "temperature":
    return "°C";
  case "dissolvedoxygen":
  case "dissolved_oxygen":
    return "mg/L";
  case "conductivity":
    return "μS/cm";
  default:
    return "";
  }
}

/**
 * Helper function to get parameter display name
 *
 * @param {string} parameter - Water quality parameter
 * @return {string} Display name
 */
export function getParameterDisplayName(parameter: string): string {
  const param = parameter.toLowerCase();
  switch (param) {
  case "ph":
    return "pH Level";
  case "tds":
    return "Total Dissolved Solids (TDS)";
  case "turbidity":
    return "Turbidity";
  default:
    return parameter.toUpperCase();
  }
}

/**
 * Helper function to format timestamp for emails
 *
 * @param {Date} date - Date to format
 * @param {string} timezone - Timezone (default: Asia/Manila)
 * @return {string} Formatted timestamp string
 */
export function formatEmailTimestamp(date: Date, timezone = "Asia/Manila"): string {
  return date.toLocaleString("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
