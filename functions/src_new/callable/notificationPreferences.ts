/**
 * Notification Preferences Callable Function
 * Single function with switch case to handle notification preference operations
 * 
 * @module callable/notificationPreferences
 * 
 * Supported actions:
 * - getUserPreferences: Get notification preferences for a specific user
 * - listAllPreferences: List all notification preferences (admin only)
 * - setupPreferences: Create or update notification preferences
 * - deletePreferences: Delete notification preferences
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";
import {db} from "../config/firebase";
import {FieldValue} from "firebase-admin/firestore";
import {
  NOTIFICATION_PREFERENCES_ERRORS,
  NOTIFICATION_PREFERENCES_MESSAGES,
  COLLECTIONS,
} from "../constants";
import {createRoutedFunction} from "../utils";
import type {
  GetUserPreferencesRequest,
  ListAllPreferencesRequest,
  SetupPreferencesRequest,
  DeletePreferencesRequest,
  PreferencesResponse,
  ListPreferencesResponse,
  NotificationPreferences,
} from "../types";

/**
 * Request type for notification preferences operations
 */
type NotificationPreferencesRequest = 
  | GetUserPreferencesRequest 
  | ListAllPreferencesRequest 
  | SetupPreferencesRequest 
  | DeletePreferencesRequest;

/**
 * Response type for notification preferences operations
 */
type NotificationPreferencesResponse = PreferencesResponse | ListPreferencesResponse;

/**
 * Get User Preferences Handler
 * Retrieves notification preferences for a specific user
 * 
 * Business Rules:
 * - User must be authenticated
 * - Users can only access their own preferences (unless admin)
 * 
 * @param request - Callable request with userId
 * @returns Success response with user's preferences or null if not set
 * 
 * @throws {HttpsError} invalid-argument - Missing userId
 * @throws {HttpsError} permission-denied - User trying to access another user's preferences
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleGetUserPreferences(
  request: CallableRequest<NotificationPreferencesRequest>
): Promise<NotificationPreferencesResponse> {
  const {userId} = request.data as GetUserPreferencesRequest;
  const requestingUserId = request.auth?.uid;
  const isAdmin = request.auth?.token?.role === "Admin";

  if (!userId) {
    throw new HttpsError(
      "invalid-argument",
      NOTIFICATION_PREFERENCES_ERRORS.MISSING_USER_ID
    );
  }

  if (!requestingUserId) {
    throw new HttpsError(
      "unauthenticated",
      NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED
    );
  }

  // Security: Users can only access their own preferences unless admin
  if (userId !== requestingUserId && !isAdmin) {
    throw new HttpsError(
      "permission-denied",
      NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED
    );
  }

  try {
    const prefDoc = await db
      .collection(COLLECTIONS.NOTIFICATION_PREFERENCES)
      .doc(userId)
      .get();

    if (!prefDoc.exists) {
      return {
        success: true,
        message: NOTIFICATION_PREFERENCES_MESSAGES.NOT_FOUND,
        data: null,
      };
    }

    return {
      success: true,
      message: NOTIFICATION_PREFERENCES_MESSAGES.GET_SUCCESS,
      data: prefDoc.data() as NotificationPreferences,
    };
  } catch (error: any) {
    console.error("Error getting user preferences:", error);
    throw new HttpsError(
      "internal",
      NOTIFICATION_PREFERENCES_ERRORS.GET_FAILED
    );
  }
}

/**
 * List All Preferences Handler
 * Retrieves notification preferences for all users (admin only)
 * 
 * Business Rules:
 * - Requires admin authentication
 * 
 * @param request - Callable request
 * @returns Success response with array of all preferences
 * 
 * @throws {HttpsError} permission-denied - User is not admin
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleListAllPreferences(
  request: CallableRequest<NotificationPreferencesRequest>
): Promise<NotificationPreferencesResponse> {
  const isAdmin = request.auth?.token?.role === "Admin";

  if (!isAdmin) {
    throw new HttpsError(
      "permission-denied",
      NOTIFICATION_PREFERENCES_ERRORS.ADMIN_REQUIRED
    );
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.NOTIFICATION_PREFERENCES)
      .get();

    const preferences: NotificationPreferences[] = snapshot.docs.map((doc) => ({
      userId: doc.id,
      ...doc.data(),
    } as NotificationPreferences));

    return {
      success: true,
      message: NOTIFICATION_PREFERENCES_MESSAGES.LIST_SUCCESS,
      data: preferences,
    };
  } catch (error: any) {
    console.error("Error listing all preferences:", error);
    throw new HttpsError(
      "internal",
      NOTIFICATION_PREFERENCES_ERRORS.LIST_FAILED
    );
  }
}

/**
 * Setup Preferences Handler
 * Creates or updates notification preferences for a user
 * 
 * Business Rules:
 * - User must be authenticated
 * - Users can only update their own preferences (unless admin)
 * - Email is required if emailNotifications is enabled
 * - Sets createdAt on first create, updatedAt on updates
 * 
 * @param request - Callable request with preference data
 * @returns Success response with saved preferences
 * 
 * @throws {HttpsError} invalid-argument - Missing required fields
 * @throws {HttpsError} permission-denied - User trying to update another user's preferences
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleSetupPreferences(
  request: CallableRequest<NotificationPreferencesRequest>
): Promise<NotificationPreferencesResponse> {
  const {
    userId,
    email,
    emailNotifications,
    pushNotifications,
    sendScheduledAlerts,
    alertSeverities,
    parameters,
    devices,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
  } = request.data as SetupPreferencesRequest;

  const requestingUserId = request.auth?.uid;
  const isAdmin = request.auth?.token?.role === "Admin";

  // Validation
  if (!userId || !email) {
    throw new HttpsError(
      "invalid-argument",
      NOTIFICATION_PREFERENCES_ERRORS.MISSING_REQUIRED_FIELDS
    );
  }

  if (!requestingUserId) {
    throw new HttpsError(
      "unauthenticated",
      NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED
    );
  }

  // Security: Users can only update their own preferences unless admin
  if (userId !== requestingUserId && !isAdmin) {
    throw new HttpsError(
      "permission-denied",
      NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED
    );
  }

  // Validate email if email notifications enabled
  if (emailNotifications && !email) {
    throw new HttpsError(
      "invalid-argument",
      NOTIFICATION_PREFERENCES_ERRORS.EMAIL_REQUIRED
    );
  }

  try {
    const prefRef = db.collection(COLLECTIONS.NOTIFICATION_PREFERENCES).doc(userId);
    const existingDoc = await prefRef.get();

    const preferencesData: any = {
      userId,
      email,
      emailNotifications: emailNotifications ?? false,
      pushNotifications: pushNotifications ?? false,
      sendScheduledAlerts: sendScheduledAlerts ?? true, // Default to true for new users
      alertSeverities: alertSeverities ?? ["Critical", "Warning", "Advisory"],
      parameters: parameters ?? [],
      devices: devices ?? [],
      quietHoursEnabled: quietHoursEnabled ?? false,
      quietHoursStart: quietHoursStart ?? null,
      quietHoursEnd: quietHoursEnd ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Set createdAt only on first create
    if (!existingDoc.exists) {
      preferencesData.createdAt = FieldValue.serverTimestamp();
    }

    await prefRef.set(preferencesData, {merge: true});

    // Fetch the saved data to return
    const savedDoc = await prefRef.get();

    return {
      success: true,
      message: existingDoc.exists
        ? NOTIFICATION_PREFERENCES_MESSAGES.UPDATE_SUCCESS
        : NOTIFICATION_PREFERENCES_MESSAGES.CREATE_SUCCESS,
      data: savedDoc.data() as NotificationPreferences,
    };
  } catch (error: any) {
    console.error("Error setting up preferences:", error);
    throw new HttpsError(
      "internal",
      NOTIFICATION_PREFERENCES_ERRORS.SETUP_FAILED
    );
  }
}

/**
 * Delete Preferences Handler
 * Deletes notification preferences for a user
 * 
 * Business Rules:
 * - User must be authenticated
 * - Users can only delete their own preferences (unless admin)
 * 
 * @param request - Callable request with userId
 * @returns Success response
 * 
 * @throws {HttpsError} invalid-argument - Missing userId
 * @throws {HttpsError} permission-denied - User trying to delete another user's preferences
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleDeletePreferences(
  request: CallableRequest<NotificationPreferencesRequest>
): Promise<NotificationPreferencesResponse> {
  const {userId} = request.data as DeletePreferencesRequest;
  const requestingUserId = request.auth?.uid;
  const isAdmin = request.auth?.token?.role === "Admin";

  if (!userId) {
    throw new HttpsError(
      "invalid-argument",
      NOTIFICATION_PREFERENCES_ERRORS.MISSING_USER_ID
    );
  }

  if (!requestingUserId) {
    throw new HttpsError(
      "unauthenticated",
      NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED
    );
  }

  // Security: Users can only delete their own preferences unless admin
  if (userId !== requestingUserId && !isAdmin) {
    throw new HttpsError(
      "permission-denied",
      NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED
    );
  }

  try {
    await db.collection(COLLECTIONS.NOTIFICATION_PREFERENCES).doc(userId).delete();

    return {
      success: true,
      message: NOTIFICATION_PREFERENCES_MESSAGES.DELETE_SUCCESS,
      data: null,
    };
  } catch (error: any) {
    console.error("Error deleting preferences:", error);
    throw new HttpsError(
      "internal",
      NOTIFICATION_PREFERENCES_ERRORS.DELETE_FAILED
    );
  }
}

/**
 * Notification Preferences Callable Function
 * Single entry point for all notification preference operations
 * 
 * Uses createRoutedFunction for clean switch-case routing
 * Requires authentication for all operations
 * Admin-only operations: listAllPreferences
 * 
 * @example
 * // Get user preferences
 * const result = await httpsCallable('notificationPreferences')({
 *   action: 'getUserPreferences',
 *   userId: 'user123'
 * });
 * 
 * @example
 * // Setup preferences
 * const result = await httpsCallable('notificationPreferences')({
 *   action: 'setupPreferences',
 *   userId: 'user123',
 *   email: 'user@example.com',
 *   emailNotifications: true,
 *   pushNotifications: false,
 *   alertSeverities: ['Critical', 'Warning'],
 *   parameters: ['ph', 'tds'],
 *   devices: ['device_001'],
 *   quietHoursEnabled: true,
 *   quietHoursStart: '22:00',
 *   quietHoursEnd: '07:00'
 * });
 * 
 * @example
 * // List all preferences (admin only)
 * const result = await httpsCallable('notificationPreferences')({
 *   action: 'listAllPreferences'
 * });
 * 
 * @example
 * // Delete preferences
 * const result = await httpsCallable('notificationPreferences')({
 *   action: 'deletePreferences',
 *   userId: 'user123'
 * });
 */
export const notificationPreferences = onCall<NotificationPreferencesRequest, Promise<NotificationPreferencesResponse>>(
  createRoutedFunction<NotificationPreferencesRequest, NotificationPreferencesResponse>(
    {
      getUserPreferences: handleGetUserPreferences,
      listAllPreferences: handleListAllPreferences,
      setupPreferences: handleSetupPreferences,
      deletePreferences: handleDeletePreferences,
    },
    {
      requireAuth: true,
      requireAdmin: false, // Some operations require admin, checked per-action
    }
  )
);
