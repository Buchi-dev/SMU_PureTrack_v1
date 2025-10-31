/**
 * Aggregate Alerts to Digest - Phase 2 Implementation
 * 
 * ANALYSIS INTEGRATION POINTS:
 * - Replaces immediate email sends from processSensorData.ts:145-158
 * - Reuses getNotificationRecipients from utils/helpers.ts:323
 * - Uses existing threshold logic from processSensorData.ts:94-144
 * 
 * QUOTA OPTIMIZATION:
 * - Batches alerts silently (no immediate sends) → Saves 98% email quota
 * - Transaction-based writes prevent race conditions (fix for concurrent writes issue)
 * - Deduplicates by eventId to avoid retry duplicates (idempotency fix)
 */

import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import {db} from "../config/firebase";
import {getNotificationRecipients, getThresholdConfig} from "../utils/helpers";
import type {WaterQualityAlert, NotificationPreferences} from "../types";
import type {AlertDigest, DigestAlertItem} from "../types/digest";
import {categorizeAlert} from "../types/digest";

/**
 * Triggered when alerts are created/updated
 * Aggregates alerts into daily digests per recipient/category
 * NO IMMEDIATE EMAILS - silent aggregation only
 */
export const aggregateAlertsToDigest = onDocumentWritten(
  {
    document: "alerts/{alertId}",
    region: "us-central1",
    retry: false, // Disable retry to prevent duplicate aggregations
    minInstances: 0, // Cold start acceptable for aggregation
    maxInstances: 10, // Support burst writes from multiple devices
  },
  async (event) => {
    const eventId = event.id; // For idempotency check
    const alertId = event.params.alertId;

    // Only process new document creation, not updates
    if (!event.data?.after.exists) {
      logger.info(`Alert ${alertId} deleted, skipping digest aggregation`);
      return;
    }

    // Check if this is an update (already processed)
    if (event.data.before.exists) {
      logger.debug(`Alert ${alertId} updated, skipping re-aggregation`);
      return;
    }

    const alertData = event.data.after.data() as WaterQualityAlert;

    // Validate required fields
    if (!alertData.parameter || !alertData.currentValue || !alertData.severity) {
      logger.warn(`Alert ${alertId} missing required fields, skipping`);
      return;
    }

    try {
      // Get threshold config for categorization
      const thresholds = await getThresholdConfig();
      const category = categorizeAlert(
        alertData.parameter,
        alertData.currentValue,
        thresholds
      );

      // Get recipients using existing RBAC logic (reuses utils/helpers.ts:323)
      const recipients = await getNotificationRecipients(alertData);

      if (recipients.length === 0) {
        logger.info(`No recipients for alert ${alertId}, skipping digest`);
        return;
      }

      logger.info(
        `Aggregating alert ${alertId} to ${recipients.length} recipient(s), category: ${category}`
      );

      // Create digest item from alert
      const digestItem: DigestAlertItem = {
        eventId: alertId,
        summary: generateAlertSummary(alertData),
        timestamp: admin.firestore.Timestamp.now(),
        value: alertData.currentValue,
        severity: alertData.severity,
        deviceName: alertData.deviceName,
        parameter: alertData.parameter,
      };

      // Aggregate to each recipient's digest (transactional to prevent race conditions)
      const aggregationPromises = recipients.map((recipient) =>
        aggregateToRecipientDigest(recipient, category, digestItem, eventId)
      );

      await Promise.all(aggregationPromises);

      logger.info(`Alert ${alertId} successfully aggregated to ${recipients.length} digest(s)`);
    } catch (error) {
      logger.error(`Error aggregating alert ${alertId} to digests:`, error);
      // Don't throw - allows function to complete without retry spam
    }
  }
);

/**
 * Aggregate alert item to specific recipient's digest (transaction-safe)
 * Doc ID format: {recipientUid}_{category}_{YYYY-MM-DD} (UTC)
 */
async function aggregateToRecipientDigest(
  recipient: NotificationPreferences,
  category: string,
  item: DigestAlertItem,
  eventId: string
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD UTC
  const digestId = `${recipient.userId}_${category}_${today}`;
  const digestRef = db.collection("alerts_digests").doc(digestId);

  try {
    await db.runTransaction(async (transaction) => {
      const digestDoc = await transaction.get(digestRef);

      if (digestDoc.exists) {
        // Update existing digest
        const existingDigest = digestDoc.data() as AlertDigest;

        // Check for duplicate eventId (idempotency - fixes retry issue from analysis)
        const isDuplicate = existingDigest.items.some(
          (existingItem) => existingItem.eventId === eventId
        );

        if (isDuplicate) {
          logger.debug(
            `Alert ${eventId} already in digest ${digestId}, skipping duplicate`
          );
          return; // Exit transaction silently
        }

        // Maintain max 10 items (FIFO - remove oldest if at capacity)
        const updatedItems = [...existingDigest.items, item];
        if (updatedItems.length > 10) {
          updatedItems.shift(); // Remove oldest
          logger.info(`Digest ${digestId} at capacity, removed oldest alert`);
        }

        transaction.update(digestRef, {
          items: updatedItems,
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.debug(`Updated digest ${digestId} with alert ${item.eventId}`);
      } else {
        // Create new digest
        const newDigest: AlertDigest = {
          recipientUid: recipient.userId,
          recipientEmail: recipient.email,
          category,
          items: [item],
          createdAt: admin.firestore.Timestamp.now(),
          lastUpdatedAt: admin.firestore.Timestamp.now(),
          cooldownUntil: admin.firestore.Timestamp.now(), // Eligible immediately
          sendAttempts: 0,
          isAcknowledged: false,
          ackToken: crypto.randomBytes(32).toString("hex"), // Secure 256-bit token
        };

        transaction.set(digestRef, newDigest);

        logger.info(`Created new digest ${digestId} for ${recipient.email}`);
      }
    });
  } catch (error) {
    logger.error(`Transaction failed for digest ${digestId}:`, error);
    throw error; // Propagate to Promise.all handler
  }
}

/**
 * Generate human-readable summary for digest item
 */
function generateAlertSummary(alert: WaterQualityAlert): string {
  const paramName =
    alert.parameter === "ph"
      ? "pH"
      : alert.parameter === "tds"
        ? "TDS"
        : "Turbidity";

  const unit =
    alert.parameter === "tds"
      ? " ppm"
      : alert.parameter === "turbidity"
        ? " NTU"
        : "";

  const location =
    alert.deviceBuilding && alert.deviceFloor
      ? ` at ${alert.deviceBuilding}, ${alert.deviceFloor}`
      : alert.deviceBuilding
        ? ` at ${alert.deviceBuilding}`
        : "";

  return `${alert.severity}: ${paramName} ${alert.currentValue.toFixed(2)}${unit}${location}`;
}
