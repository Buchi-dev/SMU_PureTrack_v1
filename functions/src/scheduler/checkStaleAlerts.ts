import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {db} from "../config/firebase";
import type {WaterQualityAlert} from "../types";

/**
 * Check for stale critical alerts and log warnings
 * Runs every hour to monitor unresolved critical alerts
 */
export const checkStaleAlerts = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "Asia/Manila",
    retryCount: 3,
  },
  async () => {
    try {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

      const staleAlertsSnapshot = await db
        .collection("alerts")
        .where("status", "==", "Active")
        .where("severity", "==", "Critical")
        .get();

      let staleCount = 0;
      for (const doc of staleAlertsSnapshot.docs) {
        const alert = doc.data() as WaterQualityAlert;
        const createdAt = (alert.createdAt as admin.firestore.Timestamp)
          .toMillis();

        if (createdAt < twoHoursAgo) {
          logger.warn(
            `Stale critical alert: ${doc.id} - Device: ${alert.deviceId}, ` +
            `Parameter: ${alert.parameter}`
          );
          staleCount++;
        }
      }

      if (staleCount > 0) {
        logger.warn(`Found ${staleCount} stale critical alert(s) requiring attention`);
      } else {
        logger.info("No stale critical alerts found");
      }
    } catch (error) {
      logger.error("Error checking stale alerts:", error);
      throw error; // Allow retry
    }
  }
);
