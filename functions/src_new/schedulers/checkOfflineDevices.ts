import * as admin from "firebase-admin";
import {logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";

import {db} from "../config/firebase";
import {COLLECTIONS} from "../constants/database.constants";
import {SCHEDULER_CONFIG} from "../constants/Scheduler.Constants";

const DEFAULT_CHECK_INTERVAL_MINUTES = 2; // Reduced from 5 to 2 minutes for faster detection
const MANILA_TIMEZONE = SCHEDULER_CONFIG.TIMEZONE;
const BATCH_LIMIT = 500;

/**
 * Calculate offline threshold in ms.
 * Threshold = interval × 1.5 (tighter tolerance for faster detection)
 *
 * OPTIMIZATION: Changed from 2x to 1.5x multiplier
 * - Old: 5 min interval × 2 = 10 min threshold
 * - New: 5 min interval × 1.5 = 7.5 min threshold
 *
 * @param {number} intervalMinutes - The check interval in minutes.
 * @return {number} The offline threshold in milliseconds.
 */
function calculateOfflineThreshold(intervalMinutes: number): number {
  return intervalMinutes * 1.5 * 60 * 1000; // 7.5 minutes (was 10 min)
}

/**
 * Create batch chunks since Firestore limits to 500 writes per batch.
 * @param {FirebaseFirestore.WriteBatch[]} batches - Array of Firestore write batches to commit.
 * @return {Promise<void>} A promise that resolves when all batches are committed.
 */
async function commitBatches(batches: FirebaseFirestore.WriteBatch[]): Promise<void> {
  for (const batch of batches) {
    await batch.commit();
  }
}

export const checkOfflineDevices = onSchedule(
  {
    schedule: `*/${DEFAULT_CHECK_INTERVAL_MINUTES} * * * *`,
    timeZone: MANILA_TIMEZONE,
    region: "us-central1",
    retryCount: 0,
    minInstances: 0,
    maxInstances: 1,
  },
  async () => {
    const start = Date.now();
    logger.info("Starting offline device check (Manila Time)...");

    try {
      const interval = DEFAULT_CHECK_INTERVAL_MINUTES;
      const offlineThresholdMs = calculateOfflineThreshold(interval);
      const now = Date.now();
      const offlineThreshold = now - offlineThresholdMs;

      logger.info("Configuration loaded", {
        intervalMinutes: interval,
        offlineThresholdMinutes: interval * 1.5,
        offlineThresholdMs: offlineThresholdMs,
        timezone: MANILA_TIMEZONE,
      });

      // Query only devices that are currently online
      // OPTIMIZATION: Skip devices already marked offline (no need to re-check)
      const devicesQuery = db
        .collection(COLLECTIONS.DEVICES)
        .where("status", "==", "online");

      const stream = devicesQuery.stream();

      let devicesChecked = 0;
      let devicesMarkedOffline = 0;
      let currentBatch = db.batch();
      const batches: FirebaseFirestore.WriteBatch[] = [];

      for await (const doc of stream as AsyncIterable<FirebaseFirestore.QueryDocumentSnapshot>) {
        devicesChecked++;
        const deviceData = doc.data();
        const deviceId = doc.id;

        const lastSeen = deviceData.lastSeen?.toMillis?.() ?? 0;

        const shouldMarkOffline = !lastSeen || lastSeen < offlineThreshold;

        if (shouldMarkOffline) {
          const minutesAgo = lastSeen ? Math.floor((now - lastSeen) / 60000) : "unknown";
          logger.info(`STATE TRANSITION: ${deviceId} (${deviceData.status} → offline)`, {
            deviceId,
            previousStatus: deviceData.status,
            newStatus: "offline",
            lastSeen: lastSeen ? new Date(lastSeen).toISOString() : "N/A",
            minutesAgo,
            threshold: `${interval * 1.5} minutes`,
          });

          currentBatch.update(doc.ref, {
            status: "offline",
            offlineSince: admin.firestore.FieldValue.serverTimestamp(),
          });
          devicesMarkedOffline++;

          // Handle batch size limit
          if (devicesMarkedOffline % BATCH_LIMIT === 0) {
            batches.push(currentBatch);
            currentBatch = db.batch();
          }
        }
      }

      // Push any remaining batch
      if (devicesMarkedOffline % BATCH_LIMIT !== 0) {
        batches.push(currentBatch);
      }

      if (batches.length > 0) {
        await commitBatches(batches);
      }

      const durationSec = ((Date.now() - start) / 1000).toFixed(2);
      logger.info("Offline device check completed", {
        totalDevicesChecked: devicesChecked,
        devicesMarkedOffline,
        timezone: MANILA_TIMEZONE,
        durationSec,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error during offline device check", {error});
    }
  }
);
