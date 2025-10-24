import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";
import {db, rtdb} from "../config/firebase";
import type {
  NotificationPreferences,
  AlertData,
  AlertSeverity,
  WaterParameter,
  AlertCounts,
  DeviceSummary,
  DeviceReport,
} from "../types";
import {sendDailyAnalyticsEmail as sendAnalyticsEmailToUser} from "../utils/email-templates";
import {calculateUptime} from "../utils/helpers";

/**
 * Daily Analytics Email - Send comprehensive analytics every morning at 6:00 AM PH Time
 * Includes device status, recent alerts, and water quality summary
 */
export const sendDailyAnalytics = onSchedule(
  {
    schedule: "0 6 * * *", // Every day at 6:00 AM
    timeZone: "Asia/Manila",
    retryCount: 2,
  },
  async () => {
    try {
      logger.info("Starting daily analytics email generation...");

      // Get all users with email notifications enabled
      const prefsSnapshot = await db
        .collection("notificationPreferences")
        .where("emailNotifications", "==", true)
        .get();

      if (prefsSnapshot.empty) {
        logger.info("No users configured for email notifications");
        return;
      }

      // Get date range (last 24 hours)
      const end = Date.now();
      const start = end - 24 * 60 * 60 * 1000;

      // Generate device status report
      const deviceReport = await generateDeviceStatusReport();

      // Get recent alerts (last 24 hours)
      const alertsSnapshot = await db
        .collection("alerts")
        .where("createdAt", ">=", new Date(start))
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const recentAlerts: AlertData[] = alertsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          severity: data.severity as AlertSeverity,
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          parameter: data.parameter as WaterParameter,
          currentValue: data.currentValue,
          createdAt: data.createdAt,
        };
      });

      // Count alerts by severity
      const alertCounts: AlertCounts = {
        Critical: 0,
        Warning: 0,
        Advisory: 0,
      };

      recentAlerts.forEach((alert: AlertData) => {
        if (alert.severity in alertCounts) {
          alertCounts[alert.severity]++;
        }
      });

      // Get water quality summary for all devices
      const devicesSnapshot = await db.collection("devices").get();
      const deviceSummaries: DeviceSummary[] = [];

      for (const deviceDoc of devicesSnapshot.docs) {
        const deviceId = deviceDoc.id;
        const deviceData = deviceDoc.data();

        // Get latest reading
        const latestSnapshot = await rtdb
          .ref(`sensorReadings/${deviceId}/latestReading`)
          .once("value");

        if (latestSnapshot.exists()) {
          const reading = latestSnapshot.val();
          deviceSummaries.push({
            deviceId,
            name: deviceData.name,
            location: deviceData.metadata?.location,
            status: deviceData.status,
            lastSeen: deviceData.lastSeen,
            reading: {
              turbidity: reading.turbidity,
              tds: reading.tds,
              ph: reading.ph,
              timestamp: reading.timestamp,
            },
          });
        }
      }

      // Send email to each recipient
      for (const doc of prefsSnapshot.docs) {
        const prefs = doc.data() as NotificationPreferences;

        try {
          await sendAnalyticsEmailToUser(
            prefs,
            deviceReport,
            recentAlerts,
            alertCounts,
            deviceSummaries
          );
          logger.info(`Daily analytics sent to ${prefs.email}`);
        } catch (error) {
          logger.error(`Failed to send daily analytics to ${prefs.email}:`, error);
        }
      }

      logger.info(`Daily analytics emails sent to ${prefsSnapshot.size} users`);
    } catch (error) {
      logger.error("Error sending daily analytics:", error);
      throw error; // Allow retry
    }
  }
);

/**
 * Generate device status report
 */
async function generateDeviceStatusReport(): Promise<DeviceReport> {
  const devicesSnapshot = await db.collection("devices").get();

  const statusSummary: Record<string, number> = {
    online: 0,
    offline: 0,
    error: 0,
    maintenance: 0,
  };

  const devices = devicesSnapshot.docs.map((doc) => {
    const data = doc.data();
    const status = data.status || "offline";
    statusSummary[status]++;

    const lastSeenTimestamp = data.lastSeen?.toMillis?.() || 0;
    const isActive = Date.now() - lastSeenTimestamp < 5 * 60 * 1000;

    return {
      deviceId: doc.id,
      name: data.name,
      type: data.type,
      status: isActive ? status : "offline",
      lastSeen: lastSeenTimestamp,
      firmwareVersion: data.firmwareVersion,
      sensors: data.sensors,
      location: data.metadata?.location,
      connectivity: isActive ? "active" : "inactive",
      uptime: calculateUptime(lastSeenTimestamp),
    };
  });

  const healthScore =
    devices.length > 0 ? Math.round((statusSummary.online / devices.length) * 100) : 0;

  return {
    summary: {
      totalDevices: devices.length,
      onlineDevices: statusSummary.online,
      offlineDevices: statusSummary.offline,
      healthScore,
    },
    devices,
  };
}
