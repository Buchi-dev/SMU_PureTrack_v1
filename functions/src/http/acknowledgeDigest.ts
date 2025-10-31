/**
 * Acknowledgement HTTP Endpoint - Phase 2 Implementation
 * 
 * ANALYSIS INTEGRATION POINTS:
 * - Follows HTTPS pattern from http/notificationPreferences.ts:14-90
 * - Provides missing ack mechanism identified in analysis (no cooldown stop)
 * - Verifies token security before digest mutation
 * 
 * USAGE:
 * Frontend calls: GET /acknowledgeDigest?token={ackToken}&id={digestId}
 * Response: JSON {success: true, message: "..."}
 */

import {onRequest} from "firebase-functions/v2/https";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {db} from "../config/firebase";
import type {AlertDigest} from "../types/digest";
import type {AcknowledgeResponse} from "../types/digest";

/**
 * HTTP endpoint to acknowledge alert digests
 * Stops future digest sends by setting isAcknowledged=true
 * 
 * Query Params:
 * - token: ackToken from digest (required)
 * - id: digest document ID (required)
 * 
 * Optional Auth: Can extend with Firebase Auth middleware if needed
 */
export const acknowledgeDigest = onRequest(
  {
    cors: true, // Allow frontend CORS
    region: "us-central1",
    minInstances: 0, // Rare endpoint, cold start acceptable
    maxInstances: 5,
  },
  async (req, res) => {
    try {
      // Only allow GET/POST methods
      if (req.method !== "GET" && req.method !== "POST") {
        res.status(405).json({
          success: false,
          message: "Method not allowed. Use GET or POST.",
        } as AcknowledgeResponse);
        return;
      }

      // Extract parameters (support both query and body)
      const token =
        (req.query.token as string) || (req.body?.token as string);
      const digestId =
        (req.query.id as string) || (req.body?.digestId as string);

      // Validate required params
      if (!token || !digestId) {
        res.status(400).json({
          success: false,
          message: "Missing required parameters: token and id",
        } as AcknowledgeResponse);
        return;
      }

      logger.info(`Ack request for digest ${digestId}`);

      // Fetch digest document
      const digestRef = db.collection("alerts_digests").doc(digestId);
      const digestDoc = await digestRef.get();

      if (!digestDoc.exists) {
        res.status(404).json({
          success: false,
          message: "Digest not found",
        } as AcknowledgeResponse);
        return;
      }

      const digest = digestDoc.data() as AlertDigest;

      // Verify token match (security check)
      if (digest.ackToken !== token) {
        logger.warn(
          `Invalid ack token for digest ${digestId} from IP ${req.ip}`
        );
        res.status(403).json({
          success: false,
          message: "Invalid acknowledgement token",
        } as AcknowledgeResponse);
        return;
      }

      // Check if already acknowledged
      if (digest.isAcknowledged) {
        res.status(200).json({
          success: true,
          message: "Digest was already acknowledged",
          digestId,
        } as AcknowledgeResponse);
        return;
      }

      // Update digest to acknowledged state (stops future sends)
      await digestRef.update({
        isAcknowledged: true,
        acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
        acknowledgedBy: digest.recipientUid, // Could extend with Auth user if available
        cooldownUntil: null, // Clear cooldown (optional, prevents future queries)
      });

      logger.info(
        `Digest ${digestId} acknowledged by ${digest.recipientEmail}`
      );

      res.status(200).json({
        success: true,
        message:
          "Alert digest acknowledged successfully. You will no longer receive reminders for this issue.",
        digestId,
      } as AcknowledgeResponse);
    } catch (error) {
      logger.error("Error acknowledging digest:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error processing acknowledgement",
      } as AcknowledgeResponse);
    }
  }
);
