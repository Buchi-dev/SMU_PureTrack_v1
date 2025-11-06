import {FieldValue} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";

import {db} from "../config/firebase";
import {
  ALERT_MANAGEMENT_ERRORS,
  ALERT_MANAGEMENT_MESSAGES,
  COLLECTIONS,
} from "../constants";
import type {
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  AlertResponse,
  WaterQualityAlert,
} from "../types";
import {createRoutedFunction} from "../utils";

type AlertManagementRequest =
  | AcknowledgeAlertRequest
  | ResolveAlertRequest;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Validates that a user is authenticated and an alert ID is provided.
 * @param {string | undefined} userId - The user ID from auth context
 * @param {string} [alertId] - The alert ID to validate
 * @throws {HttpsError} If alert ID or user ID is missing
 */
function validateAuth(userId: string | undefined, alertId?: string): asserts userId is string {
  if (!alertId) throw new HttpsError("invalid-argument", ALERT_MANAGEMENT_ERRORS.MISSING_ALERT_ID);
  if (!userId) throw new HttpsError("unauthenticated", ALERT_MANAGEMENT_ERRORS.UNAUTHENTICATED);
}

/**
 * Validates that the alert status allows the requested operation.
 * @param {string} status - Current alert status
 * @param {"acknowledge" | "resolve"} operation - The operation being performed
 * @throws {HttpsError} If the alert is already in an invalid state for the operation
 */
function validateAlertStatus(status: string, operation: "acknowledge" | "resolve"): void {
  const isAcknowledged = status === "Acknowledged";
  const isResolved = status === "Resolved";

  if (
    (operation === "acknowledge" && (isAcknowledged || isResolved)) ||
    (operation === "resolve" && isResolved)
  ) {
    const error = isResolved ?
      ALERT_MANAGEMENT_ERRORS.ALREADY_RESOLVED :
      ALERT_MANAGEMENT_ERRORS.ALREADY_ACKNOWLEDGED;
    throw new HttpsError("failed-precondition", error);
  }
}

/**
 * Retrieves a document from Firestore and validates it exists.
 * @template T - Type of the document data
 * @param {string} collection - The Firestore collection name
 * @param {string} docId - The document ID
 * @param {string} notFoundError - Error message if document doesn't exist
 * @return {Promise<T>} The document data
 * @throws {HttpsError} If document doesn't exist
 */
async function getDocument<T>(collection: string, docId: string, notFoundError: string): Promise<T> {
  const doc = await db.collection(collection).doc(docId).get();
  if (!doc.exists) throw new HttpsError("not-found", notFoundError);
  return doc.data() as T;
}

/**
 * Updates an alert's status and related metadata.
 * @param {string} alertId - The alert document ID
 * @param {string} status - The new alert status
 * @param {string} userId - The user performing the action
 * @param {string} [notes] - Optional resolution notes
 * @return {Promise<void>}
 */
async function updateAlert(
  alertId: string,
  status: string,
  userId: string,
  notes?: string
): Promise<void> {
  const timestamp = FieldValue.serverTimestamp();
  const actionPrefix = status === "Acknowledged" ? "acknowledged" : "resolved";

  await db
    .collection(COLLECTIONS.ALERTS)
    .doc(alertId)
    .update({
      status,
      [`${actionPrefix}At`]: timestamp,
      [`${actionPrefix}By`]: userId,
      ...(notes && {resolutionNotes: notes}),
    });
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Handles acknowledging an alert.
 * @param {CallableRequest<AlertManagementRequest>} request - The callable request
 * @return {Promise<AlertResponse>} Response with updated alert status
 * @throws {HttpsError} If validation fails or alert not found
 */
async function handleAcknowledgeAlert(
  request: CallableRequest<AlertManagementRequest>
): Promise<AlertResponse> {
  const {alertId} = request.data as AcknowledgeAlertRequest;
  const userId = request.auth?.uid;

  validateAuth(userId, alertId);
  const alert = await getDocument<WaterQualityAlert>(
    COLLECTIONS.ALERTS,
    alertId,
    ALERT_MANAGEMENT_ERRORS.ALERT_NOT_FOUND
  );

  validateAlertStatus(alert.status, "acknowledge");
  await updateAlert(alertId, "Acknowledged", userId);

  return {
    success: true,
    message: ALERT_MANAGEMENT_MESSAGES.ACKNOWLEDGE_SUCCESS,
    alert: {alertId, status: "Acknowledged"},
  };
}

/**
 * Handles resolving an alert with optional notes.
 * @param {CallableRequest<AlertManagementRequest>} request - The callable request
 * @return {Promise<AlertResponse>} Response with updated alert status
 * @throws {HttpsError} If validation fails or alert not found
 */
async function handleResolveAlert(
  request: CallableRequest<AlertManagementRequest>
): Promise<AlertResponse> {
  const {alertId, notes} = request.data as ResolveAlertRequest;
  const userId = request.auth?.uid;

  validateAuth(userId, alertId);
  const alert = await getDocument<WaterQualityAlert>(
    COLLECTIONS.ALERTS,
    alertId,
    ALERT_MANAGEMENT_ERRORS.ALERT_NOT_FOUND
  );

  validateAlertStatus(alert.status, "resolve");
  await updateAlert(alertId, "Resolved", userId, notes);

  return {
    success: true,
    message: ALERT_MANAGEMENT_MESSAGES.RESOLVE_SUCCESS,
    alert: {alertId, status: "Resolved"},
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const AlertsCalls = onCall<AlertManagementRequest, Promise<AlertResponse>>(
  createRoutedFunction<AlertManagementRequest, AlertResponse>(
    {
      acknowledgeAlert: handleAcknowledgeAlert,
      resolveAlert: handleResolveAlert,
    },
    {
      requireAuth: true,
      requireAdmin: false,
    }
  )
);
