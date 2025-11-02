/**
 * Alert Management Callable Function
 * Single function with switch case to handle alert management operations
 *
 * @module callable/alertManagement
 *
 * Supported actions:
 * - acknowledgeAlert: Change alert status to Acknowledged
 * - resolveAlert: Change alert status to Resolved with optional notes
 * - listAlerts: Retrieve alerts with optional filtering
 */

import { FieldValue } from "firebase-admin/firestore";
import type * as FirebaseFirestore from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";

import { db } from "../config/firebase";
import { ALERT_MANAGEMENT_ERRORS, ALERT_MANAGEMENT_MESSAGES, COLLECTIONS } from "../constants";
import { DIGEST_COLLECTION, DIGEST_ERRORS, DIGEST_MESSAGES } from "../constants/digest.constants";
import type {
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  ListAlertsRequest,
  AcknowledgeDigestRequest,
  AlertResponse,
  WaterQualityAlert,
} from "../types";
import type { AlertDigest } from "../types/digest.types";
import { createRoutedFunction } from "../utils";
import { isValidAckToken } from "../utils/validators";

/**
 * Request type for alert management operations
 */
type AlertManagementRequest =
  | AcknowledgeAlertRequest
  | ResolveAlertRequest
  | ListAlertsRequest
  | AcknowledgeDigestRequest;

/**
 * Acknowledge Alert Handler
 * Changes alert status from Active to Acknowledged
 *
 * Business Rules:
 * - Alert must exist
 * - Alert must be Active (cannot acknowledge if already Acknowledged or Resolved)
 * - Requires admin authentication
 * - Records who acknowledged and when
 *
 * @param {CallableRequest<AlertManagementRequest>} request - Callable request with alertId
 * @return {Promise<AlertResponse>} Success response with updated alert data
 *
 * @throws {HttpsError} not-found - Alert not found
 * @throws {HttpsError} failed-precondition - Alert already acknowledged or resolved
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleAcknowledgeAlert(
  request: CallableRequest<AlertManagementRequest>
): Promise<AlertResponse> {
  const { alertId } = request.data as AcknowledgeAlertRequest;
  const userId = request.auth?.uid;

  if (!alertId) {
    throw new HttpsError("invalid-argument", ALERT_MANAGEMENT_ERRORS.MISSING_ALERT_ID);
  }

  if (!userId) {
    throw new HttpsError("unauthenticated", ALERT_MANAGEMENT_ERRORS.UNAUTHENTICATED);
  }

  try {
    const alertRef = db.collection(COLLECTIONS.ALERTS).doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      throw new HttpsError("not-found", ALERT_MANAGEMENT_ERRORS.ALERT_NOT_FOUND);
    }

    const alertData = alertDoc.data() as WaterQualityAlert;

    // Business Logic: Cannot acknowledge if already acknowledged or resolved
    if (alertData.status === "Acknowledged") {
      throw new HttpsError("failed-precondition", ALERT_MANAGEMENT_ERRORS.ALREADY_ACKNOWLEDGED);
    }

    if (alertData.status === "Resolved") {
      throw new HttpsError("failed-precondition", ALERT_MANAGEMENT_ERRORS.ALREADY_RESOLVED);
    }

    // Update alert with server timestamp and user tracking
    await alertRef.update({
      status: "Acknowledged",
      acknowledgedAt: FieldValue.serverTimestamp(),
      acknowledgedBy: userId,
    });

    return {
      success: true,
      message: ALERT_MANAGEMENT_MESSAGES.ACKNOWLEDGE_SUCCESS,
      alert: {
        alertId,
        status: "Acknowledged",
      },
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error acknowledging alert:", error);
    throw new HttpsError("internal", ALERT_MANAGEMENT_ERRORS.ACKNOWLEDGE_FAILED);
  }
}

/**
 * Resolve Alert Handler
 * Changes alert status to Resolved with optional resolution notes
 *
 * Business Rules:
 * - Alert must exist
 * - Alert must not already be Resolved
 * - Requires admin authentication
 * - Records who resolved, when, and optional notes
 *
 * @param {CallableRequest<AlertManagementRequest>} request - Callable request with alertId and optional notes
 * @return {Promise<AlertResponse>} Success response with updated alert data
 *
 * @throws {HttpsError} not-found - Alert not found
 * @throws {HttpsError} failed-precondition - Alert already resolved
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleResolveAlert(
  request: CallableRequest<AlertManagementRequest>
): Promise<AlertResponse> {
  const { alertId, notes } = request.data as ResolveAlertRequest;
  const userId = request.auth?.uid;

  if (!alertId) {
    throw new HttpsError("invalid-argument", ALERT_MANAGEMENT_ERRORS.MISSING_ALERT_ID);
  }

  if (!userId) {
    throw new HttpsError("unauthenticated", ALERT_MANAGEMENT_ERRORS.UNAUTHENTICATED);
  }

  try {
    const alertRef = db.collection(COLLECTIONS.ALERTS).doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      throw new HttpsError("not-found", ALERT_MANAGEMENT_ERRORS.ALERT_NOT_FOUND);
    }

    const alertData = alertDoc.data() as WaterQualityAlert;

    // Business Logic: Cannot resolve if already resolved
    if (alertData.status === "Resolved") {
      throw new HttpsError("failed-precondition", ALERT_MANAGEMENT_ERRORS.ALREADY_RESOLVED);
    }

    // Prepare update data
    const updateData: Record<string, FirebaseFirestore.FieldValue | string> = {
      status: "Resolved",
      resolvedAt: FieldValue.serverTimestamp(),
      resolvedBy: userId,
    };

    // Add resolution notes if provided
    if (notes) {
      updateData.resolutionNotes = notes;
    }

    await alertRef.update(updateData);

    return {
      success: true,
      message: ALERT_MANAGEMENT_MESSAGES.RESOLVE_SUCCESS,
      alert: {
        alertId,
        status: "Resolved",
      },
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error resolving alert:", error);
    throw new HttpsError("internal", ALERT_MANAGEMENT_ERRORS.RESOLVE_FAILED);
  }
}

/**
 * List Alerts Handler
 * Retrieves alerts with optional server-side filtering
 *
 * Filtering Options:
 * - severity: Filter by alert severity (Advisory, Warning, Critical)
 * - status: Filter by alert status (Active, Acknowledged, Resolved)
 * - parameter: Filter by water parameter (tds, ph, turbidity)
 * - deviceId: Filter by specific device(s)
 *
 * @param {CallableRequest<AlertManagementRequest>} request - Callable request with optional filters
 * @return {Promise<AlertResponse>} Success response with array of alerts
 *
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleListAlerts(
  request: CallableRequest<AlertManagementRequest>
): Promise<AlertResponse> {
  const { filters } = request.data as ListAlertsRequest;

  try {
    let query: FirebaseFirestore.Query = db
      .collection(COLLECTIONS.ALERTS)
      .orderBy("createdAt", "desc");

    // Apply server-side filters if provided
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.where("status", "in", filters.status);
      }

      if (filters.severity && filters.severity.length > 0) {
        query = query.where("severity", "in", filters.severity);
      }

      if (filters.parameter && filters.parameter.length > 0) {
        query = query.where("parameter", "in", filters.parameter);
      }

      if (filters.deviceId && filters.deviceId.length > 0) {
        query = query.where("deviceId", "in", filters.deviceId);
      }
    }

    const snapshot = await query.get();

    const alerts: WaterQualityAlert[] = snapshot.docs.map(
      (doc) =>
        ({
          alertId: doc.id,
          ...doc.data(),
        }) as WaterQualityAlert
    );

    return {
      success: true,
      message: ALERT_MANAGEMENT_MESSAGES.LIST_SUCCESS,
      alerts,
    };
  } catch (error) {
    console.error("Error listing alerts:", error);
    throw new HttpsError("internal", ALERT_MANAGEMENT_ERRORS.LIST_FAILED);
  }
}

/**
 * Acknowledge Digest Handler
 * Stops future digest email notifications by marking digest as acknowledged
 *
 * Business Rules:
 * - Requires valid acknowledgement token (security check)
 * - Digest must exist
 * - Can be acknowledged multiple times (idempotent)
 * - Does NOT require admin authentication (user self-service)
 *
 * @param {CallableRequest<AlertManagementRequest>} request - Callable request with digestId and token
 * @return {Promise<AlertResponse>} Success response with acknowledgement confirmation
 *
 * @throws {HttpsError} invalid-argument - Missing or invalid parameters
 * @throws {HttpsError} not-found - Digest not found
 * @throws {HttpsError} permission-denied - Invalid acknowledgement token
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleAcknowledgeDigest(
  request: CallableRequest<AlertManagementRequest>
): Promise<AlertResponse> {
  const { digestId, token } = request.data as AcknowledgeDigestRequest;

  // Validate required parameters
  if (!digestId || !token) {
    throw new HttpsError("invalid-argument", "Missing required parameters: digestId and token");
  }

  // Validate token format
  if (!isValidAckToken(token)) {
    throw new HttpsError("invalid-argument", "Invalid token format");
  }

  try {
    // Fetch digest document
    const digestRef = db.collection(DIGEST_COLLECTION).doc(digestId);
    const digestDoc = await digestRef.get();

    if (!digestDoc.exists) {
      throw new HttpsError("not-found", DIGEST_ERRORS.DIGEST_NOT_FOUND);
    }

    const digest = digestDoc.data() as AlertDigest;

    // Verify token match (security check)
    if (digest.ackToken !== token) {
      logger.warn(`Invalid ack token for digest ${digestId}`);
      throw new HttpsError("permission-denied", DIGEST_ERRORS.INVALID_TOKEN);
    }

    // Check if already acknowledged (idempotent operation)
    if (digest.isAcknowledged) {
      return {
        success: true,
        message: DIGEST_ERRORS.ALREADY_ACKNOWLEDGED,
      };
    }

    // Update digest to acknowledged state (stops future sends)
    await digestRef.update({
      isAcknowledged: true,
      acknowledgedAt: FieldValue.serverTimestamp(),
      acknowledgedBy: digest.recipientUid,
    });

    logger.info(`Digest ${digestId} acknowledged by ${digest.recipientEmail}`);

    return {
      success: true,
      message: DIGEST_MESSAGES.ACKNOWLEDGED,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("Error acknowledging digest:", error);
    throw new HttpsError("internal", DIGEST_ERRORS.UPDATE_FAILED);
  }
}

/**
 * Alert Management Callable Function
 * Single entry point for all alert management operations
 *
 * Uses createRoutedFunction for clean switch-case routing
 *
 * Note: acknowledgeDigest does NOT require admin authentication (user self-service)
 * All other actions require admin authentication
 *
 * @example
 * // Acknowledge alert (requires admin)
 * const result = await httpsCallable('alertManagement')({
 *   action: 'acknowledgeAlert',
 *   alertId: 'alert_12345'
 * });
 *
 * @example
 * // Resolve alert with notes (requires admin)
 * const result = await httpsCallable('alertManagement')({
 *   action: 'resolveAlert',
 *   alertId: 'alert_12345',
 *   notes: 'Sensor replaced and recalibrated'
 * });
 *
 * @example
 * // List alerts with filters (requires admin)
 * const result = await httpsCallable('alertManagement')({
 *   action: 'listAlerts',
 *   filters: {
 *     status: ['Active', 'Acknowledged'],
 *     severity: ['Critical']
 *   }
 * });
 *
 * @example
 * // Acknowledge digest (NO admin required - user self-service)
 * const result = await httpsCallable('alertManagement')({
 *   action: 'acknowledgeDigest',
 *   digestId: 'user123_ph_high_2025-11-02',
 *   token: 'a1b2c3d4...'
 * });
 */
export const alertManagement = onCall<AlertManagementRequest, Promise<AlertResponse>>(
  createRoutedFunction<AlertManagementRequest, AlertResponse>(
    {
      acknowledgeAlert: handleAcknowledgeAlert,
      resolveAlert: handleResolveAlert,
      listAlerts: handleListAlerts,
      acknowledgeDigest: handleAcknowledgeDigest,
    },
    {
      requireAuth: true,
      requireAdmin: false, // Mixed auth - acknowledgeDigest is public, others need admin
    }
  )
);
