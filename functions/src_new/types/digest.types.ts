/**
 * Alert Digest Types
 * Type definitions for batched alert notifications with 24-hour cooldown
 *
 * @module types/digest.types
 *
 * Purpose: Reduce notification fatigue by aggregating similar alerts into
 * periodic email digests instead of sending individual notifications
 */

import * as admin from "firebase-admin";

import type {WaterParameter, AlertSeverity} from "./alertManagement.types";

/**
 * Individual alert item within a digest
 * Represents a single alert aggregated into a batched notification
 */
export interface DigestAlertItem {
  /** Original alert document ID from alerts collection */
  eventId: string;

  /** Brief description for email display (e.g., "pH Critical: 9.2") */
  summary: string;

  /** When this alert was created */
  timestamp: admin.firestore.Timestamp;

  /** Sensor reading value (optional for non-threshold alerts) */
  value?: number;

  /** Severity level of this alert */
  severity: AlertSeverity;

  /** Human-readable device name */
  deviceName?: string;

  /** Water quality parameter that triggered the alert */
  parameter: WaterParameter;
}

/**
 * Aggregated alert digest document structure
 *
 * Collection: alerts_digests
 * Document ID Format: {recipientUid}_{category}_{YYYY-MM-DD}
 *
 * Example ID: "user123_ph_high_2025-11-02"
 *
 * Cooldown Logic:
 * - First send: immediately after creation
 * - Subsequent sends: 24 hours after last send
 * - Max attempts: 3 (prevents infinite notifications)
 * - Stops on: user acknowledgement OR max attempts reached
 */
export interface AlertDigest {
  /** User ID to send digest to */
  recipientUid: string;

  /** Cached email for quick sends (avoids user lookup) */
  recipientEmail: string;

  /** Alert category for grouping (e.g., "ph_high", "tds_critical", "multi_param") */
  category: string;

  /** Array of aggregated alert items (max 10, oldest removed if exceeded) */
  items: DigestAlertItem[];

  /** First alert aggregation time */
  createdAt: admin.firestore.Timestamp;

  /** Last time an item was added to this digest */
  lastUpdatedAt: admin.firestore.Timestamp;

  /** Last successful email send time (undefined if never sent) */
  lastSentAt?: admin.firestore.Timestamp;

  /** Next eligible send time (now() for immediate, or lastSentAt + 24h) */
  cooldownUntil: admin.firestore.Timestamp;

  /** Number of send attempts (0-3, resets on acknowledgement) */
  sendAttempts: number;

  /** If true, stop sending this digest */
  isAcknowledged: boolean;

  /** User ID who acknowledged (for audit trail) */
  acknowledgedBy?: string;

  /** When the digest was acknowledged */
  acknowledgedAt?: admin.firestore.Timestamp;

  /** Crypto-secure token for acknowledgement URL (32 bytes hex) */
  ackToken: string;
}

/**
 * Response from digest acknowledgement
 */
export interface AcknowledgeDigestResponse {
  /** Whether acknowledgement was successful */
  success: boolean;

  /** Human-readable message */
  message: string;

  /** Acknowledged digest ID */
  digestId?: string;
}

/**
 * Categorize alert based on parameter and threshold configuration
 *
 * Categories:
 * - ph_high: pH above warning threshold
 * - ph_low: pH below warning threshold
 * - tds_high: TDS above warning threshold
 * @return {string} Alert category string
 * - tds_low: TDS below warning threshold (rare)
 * - turbidity_high: Turbidity above warning threshold
 * - multi_param: Multiple parameters affected
 *
 * @param {*} parameter - Water parameter
/**
 * Categorize alert based on parameter, value, and thresholds
 * @param {*} parameter - Water parameter
 * @param {*} value - Current sensor value
 * @param {*} thresholds - Threshold configuration
 * @return {string} Alert category string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, require-jsdoc
export function categorizeAlert(parameter: WaterParameter, value: number, thresholds: any): string {
  const config = thresholds[parameter];

  if (parameter === "ph") {
    const midpoint = ((config.warningMin || 0) + (config.warningMax || 14)) / 2;
    return value > midpoint ? "ph_high" : "ph_low";
  } else if (parameter === "tds") {
    const midpoint = ((config.warningMin || 0) + (config.warningMax || 10000)) / 2;
    return value > midpoint ? "tds_high" : "tds_low";
  } else if (parameter === "turbidity") {
    return "turbidity_high";
  }

  return "multi_param";
}
