/**
 * Check Offline Devices - Scheduled Function
 *
 * HIGH PRIORITY: Marks devices as offline when they haven't sent data recently
 *
 * @module scheduler/checkOfflineDevices
 *
 * Functionality:
 * - Runs every 5 minutes (aligned with device heartbeat interval)
 * - Checks lastSeen timestamp for all devices
 * - Marks devices as offline if lastSeen > 10 minutes old
 * - Provides grace period to account for network delays
 *
 * Schedule: Every 5 minutes (cron: */5 * * * *)
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { db } from "../config/firebase";
import { COLLECTIONS } from "../constants/database.constants";

/**
 * Threshold for marking devices as offline (10 minutes in milliseconds)
 * Devices send heartbeats every 5 minutes, so 10 minutes allows for:
 * - One missed heartbeat
 * - Network delays
 * - Processing time
 */
const OFFLINE_THRESHOLD_MS = 600000; // 10 minutes

/**
 * Check for offline devices and update their status
 *
 * Schedule: Runs every 5 minutes
 * Time Zone: America/Chicago (adjust as needed)
 *
 * Process:
 * 1. Query all devices from Firestore
 * 2. Check lastSeen timestamp for each device
 * 3. If lastSeen > 10 minutes ago, mark as offline
 * 4. Only update devices that are currently marked as "online"
 *
 * @example
 * // Deployed as scheduled function:
 * firebase deploy --only functions:checkOfflineDevices
 */
export const checkOfflineDevices = onSchedule(
  {
    schedule: "*/5 * * * *", // Every 5 minutes
    timeZone: "America/Chicago", // US Central Time
    region: "us-central1",
    retryCount: 0, // Don't retry on failure
    minInstances: 0,
    maxInstances: 1,
  },
  async (event) => {
    try {
      logger.info("Starting offline device check...");

      const now = Date.now();
      const offlineThreshold = now - OFFLINE_THRESHOLD_MS;

      // Query all devices
      const devicesSnapshot = await db.collection(COLLECTIONS.DEVICES).get();

      if (devicesSnapshot.empty) {
        logger.info("No devices found in database");
        return;
      }

      const batch = db.batch();
      let devicesChecked = 0;
      let devicesMarkedOffline = 0;

      // Check each device
      devicesSnapshot.forEach((doc) => {
        devicesChecked++;
        const deviceData = doc.data();
        const deviceId = doc.id;

        // Skip if device is already offline or in maintenance
        if (deviceData.status === "offline" || deviceData.status === "maintenance") {
          return;
        }

        // Check lastSeen timestamp
        if (deviceData.lastSeen) {
          const lastSeenTimestamp = deviceData.lastSeen.toMillis();

          // Mark as offline if lastSeen is older than threshold
          if (lastSeenTimestamp < offlineThreshold) {
            const timeSinceLastSeen = Math.floor((now - lastSeenTimestamp) / 1000 / 60); // minutes
            logger.info(
              `Marking device ${deviceId} as offline (last seen ${timeSinceLastSeen} minutes ago)`
            );

            batch.update(doc.ref, {
              status: "offline",
              offlineSince: admin.firestore.FieldValue.serverTimestamp(),
            });

            devicesMarkedOffline++;
          }
        } else {
          // No lastSeen timestamp - mark as offline
          logger.warn(`Device ${deviceId} has no lastSeen timestamp, marking as offline`);
          batch.update(doc.ref, {
            status: "offline",
            offlineSince: admin.firestore.FieldValue.serverTimestamp(),
          });
          devicesMarkedOffline++;
        }
      });

      // Commit batch updates
      if (devicesMarkedOffline > 0) {
        await batch.commit();
        logger.info(
          `Offline check complete: ${devicesChecked} devices checked, ${devicesMarkedOffline} marked as offline`
        );
      } else {
        logger.info(`Offline check complete: ${devicesChecked} devices checked, all online`);
      }
    } catch (error) {
      logger.error("Error checking offline devices:", error);
      // Don't throw - allow next scheduled run to proceed
    }
  }
);
