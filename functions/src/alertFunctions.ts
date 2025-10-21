/**
 * Water Quality Alert System - Cloud Functions
 * Monitors sensor readings and generates alerts based on thresholds and trends
 */

import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";

// ===========================
// TYPE DEFINITIONS
// ===========================

type AlertSeverity = "Advisory" | "Warning" | "Critical";
type AlertStatus = "Active" | "Acknowledged" | "Resolved";
type WaterParameter = "tds" | "ph" | "turbidity";
type TrendDirection = "increasing" | "decreasing" | "stable";
type AlertType = "threshold" | "trend";

interface SensorReading {
  deviceId: string;
  tds: number;
  ph: number;
  turbidity: number;
  timestamp: number;
  receivedAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
}

interface WaterQualityAlert {
  alertId: string;
  deviceId: string;
  deviceName?: string;
  parameter: WaterParameter;
  alertType: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  currentValue: number;
  thresholdValue?: number;
  trendDirection?: TrendDirection;
  message: string;
  recommendedAction: string;
  createdAt: admin.firestore.FieldValue;
  notificationsSent: string[];
  metadata?: {
    previousValue?: number;
    changeRate?: number;
    location?: string;
  };
}

interface ThresholdConfig {
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  unit: string;
}

interface AlertThresholds {
  tds: ThresholdConfig;
  ph: ThresholdConfig;
  turbidity: ThresholdConfig;
  trendDetection: {
    enabled: boolean;
    thresholdPercentage: number;
    timeWindowMinutes: number;
  };
}

interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  alertSeverities: AlertSeverity[];
  parameters: WaterParameter[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// ===========================
// DEFAULT CONFIGURATIONS
// ===========================

const DEFAULT_THRESHOLDS: AlertThresholds = {
  tds: {
    warningMin: 0,
    warningMax: 500,
    criticalMin: 0,
    criticalMax: 1000,
    unit: "ppm",
  },
  ph: {
    warningMin: 6.0,
    warningMax: 8.5,
    criticalMin: 5.5,
    criticalMax: 9.0,
    unit: "",
  },
  turbidity: {
    warningMin: 0,
    warningMax: 5,
    criticalMin: 0,
    criticalMax: 10,
    unit: "NTU",
  },
  trendDetection: {
    enabled: true,
    thresholdPercentage: 15,
    timeWindowMinutes: 30,
  },
};

// ===========================
// EMAIL CONFIGURATION
// ===========================

// For Firebase Functions v2, use direct credentials
// These should be set via environment variables in production
const EMAIL_USER = "hed-tjyuzon@smu.edu.ph";
const EMAIL_PASSWORD = "khjo xjed akne uonm";

// Configure nodemailer transporter
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

logger.info("Email transporter configured", {user: EMAIL_USER});

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Get parameter unit string
 * @param {WaterParameter} parameter - The water parameter
 * @return {string} The unit string for the parameter
 */
function getParameterUnit(parameter: WaterParameter): string {
  switch (parameter) {
  case "tds":
    return "ppm";
  case "ph":
    return "";
  case "turbidity":
    return "NTU";
  default:
    return "";
  }
}

/**
 * Get parameter display name
 * @param {WaterParameter} parameter - The water parameter
 * @return {string} The display name for the parameter
 */
function getParameterName(parameter: WaterParameter): string {
  switch (parameter) {
  case "tds":
    return "TDS (Total Dissolved Solids)";
  case "ph":
    return "pH Level";
  case "turbidity":
    return "Turbidity";
  default:
    return parameter;
  }
}

/**
 * Get current threshold configuration from Firestore
 * @param {admin.firestore.Firestore} db - The Firestore database instance
 * @return {Promise<AlertThresholds>} The threshold configuration
 */
async function getThresholdConfig(
  db: admin.firestore.Firestore
): Promise<AlertThresholds> {
  try {
    const configDoc = await db
      .collection("alertSettings")
      .doc("thresholds")
      .get();

    if (configDoc.exists) {
      return configDoc.data() as AlertThresholds;
    }
  } catch (error) {
    logger.warn("Failed to load threshold config, using defaults:", error);
  }

  return DEFAULT_THRESHOLDS;
}

/**
 * Check if value exceeds thresholds
 * @param {WaterParameter} parameter - The water parameter to check
 * @param {number} value - The current value
 * @param {AlertThresholds} thresholds - The threshold configuration
 * @return {object} Object containing exceeded flag, severity, and threshold
 */
function checkThreshold(
  parameter: WaterParameter,
  value: number,
  thresholds: AlertThresholds
): { exceeded: boolean; severity: AlertSeverity | null; threshold: number | null } {
  const config = thresholds[parameter];

  // Check critical thresholds first
  if (config.criticalMax !== undefined && value > config.criticalMax) {
    return {
      exceeded: true,
      severity: "Critical",
      threshold: config.criticalMax,
    };
  }
  if (config.criticalMin !== undefined && value < config.criticalMin) {
    return {
      exceeded: true,
      severity: "Critical",
      threshold: config.criticalMin,
    };
  }

  // Check warning thresholds
  if (config.warningMax !== undefined && value > config.warningMax) {
    return {
      exceeded: true,
      severity: "Warning",
      threshold: config.warningMax,
    };
  }
  if (config.warningMin !== undefined && value < config.warningMin) {
    return {
      exceeded: true,
      severity: "Warning",
      threshold: config.warningMin,
    };
  }

  return {exceeded: false, severity: null, threshold: null};
}

/**
 * Analyze trend for a parameter
 * @param {admin.firestore.Firestore} db - The Firestore database instance
 * @param {string} deviceId - The device ID
 * @param {WaterParameter} parameter - The water parameter
 * @param {number} currentValue - The current value
 * @param {AlertThresholds} thresholds - The threshold configuration
 * @return {Promise<object | null>} Trend analysis result or null
 */
async function analyzeTrend(
  db: admin.firestore.Firestore,
  deviceId: string,
  parameter: WaterParameter,
  currentValue: number,
  thresholds: AlertThresholds
): Promise<{
  hasTrend: boolean;
  direction: TrendDirection;
  changeRate: number;
  previousValue: number;
} | null> {
  if (!thresholds.trendDetection.enabled) {
    return null;
  }

  const timeWindow = thresholds.trendDetection.timeWindowMinutes;
  const thresholdPercentage = thresholds.trendDetection.thresholdPercentage;
  const windowStart = Date.now() - timeWindow * 60 * 1000;

  try {
    // Get readings from the time window
    const readingsSnapshot = await db
      .collection("readings")
      .where("deviceId", "==", deviceId)
      .where("timestamp", ">=", windowStart)
      .orderBy("timestamp", "asc")
      .limit(10)
      .get();

    if (readingsSnapshot.empty || readingsSnapshot.size < 2) {
      return null;
    }

    // Get first and current values
    const firstReading = readingsSnapshot.docs[0].data() as SensorReading;
    const previousValue = firstReading[parameter];
    const changeRate = ((currentValue - previousValue) / previousValue) * 100;

    // Check if change exceeds threshold
    if (Math.abs(changeRate) >= thresholdPercentage) {
      return {
        hasTrend: true,
        direction: changeRate > 0 ? "increasing" : "decreasing",
        changeRate: Math.abs(changeRate),
        previousValue,
      };
    }
  } catch (error) {
    logger.error("Error analyzing trend:", error);
  }

  return null;
}

/**
 * Generate alert message and recommended action
 * @param {WaterParameter} parameter - The water parameter
 * @param {number} value - The current value
 * @param {AlertSeverity} severity - The alert severity
 * @param {AlertType} alertType - The type of alert
 * @param {TrendDirection} trendDirection - The trend direction (optional)
 * @return {object} Object containing message and recommendedAction
 */
function generateAlertContent(
  parameter: WaterParameter,
  value: number,
  severity: AlertSeverity,
  alertType: AlertType,
  trendDirection?: TrendDirection
): { message: string; recommendedAction: string } {
  const paramName = getParameterName(parameter);
  const unit = getParameterUnit(parameter);
  const valueStr = `${value.toFixed(2)}${unit ? " " + unit : ""}`;

  let message = "";
  let recommendedAction = "";

  if (alertType === "threshold") {
    message =
      `${paramName} has reached ${severity.toLowerCase()} level: ` +
      `${valueStr}`;

    switch (severity) {
    case "Critical":
      recommendedAction =
        "Immediate action required. Investigate water source and " +
        "treatment system. Consider temporary shutdown if necessary.";
      break;
    case "Warning":
      recommendedAction =
        "Monitor closely and prepare corrective actions. Schedule " +
        "system inspection within 24 hours.";
      break;
    case "Advisory":
      recommendedAction =
        "Continue monitoring. Note for regular maintenance schedule.";
      break;
    }
  } else if (alertType === "trend") {
    const direction =
      trendDirection === "increasing" ? "increasing" : "decreasing";
    message = `${paramName} is ${direction} abnormally: ${valueStr}`;
    recommendedAction =
      `Investigate cause of ${direction} trend. Check system ` +
      "calibration and recent changes to water source or treatment.";
  }

  return {message, recommendedAction};
}

/**
 * Create alert in Firestore
 * @param {admin.firestore.Firestore} db - The Firestore database instance
 * @param {string} deviceId - The device ID
 * @param {WaterParameter} parameter - The water parameter
 * @param {AlertType} alertType - The type of alert
 * @param {AlertSeverity} severity - The alert severity
 * @param {number} currentValue - The current value
 * @param {number | null} thresholdValue - The threshold value
 * @param {TrendDirection} trendDirection - The trend direction (optional)
 * @param {Record<string, unknown>} metadata - Additional metadata (optional)
 * @return {Promise<string>} The created alert ID
 */
async function createAlert(
  db: admin.firestore.Firestore,
  deviceId: string,
  parameter: WaterParameter,
  alertType: AlertType,
  severity: AlertSeverity,
  currentValue: number,
  thresholdValue: number | null,
  trendDirection?: TrendDirection,
  metadata?: Record<string, unknown>
): Promise<string> {
  const {message, recommendedAction} = generateAlertContent(
    parameter,
    currentValue,
    severity,
    alertType,
    trendDirection
  );

  // Get device name
  let deviceName = "Unknown Device";
  try {
    const deviceDoc = await db.collection("devices").doc(deviceId).get();
    if (deviceDoc.exists) {
      deviceName = deviceDoc.data()?.name || deviceId;
    }
  } catch (error) {
    logger.warn("Failed to fetch device name:", error);
  }

  const alertData: Partial<WaterQualityAlert> = {
    deviceId,
    deviceName,
    parameter,
    alertType,
    severity,
    status: "Active",
    currentValue,
    ...(thresholdValue !== null && {thresholdValue}),
    ...(trendDirection && {trendDirection}),
    message,
    recommendedAction,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    notificationsSent: [],
    ...(metadata && {metadata}),
  };

  const alertRef = await db.collection("alerts").add(alertData);
  await alertRef.update({alertId: alertRef.id});

  logger.info(
    `Alert created: ${alertRef.id}`,
    {deviceId, parameter, severity}
  );

  return alertRef.id;
}

/**
 * Get users who should be notified
 * @param {admin.firestore.Firestore} db - The Firestore database instance
 * @param {Partial<WaterQualityAlert>} alert - The alert data
 * @return {Promise<NotificationPreferences[]>} List of users to notify
 */
async function getNotificationRecipients(
  db: admin.firestore.Firestore,
  alert: Partial<WaterQualityAlert>
): Promise<NotificationPreferences[]> {
  try {
    const prefsSnapshot = await db
      .collection("notificationPreferences")
      .where("emailNotifications", "==", true)
      .get();

    const recipients: NotificationPreferences[] = [];
    const currentHour = new Date().getHours();

    for (const doc of prefsSnapshot.docs) {
      const prefs = doc.data() as NotificationPreferences;

      // Check severity filter
      if (!prefs.alertSeverities.includes(alert.severity!)) {
        continue;
      }

      // Check parameter filter
      if (prefs.parameters.length > 0 &&
          !prefs.parameters.includes(alert.parameter!)) {
        continue;
      }

      // Check device filter
      if (prefs.devices.length > 0 &&
          !prefs.devices.includes(alert.deviceId!)) {
        continue;
      }

      // Check quiet hours
      if (
        prefs.quietHoursEnabled &&
        prefs.quietHoursStart &&
        prefs.quietHoursEnd
      ) {
        const startHour = parseInt(prefs.quietHoursStart.split(":")[0]);
        const endHour = parseInt(prefs.quietHoursEnd.split(":")[0]);

        if (currentHour >= startHour && currentHour < endHour) {
          continue; // Skip during quiet hours
        }
      }

      recipients.push(prefs);
    }

    return recipients;
  } catch (error) {
    logger.error("Error fetching notification recipients:", error);
    return [];
  }
}

/**
 * Send email notification
 * @param {NotificationPreferences} recipient - The recipient preferences
 * @param {Partial<WaterQualityAlert>} alert - The alert data
 * @return {Promise<boolean>} True if email sent successfully
 */
async function sendEmailNotification(
  recipient: NotificationPreferences,
  alert: Partial<WaterQualityAlert>
): Promise<boolean> {
  try {
    const severityColor = alert.severity === "Critical" ? "#ff4d4f" :
      alert.severity === "Warning" ? "#faad14" : "#1890ff";

    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@puretrack.com",
      to: recipient.email,
      subject:
        `[${alert.severity}] Water Quality Alert - ` +
        `${getParameterName(alert.parameter!)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; 
          margin: 0 auto;">
          <div style="background: ${severityColor}; color: white; 
            padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">⚠️ Water Quality Alert</h2>
          </div>
          <div style="background: #f5f5f5; padding: 20px; 
            border-radius: 0 0 8px 8px;">
            <div style="background: white; padding: 20px; 
              border-radius: 8px; margin-bottom: 15px;">
              <h3 style="color: ${severityColor}; margin-top: 0;">
                ${alert.severity} Alert
              </h3>
              <p><strong>Device:</strong> ${alert.deviceName}</p>
              <p>
                <strong>Parameter:</strong>
                ${getParameterName(alert.parameter!)}
              </p>
              <p>
                <strong>Current Value:</strong>
                ${alert.currentValue?.toFixed(2)}
                ${getParameterUnit(alert.parameter!)}
              </p>
              ${
  alert.thresholdValue ?
    "<p><strong>Threshold:</strong> " +
                  `${alert.thresholdValue} ` +
                  `${getParameterUnit(alert.parameter!)}</p>` :
    ""
}
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div style="background: white; padding: 20px; 
              border-radius: 8px; margin-bottom: 15px;">
              <h4 style="margin-top: 0;">Message</h4>
              <p>${alert.message}</p>
            </div>
            <div style="background: #fff3cd; padding: 20px; 
              border-radius: 8px; border-left: 4px solid #faad14;">
              <h4 style="margin-top: 0;">Recommended Action</h4>
              <p>${alert.recommendedAction}</p>
            </div>
            <div style="margin-top: 20px; text-align: center;">
              <p style="color: #666; font-size: 12px;">
                This is an automated alert from PureTrack Water Quality
                Monitoring System
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    logger.info(`Email sent to ${recipient.email} for alert ${alert.alertId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${recipient.email}:`, error);
    return false;
  }
}

/**
 * Process and send notifications for an alert
 * @param {admin.firestore.Firestore} db - The Firestore database instance
 * @param {string} alertId - The alert ID
 * @param {Partial<WaterQualityAlert>} alert - The alert data
 * @return {Promise<void>} Promise that resolves when complete
 */
async function processNotifications(
  db: admin.firestore.Firestore,
  alertId: string,
  alert: Partial<WaterQualityAlert>
): Promise<void> {
  const recipients = await getNotificationRecipients(db, alert);

  if (recipients.length === 0) {
    logger.info(`No recipients found for alert ${alertId}`);
    return;
  }

  const notifiedUsers: string[] = [];

  for (const recipient of recipients) {
    const success = await sendEmailNotification(recipient, alert);
    if (success) {
      notifiedUsers.push(recipient.userId);
    }
  }

  // Update alert with notification status
  await db.collection("alerts").doc(alertId).update({
    notificationsSent:
      admin.firestore.FieldValue.arrayUnion(...notifiedUsers),
  });

  logger.info(
    `Notifications sent for alert ${alertId} to ${notifiedUsers.length} users`
  );
}

// ===========================
// CLOUD FUNCTIONS
// ===========================

/**
 * Monitor new sensor readings and generate alerts
 * Triggered when a new reading document is created
 */
export const monitorSensorReadings = onDocumentCreated(
  "readings/{readingId}",
  async (event) => {
    const reading = event.data?.data() as SensorReading;
    if (!reading) {
      return;
    }

    const db = admin.firestore();
    const thresholds = await getThresholdConfig(db);

    logger.info(`Processing reading for device ${reading.deviceId}`);

    // Check each parameter for threshold violations
    const parameters: WaterParameter[] = ["tds", "ph", "turbidity"];

    for (const parameter of parameters) {
      const value = reading[parameter];

      // Check threshold violation
      const thresholdCheck = checkThreshold(parameter, value, thresholds);

      if (thresholdCheck.exceeded) {
        const alertId = await createAlert(
          db,
          reading.deviceId,
          parameter,
          "threshold",
          thresholdCheck.severity!,
          value,
          thresholdCheck.threshold,
          undefined,
          {location: reading.deviceId}
        );

        // Get the created alert
        const alertDoc = await db.collection("alerts").doc(alertId).get();
        const alertData = {
          alertId,
          ...alertDoc.data(),
        } as Partial<WaterQualityAlert>;

        // Process notifications in background
        await processNotifications(db, alertId, alertData);
      }

      // Check for trends
      const trendAnalysis = await analyzeTrend(
        db,
        reading.deviceId,
        parameter,
        value,
        thresholds
      );

      if (trendAnalysis && trendAnalysis.hasTrend) {
        const severity: AlertSeverity =
          trendAnalysis.changeRate > 30 ? "Critical" :
            trendAnalysis.changeRate > 20 ? "Warning" : "Advisory";

        const alertId = await createAlert(
          db,
          reading.deviceId,
          parameter,
          "trend",
          severity,
          value,
          null,
          trendAnalysis.direction,
          {
            previousValue: trendAnalysis.previousValue,
            changeRate: trendAnalysis.changeRate,
          }
        );

        // Get the created alert
        const alertDoc = await db.collection("alerts").doc(alertId).get();
        const alertData = {
          alertId,
          ...alertDoc.data(),
        } as Partial<WaterQualityAlert>;

        // Process notifications
        await processNotifications(db, alertId, alertData);
      }
    }
  }
);

/**
 * Scheduled function to check for stale alerts and send reminders
 * Runs every hour
 */
export const checkStaleAlerts = onSchedule("every 1 hours", async () => {
  const db = admin.firestore();

  try {
    // Find active critical alerts older than 2 hours
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    const staleAlertsSnapshot = await db
      .collection("alerts")
      .where("status", "==", "Active")
      .where("severity", "==", "Critical")
      .get();

    for (const doc of staleAlertsSnapshot.docs) {
      const alert = doc.data() as WaterQualityAlert;
      const createdAt =
        (alert.createdAt as admin.firestore.Timestamp).toMillis();

      if (createdAt < twoHoursAgo) {
        logger.warn(`Stale critical alert found: ${doc.id}`);
        // Could implement escalation logic here
        // For now, just log it
      }
    }
  } catch (error) {
    logger.error("Error checking stale alerts:", error);
  }
});

/**
 * Initialize default threshold configuration
 * Call this once to set up default thresholds
 * @param {admin.firestore.Firestore} db - The Firestore database instance
 * @return {Promise<void>} Promise that resolves when complete
 */
export const initializeAlertThresholds = async (
  db: admin.firestore.Firestore
): Promise<void> => {
  try {
    await db
      .collection("alertSettings")
      .doc("thresholds")
      .set(DEFAULT_THRESHOLDS);
    logger.info("Default alert thresholds initialized");
  } catch (error) {
    logger.error("Failed to initialize thresholds:", error);
  }
};
