/**
 * Aggregate Alerts to Digest - Firestore Trigger
 *
 * HIGH PRIORITY FUNCTION: Batches alerts into digests for periodic email sending
 *
 * @module pubsub/aggregateAlertsToDigest
 *
 * Functionality:
 * - Triggered when alerts are created/updated in Firestore
 * - Aggregates alerts into daily digests per recipient/category
 * - Groups by recipient UID and alert category
 * - Generates acknowledgement tokens for digest management
 * - NO IMMEDIATE EMAILS - silent aggregation only
 * - Digests are sent by scheduler (sendAlertDigests)
 *
 * QUOTA OPTIMIZATION:
 * - Batches alerts silently → Saves 98% email quota
 * - Transaction-based writes prevent race conditions
 * - Deduplicates by eventId for idempotency (retry safety)
 *
 * Migration Notes:
 * - Ported from src/pubsub/aggregateAlertsToDigest.ts
 * - Enhanced with modular types and constants
 * - Uses existing digest types from types/digest.types.ts
 * - Uses constants from constants/digest.constants.ts
 */

import * as crypto from "crypto";

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

import { db } from "../config/firebase";
import { COLLECTIONS } from "../constants/database.constants";
import { DIGEST_COLLECTION, DIGEST_MAX_ITEMS } from "../constants/digest.constants";
import type { WaterQualityAlert } from "../types/alertManagement.types";
import type { AlertDigest, DigestAlertItem } from "../types/digest.types";
import { categorizeAlert } from "../types/digest.types";
import type { NotificationPreferences } from "../types/notificationPreferences.types";
import { getNotificationRecipients } from "../utils/alertHelpers";
import { getThresholdConfig } from "../utils/thresholdHelpers";

/**
 * Aggregate alerts into daily digests
 *
 * Trigger: Firestore document write to alerts/{alertId}
 *
 * Process:
 * 1. Only process new alert creation (not updates)
 * 2. Get threshold config for alert categorization
 * 3. Determine alert category (e.g., "ph_high", "tds_critical")
 * 4. Get notification recipients based on preferences
 * 5. Create or update digest documents for each recipient
 * 6. Use transactions to prevent race conditions
 * 7. Deduplicate by eventId for idempotency
 *
 * Digest Document ID Format: {recipientUid}_{category}_{YYYY-MM-DD}
 * Example: "user123_ph_high_2025-11-02"
 *
 * @param {*} event - Firestore document event
 *
 * @example
 * // Alert created in Firestore → Triggers this function
 * // Function adds alert to digest → Scheduler sends digest later
 */
export const aggregateAlertsToDigest = onDocumentWritten(
  {
    document: `${COLLECTIONS.ALERTS}/{alertId}`,
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
      const category = categorizeAlert(alertData.parameter, alertData.currentValue, thresholds);

      // Get recipients using existing RBAC logic
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
 *
 * Document ID Format: {recipientUid}_{category}_{YYYY-MM-DD}
 * Example: "user123_ph_high_2025-11-02"
 *
 * Transaction Logic:
 * 1. Check if digest exists for today
 * 2. If exists, check for duplicate eventId (idempotency)
 * 3. Add item to digest (max 10 items, FIFO)
 * 4. If new, create digest with acknowledgement token
 *
 * @param {*} recipient - Notification preferences for recipient
 * @param {*} category - Alert category for grouping
 * @param {*} item - Digest alert item to add
 * @param {*} eventId - Alert ID for deduplication
 */
async function aggregateToRecipientDigest(
  recipient: NotificationPreferences,
  category: string,
  item: DigestAlertItem,
  eventId: string
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD UTC
  const digestId = `${recipient.userId}_${category}_${today}`;
  const digestRef = db.collection(DIGEST_COLLECTION).doc(digestId);

  try {
    await db.runTransaction(async (transaction) => {
      const digestDoc = await transaction.get(digestRef);

      if (digestDoc.exists) {
        // Update existing digest
        const existingDigest = digestDoc.data() as AlertDigest;

        // Check for duplicate eventId (idempotency - fixes retry issue)
        const isDuplicate = existingDigest.items.some(
          (existingItem) => existingItem.eventId === eventId
        );

        if (isDuplicate) {
          logger.debug(`Alert ${eventId} already in digest ${digestId}, skipping duplicate`);
          return; // Exit transaction silently
        }

        // Maintain max items (FIFO - remove oldest if at capacity)
        const updatedItems = [...existingDigest.items, item];
        if (updatedItems.length > DIGEST_MAX_ITEMS) {
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
        const newDigest: Partial<AlertDigest> = {
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
 *
 * Format: "{Severity}: {Parameter} {Value}{Unit}{Location}"
 * Examples:
 * - "Critical: pH 9.2 at Main Lab, Floor 2"
 * - "Warning: TDS 850 ppm at Building A"
 * - "Advisory: Turbidity 7.5 NTU"
 *
 * @param {*} alert - Water quality alert data
 * @return {string} Formatted summary string
 */
function generateAlertSummary(alert: WaterQualityAlert): string {
  // Format parameter name
  const paramName =
    alert.parameter === "ph" ? "pH" : alert.parameter === "tds" ? "TDS" : "Turbidity";

  // Add unit if applicable
  const unit = alert.parameter === "tds" ? " ppm" : alert.parameter === "turbidity" ? " NTU" : "";

  // Format location if available
  const location =
    alert.deviceBuilding && alert.deviceFloor
      ? ` at ${alert.deviceBuilding}, ${alert.deviceFloor}`
      : alert.deviceBuilding
        ? ` at ${alert.deviceBuilding}`
        : "";

  return `${alert.severity}: ${paramName} ${alert.currentValue.toFixed(2)}${unit}${location}`;
}
