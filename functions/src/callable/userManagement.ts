/**
 * User Management Callable Function
 * Single function with switch case to handle multiple user management operations
 * INCLUDING notification preferences management
 * Optimized to reduce Firebase function quota usage (80% reduction from 5 to 1 function)
 *
 * @module callable/userManagement
 *
 * MIGRATION GUIDE - Update client calls:
 *
 * USER MANAGEMENT:
 * Before:
 *   const updateStatus = httpsCallable(functions, 'updateUserStatus');
 *   await updateStatus({ userId, status });
 * After:
 *   const userMgmt = httpsCallable(functions, 'userManagement');
 *   await userMgmt({ action: 'updateStatus', userId, status });
 *
 * Before:
 *   const updateUser = httpsCallable(functions, 'updateUser');
 *   await updateUser({ userId, status, role });
 * After:
 *   const userMgmt = httpsCallable(functions, 'userManagement');
 *   await userMgmt({ action: 'updateUser', userId, status, role });
 *
 * Before:
 *   const listUsers = httpsCallable(functions, 'listUsers');
 *   await listUsers();
 * After:
 *   const userMgmt = httpsCallable(functions, 'userManagement');
 *   await userMgmt({ action: 'listUsers' });
 *
 * NOTIFICATION PREFERENCES:
 * Before:
 *   const notifPrefs = httpsCallable(functions, 'notificationPreferences');
 *   await notifPrefs({ action: 'getUserPreferences', userId });
 * After:
 *   const userMgmt = httpsCallable(functions, 'userManagement');
 *   await userMgmt({ action: 'getUserPreferences', userId });
 *
 * Before:
 *   await notifPrefs({ action: 'setupPreferences', userId, email, emailNotifications, ... });
 * After:
 *   await userMgmt({ action: 'setupPreferences', userId, email, emailNotifications, ... });
 *
 * Before:
 *   await notifPrefs({ action: 'listAllPreferences' });
 * After:
 *   await userMgmt({ action: 'listAllPreferences' });
 *
 * Before:
 *   await notifPrefs({ action: 'deletePreferences', userId });
 * After:
 *   await userMgmt({ action: 'deletePreferences', userId });
 */

import {FieldValue} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";

import {db} from "../config/firebase";
import {
  USER_MANAGEMENT_ERRORS,
  USER_MANAGEMENT_MESSAGES,
} from "../constants/userManagement.constants";
import {
  NOTIFICATION_PREFERENCES_ERRORS,
  NOTIFICATION_PREFERENCES_MESSAGES,
  COLLECTIONS,
} from "../constants";
import type {
  UpdateUserStatusRequest,
  UpdateUserRequest,
  UpdateStatusResponse,
  UpdateUserResponse,
  ListUsersResponse,
} from "../types/userManagement.types";
import type {
  GetUserPreferencesRequest,
  ListAllPreferencesRequest,
  SetupPreferencesRequest,
  DeletePreferencesRequest,
  PreferencesResponse,
  ListPreferencesResponse,
  NotificationPreferences,
} from "../types";
import {
  validateStatus,
  validateRole,
  validateNotSuspendingSelf,
  validateNotChangingOwnRole,
  transformUserDocToListData,
  buildUpdateData,
  updateUserCustomClaims,
  createRoutedFunction,
} from "../utils";

/**
 * Request type for user management operations (including notification preferences)
 */
type UserManagementRequest = {
  action: "updateStatus" | "updateUser" | "listUsers" | 
          "getUserPreferences" | "setupPreferences" | "listAllPreferences" | "deletePreferences";
  userId?: string;
  status?: UpdateUserStatusRequest["status"];
  role?: UpdateUserRequest["role"];
  // Notification preference fields
  email?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  sendScheduledAlerts?: boolean;
  alertSeverities?: string[];
  parameters?: string[];
  devices?: string[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

/**
 * Response type for user management operations (including notification preferences)
 */
type UserManagementResponse = UpdateStatusResponse | UpdateUserResponse | ListUsersResponse | 
                               PreferencesResponse | ListPreferencesResponse;

/**
 * User Management - Single Callable Function
 * Handles all user management operations through a switch case
 * Uses the reusable createRoutedFunction utility for clean routing
 *
 * Supported actions:
 * - updateStatus: Update user status (Approve/Suspend/Pending)
 * - updateUser: Update user status and/or role
 * - listUsers: List all users
 *
 * @example
 * // Update status
 * const result = await functions.httpsCallable('userManagement')({
 *   action: 'updateStatus',
 *   userId: 'user123',
 *   status: 'Approved'
 * });
 *
 * @example
 * // Update user
 * const result = await functions.httpsCallable('userManagement')({
 *   action: 'updateUser',
 *   userId: 'user123',
 *   status: 'Approved',
 *   role: 'Admin'
 * });
 *
 * @example
 * // List users
 * const result = await functions.httpsCallable('userManagement')({
 *   action: 'listUsers'
 * });
 */
export const userManagement = onCall<UserManagementRequest, Promise<UserManagementResponse>>(
  createRoutedFunction<UserManagementRequest, UserManagementResponse>(
    {
      updateStatus: handleUpdateStatus,
      updateUser: handleUpdateUser,
      listUsers: handleListUsers,
      getUserPreferences: handleGetUserPreferences,
      setupPreferences: handleSetupPreferences,
      listAllPreferences: handleListAllPreferences,
      deletePreferences: handleDeletePreferences,
    },
    {
      requireAuth: true,
      requireAdmin: false, // Admin requirement checked per-action
      actionField: "action",
    }
  )
);

/**
 * Handle update user status operation
 *
 * @param {CallableRequest<UserManagementRequest>} request - Request with userId and status
 * @return {Promise<UpdateStatusResponse>} Updated status response
 */
async function handleUpdateStatus(
  request: CallableRequest<UserManagementRequest>
): Promise<UpdateStatusResponse> {
  const {userId, status} = request.data;

  // Validate input
  if (!userId || !status) {
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.STATUS_REQUIRED);
  }

  validateStatus(status);

  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", USER_MANAGEMENT_ERRORS.USER_NOT_FOUND);
    }

    // Prevent admin from suspending themselves
    validateNotSuspendingSelf(request.auth!.uid, userId, status);

    // Update user status
    const updateData = buildUpdateData(request.auth!.uid, {status});
    await userRef.update(updateData);

    // Update custom claims for Firebase Auth
    // eslint-disable-next-line @typescript-eslint/naming-convention
    await updateUserCustomClaims(userId, {status});

    return {
      success: true,
      // eslint-disable-next-line new-cap
      message: USER_MANAGEMENT_MESSAGES.STATUS_UPDATED(status),
      userId: userId,
      status: status,
    };
  } catch (error) {
    console.error("Error updating user status:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", USER_MANAGEMENT_ERRORS.UPDATE_STATUS_FAILED);
  }
}

/**
 * Handle update user operation
 *
 * @param {CallableRequest<UserManagementRequest>} request - Request with userId and update data
 * @return {Promise<UpdateUserResponse>} Updated user response
 */
async function handleUpdateUser(
  request: CallableRequest<UserManagementRequest>
): Promise<UpdateUserResponse> {
  const {userId, status, role} = request.data;

  // Validate input
  if (!userId) {
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.USER_ID_REQUIRED);
  }

  if (!status && !role) {
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.UPDATE_FIELD_REQUIRED);
  }

  // Validate status if provided
  if (status) {
    validateStatus(status);
  }

  // Validate role if provided
  if (role) {
    validateRole(role);
  }

  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", USER_MANAGEMENT_ERRORS.USER_NOT_FOUND);
    }

    // Prevent admin from modifying their own account
    if (request.auth!.uid === userId) {
      if (status === "Suspended") {
        validateNotSuspendingSelf(request.auth!.uid, userId, status);
      }
      if (role === "Staff") {
        validateNotChangingOwnRole(request.auth!.uid, userId, role);
      }
    }

    // Build update object with standard metadata
    const updateData = buildUpdateData(request.auth!.uid, {status, role});

    // Update Firestore document
    await userRef.update(updateData);

    // Update custom claims in Firebase Auth
    await updateUserCustomClaims(userId, {status, role});

    return {
      success: true,
      message: USER_MANAGEMENT_MESSAGES.USER_UPDATED,
      userId: userId,
      updates: {status, role},
    };
  } catch (error) {
    console.error("Error updating user:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", USER_MANAGEMENT_ERRORS.UPDATE_USER_FAILED);
  }
}

/**
 * Handle list users operation
 *
 * @param {CallableRequest<UserManagementRequest>} _request - The request object (unused)
 * @return {Promise<ListUsersResponse>} List of users response
 */
async function handleListUsers(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: CallableRequest<UserManagementRequest>
): Promise<ListUsersResponse> {
  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.orderBy("createdAt", "desc").get();

    const users = snapshot.docs.map((doc) => transformUserDocToListData(doc.id, doc.data()));

    return {
      success: true,
      users: users,
      count: users.length,
    };
  } catch (error) {
    console.error("Error listing users:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", USER_MANAGEMENT_ERRORS.LIST_USERS_FAILED);
  }
}

// ===========================
// NOTIFICATION PREFERENCES HANDLERS
// ===========================

/**
 * Get User Preferences Handler
 * Retrieves notification preferences for a specific user
 *
 * @param {CallableRequest<UserManagementRequest>} request - Callable request with userId
 * @return {Promise<PreferencesResponse>} Success response with user's preferences or null if not set
 */
async function handleGetUserPreferences(
  request: CallableRequest<UserManagementRequest>
): Promise<PreferencesResponse> {
  const {userId} = request.data;
  const requestingUserId = request.auth?.uid;
  const isAdmin = request.auth?.token?.role === "Admin";

  if (!userId) {
    throw new HttpsError("invalid-argument", NOTIFICATION_PREFERENCES_ERRORS.MISSING_USER_ID);
  }

  if (!requestingUserId) {
    throw new HttpsError("unauthenticated", NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED);
  }

  // Security: Users can only access their own preferences unless admin
  if (userId !== requestingUserId && !isAdmin) {
    throw new HttpsError("permission-denied", NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED);
  }

  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

    if (!userDoc.exists) {
      return {
        success: true,
        message: NOTIFICATION_PREFERENCES_MESSAGES.NOT_FOUND,
        data: null,
      };
    }

    const preferences = userDoc.get("notificationPreferences") as
      | NotificationPreferences
      | undefined;

    if (!preferences) {
      return {
        success: true,
        message: NOTIFICATION_PREFERENCES_MESSAGES.NOT_FOUND,
        data: null,
      };
    }

    return {
      success: true,
      message: NOTIFICATION_PREFERENCES_MESSAGES.GET_SUCCESS,
      data: {
        ...preferences,
        userId: preferences.userId ?? userId,
      },
    };
  } catch (error) {
    console.error("Error getting user preferences:", error);
    throw new HttpsError("internal", NOTIFICATION_PREFERENCES_ERRORS.GET_FAILED);
  }
}

/**
 * List All Preferences Handler
 * Retrieves notification preferences for all users (admin only)
 *
 * @param {CallableRequest<UserManagementRequest>} request - Callable request
 * @return {Promise<ListPreferencesResponse>} Success response with array of all preferences
 */
async function handleListAllPreferences(
  request: CallableRequest<UserManagementRequest>
): Promise<ListPreferencesResponse> {
  const isAdmin = request.auth?.token?.role === "Admin";

  if (!isAdmin) {
    throw new HttpsError("permission-denied", NOTIFICATION_PREFERENCES_ERRORS.ADMIN_REQUIRED);
  }

  try {
    const snapshot = await db.collection(COLLECTIONS.USERS).select("notificationPreferences").get();

    const preferences: NotificationPreferences[] = snapshot.docs
      .map((doc) => {
        const data = doc.data() as { notificationPreferences?: NotificationPreferences };
        if (!data?.notificationPreferences) {
          return null;
        }
        return {
          ...data.notificationPreferences,
          userId: data.notificationPreferences.userId ?? doc.id,
        } as NotificationPreferences;
      })
      .filter((pref): pref is NotificationPreferences => pref !== null);

    return {
      success: true,
      message: NOTIFICATION_PREFERENCES_MESSAGES.LIST_SUCCESS,
      data: preferences,
    };
  } catch (error) {
    console.error("Error listing all preferences:", error);
    throw new HttpsError("internal", NOTIFICATION_PREFERENCES_ERRORS.LIST_FAILED);
  }
}

/**
 * Setup Preferences Handler
 * Creates or updates notification preferences for a user
 *
 * @param {CallableRequest<UserManagementRequest>} request - Callable request with preference data
 * @return {Promise<PreferencesResponse>} Success response with saved preferences
 */
async function handleSetupPreferences(
  request: CallableRequest<UserManagementRequest>
): Promise<PreferencesResponse> {
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
  } = request.data;

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
    throw new HttpsError("unauthenticated", NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED);
  }

  // Security: Users can only update their own preferences unless admin
  if (userId !== requestingUserId && !isAdmin) {
    throw new HttpsError("permission-denied", NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED);
  }

  // Validate email if email notifications enabled
  if (emailNotifications && !email) {
    throw new HttpsError("invalid-argument", NOTIFICATION_PREFERENCES_ERRORS.EMAIL_REQUIRED);
  }

  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", NOTIFICATION_PREFERENCES_ERRORS.USER_NOT_FOUND);
    }

    const existingPreferences = userDoc.get("notificationPreferences") as
      | NotificationPreferences
      | undefined;

    const preferencesData: Record<string, unknown> = {
      userId,
      email,
      emailNotifications: emailNotifications ?? false,
      pushNotifications: pushNotifications ?? false,
      sendScheduledAlerts: sendScheduledAlerts ?? true,
      alertSeverities: alertSeverities ?? ["Critical", "Warning", "Advisory"],
      parameters: parameters ?? [],
      devices: devices ?? [],
      quietHoursEnabled: quietHoursEnabled ?? false,
      quietHoursStart: quietHoursStart ?? null,
      quietHoursEnd: quietHoursEnd ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!existingPreferences) {
      preferencesData.createdAt = FieldValue.serverTimestamp();
    }

    await userRef.set({notificationPreferences: preferencesData}, {merge: true});

    const savedDoc = await userRef.get();
    const savedPreferences = savedDoc.get("notificationPreferences") as
      | NotificationPreferences
      | undefined;

    return {
      success: true,
      message: existingPreferences ?
        NOTIFICATION_PREFERENCES_MESSAGES.UPDATE_SUCCESS :
        NOTIFICATION_PREFERENCES_MESSAGES.CREATE_SUCCESS,
      data: savedPreferences ?
        {
          ...savedPreferences,
          userId: savedPreferences.userId ?? userId,
        } :
        null,
    };
  } catch (error) {
    console.error("Error setting up preferences:", error);
    throw new HttpsError("internal", NOTIFICATION_PREFERENCES_ERRORS.SETUP_FAILED);
  }
}

/**
 * Delete Preferences Handler
 * Deletes notification preferences for a user
 *
 * @param {CallableRequest<UserManagementRequest>} request - Callable request with userId
 * @return {Promise<PreferencesResponse>} Success response
 */
async function handleDeletePreferences(
  request: CallableRequest<UserManagementRequest>
): Promise<PreferencesResponse> {
  const {userId} = request.data;
  const requestingUserId = request.auth?.uid;
  const isAdmin = request.auth?.token?.role === "Admin";

  if (!userId) {
    throw new HttpsError("invalid-argument", NOTIFICATION_PREFERENCES_ERRORS.MISSING_USER_ID);
  }

  if (!requestingUserId) {
    throw new HttpsError("unauthenticated", NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED);
  }

  // Security: Users can only delete their own preferences unless admin
  if (userId !== requestingUserId && !isAdmin) {
    throw new HttpsError("permission-denied", NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED);
  }

  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", NOTIFICATION_PREFERENCES_ERRORS.USER_NOT_FOUND);
    }

    await userRef.update({notificationPreferences: FieldValue.delete()});

    return {
      success: true,
      message: NOTIFICATION_PREFERENCES_MESSAGES.DELETE_SUCCESS,
      data: null,
    };
  } catch (error) {
    console.error("Error deleting preferences:", error);
    throw new HttpsError("internal", NOTIFICATION_PREFERENCES_ERRORS.DELETE_FAILED);
  }
}
