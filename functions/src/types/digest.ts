/**
 * Type definitions for Alert Digest System (24-Hour Cooldown)
 * Extends existing types for aggregated alert notifications
 */

import * as admin from "firebase-admin";
import type {WaterParameter, AlertSeverity} from "./index";

/**
 * Individual alert item within a digest
 */
export interface DigestAlertItem {
  eventId: string; // Original alert ID from alerts collection
  summary: string; // Brief description (e.g., "pH Critical: 9.2")
  timestamp: admin.firestore.Timestamp;
  value?: number; // Sensor reading value
  severity: AlertSeverity;
  deviceName?: string;
  parameter: WaterParameter;
}

/**
 * Aggregated alert digest document structure
 * Collection: alerts_digests
 * Doc ID: {recipientUid}_{category}_{YYYY-MM-DD}
 */
export interface AlertDigest {
  recipientUid: string; // User ID to send digest to
  recipientEmail: string; // Cached email for quick sends
  category: string; // e.g., "ph_high", "tds_critical", "multi_param"
  items: DigestAlertItem[]; // Max 10 items, oldest removed if exceeded
  createdAt: admin.firestore.Timestamp; // First alert aggregation time
  lastUpdatedAt: admin.firestore.Timestamp; // Last time item was added
  lastSentAt?: admin.firestore.Timestamp; // Last successful email send time
  cooldownUntil: admin.firestore.Timestamp; // Next eligible send time (now() or lastSentAt+24h)
  sendAttempts: number; // 0-3 attempts, resets on acknowledgement
  isAcknowledged: boolean; // If true, stop sending
  acknowledgedBy?: string; // User ID who acknowledged
  acknowledgedAt?: admin.firestore.Timestamp; // Ack timestamp
  ackToken: string; // Crypto-secure token for ack URL (32 bytes hex)
}

/**
 * Request body for acknowledgement HTTP endpoint
 */
export interface AcknowledgeRequest {
  token: string; // ackToken from digest
  digestId: string; // Document ID to acknowledge
}

/**
 * Response from acknowledgement endpoint
 */
export interface AcknowledgeResponse {
  success: boolean;
  message: string;
  digestId?: string;
}

/**
 * Categorization for digest grouping
 */
export type DigestCategory =
  | "ph_high"
  | "ph_low"
  | "tds_high"
  | "tds_low"
  | "turbidity_high"
  | "turbidity_low"
  | "trend_alert"
  | "multi_param";

/**
 * Helper to generate category from alert data
 */
export function categorizeAlert(
  parameter: WaterParameter,
  value: number,
  thresholds: any // eslint-disable-line @typescript-eslint/no-explicit-any
): DigestCategory {
  const config = thresholds[parameter];

  if (parameter === "ph") {
    if (value > config.warningMax) return "ph_high";
    if (value < config.warningMin) return "ph_low";
  } else if (parameter === "tds") {
    if (value > config.warningMax) return "tds_high";
    if (value < config.warningMin) return "tds_low";
  } else if (parameter === "turbidity") {
    if (value > config.warningMax) return "turbidity_high";
    if (value < config.warningMin) return "turbidity_low";
  }

  return "multi_param"; // Fallback
}
