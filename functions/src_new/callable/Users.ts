/**
 * User Management Callable Function
 *
 * Handles all user management and notification preference operations through a single
 * routed callable function. Uses switch-case routing for optimal Firebase quota usage.
 *
 * @module callable/Users
 */

import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import {
  USER_MANAGEMENT_ERRORS,
  USER_MANAGEMENT_MESSAGES,
  NOTIFICATION_PREFERENCES_ERRORS,
  NOTIFICATION_PREFERENCES_MESSAGES,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "../constants/User.Constants";
import { COLLECTIONS, FIELD_NAMES, SORT_ORDERS } from "../constants/Database.Constants";
import type {
  UpdateUserStatusRequest,
  UpdateUserRequest,
  UpdateStatusResponse,
  UpdateUserResponse,
  ListUsersResponse,
  SetupPreferencesRequest,
  PreferencesResponse,
  NotificationPreferences,
} from "../types/User.Types";
import {
  validateStatus,
  validateRole,
  validateNotSuspendingSelf,
  validateNotChangingOwnRole,
  transformUserDocToListData,
  buildUpdateData,
  updateUserCustomClaims,
} from "../utils/UserHelpers";
import { createRoutedFunction } from "../utils/SwitchCaseRouting";
import { handleOperationError } from "../utils/ErrorHandlers";

// ===========================
// TYPE DEFINITIONS
// ===========================

/**
 * Union type for all user management request actions
 */
type UserManagementRequest = {
  action:
    | "updateStatus"
    | "updateUser"
    | "listUsers"
    | "getUserPreferences"
    | "setupPreferences";
  userId?: string;
  status?: UpdateUserStatusRequest["status"];
  role?: UpdateUserRequest["role"];
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
};

/**
 * Union type for all possible response types
 */
type UserManagementResponse =
  | UpdateStatusResponse
  | UpdateUserResponse
  | ListUsersResponse
  | PreferencesResponse;

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Gets a user document from Firestore and validates it exists
 *
 * @param {string} userId - The user ID to fetch
 * @return {Promise<FirebaseFirestore.DocumentSnapshot>} The user document snapshot
 * @throws {HttpsError} not-found if user doesn't exist
 */
async function getUserDocument(
  userId: string
): Promise<FirebaseFirestore.DocumentSnapshot> {
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", USER_MANAGEMENT_ERRORS.USER_NOT_FOUND);
  }

  return userDoc;
}

/**
 * Validates permission to access another user's preferences
 *
 * @param {string} requestingUserId - ID of user making the request
 * @param {string} targetUserId - ID of user being accessed
 * @param {boolean} isAdmin - Whether requesting user is an admin
 * @throws {HttpsError} permission-denied if user lacks permission
 */
function validatePreferenceAccess(
  requestingUserId: string,
  targetUserId: string,
  isAdmin: boolean
): void {
  if (targetUserId !== requestingUserId && !isAdmin) {
    throw new HttpsError(
      "permission-denied",
      NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED
    );
  }
}

/**
 * Validates authentication context exists
 *
 * @param {string | undefined} userId - The authenticated user ID
 * @throws {HttpsError} unauthenticated if no auth context
 */
function validateAuthenticated(userId: string | undefined): asserts userId is string {
  if (!userId) {
    throw new HttpsError(
      "unauthenticated",
      NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED
    );
  }
}

/**
 * Builds notification preferences data object with defaults
 *
 * @param {UserManagementRequest} data - Request data containing preference fields
 * @param {boolean} isNewPreference - Whether this is a new preference (adds createdAt)
 * @return {Record<string, unknown>} Preferences data object
 */
function buildPreferencesData(
  data: UserManagementRequest,
  isNewPreference: boolean
): Record<string, unknown> {
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
  } = data;

  const preferencesData: Record<string, unknown> = {
    userId: userId!,
    email: email!,
    emailNotifications: emailNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.EMAIL_NOTIFICATIONS,
    pushNotifications: pushNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.PUSH_NOTIFICATIONS,
    sendScheduledAlerts: sendScheduledAlerts ?? DEFAULT_NOTIFICATION_PREFERENCES.SEND_SCHEDULED_ALERTS,
    alertSeverities: alertSeverities ?? DEFAULT_NOTIFICATION_PREFERENCES.ALERT_SEVERITIES,
    parameters: parameters ?? DEFAULT_NOTIFICATION_PREFERENCES.PARAMETERS,
    devices: devices ?? DEFAULT_NOTIFICATION_PREFERENCES.DEVICES,
    quietHoursEnabled: quietHoursEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_ENABLED,
    quietHoursStart: quietHoursStart ?? DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_START,
    quietHoursEnd: quietHoursEnd ?? DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_END,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (isNewPreference) {
    preferencesData.createdAt = FieldValue.serverTimestamp();
  }

  return preferencesData;
}

/**
 * Retrieves notification preferences from a user document
 *
 * @param {string} userId - The user ID (used as fallback)
 * @param {FirebaseFirestore.DocumentSnapshot} userDoc - The user document
 * @return {NotificationPreferences | null} The preferences or null if not found
 */
function getPreferencesFromDoc(
  userId: string,
  userDoc: FirebaseFirestore.DocumentSnapshot
): NotificationPreferences | null {
  const preferences = userDoc.get(
    FIELD_NAMES.NOTIFICATION_PREFERENCES
  ) as NotificationPreferences | undefined;

  if (!preferences) {
    return null;
  }

  return {
    ...preferences,
    userId: preferences.userId ?? userId,
  };
}

// ===========================
// MAIN CALLABLE FUNCTION
// ===========================


/**
 * User Management Callable Function
 *
 * Single endpoint handling multiple user management operations:
 * - updateStatus: Update user status (Pending/Approved/Suspended)
 * - updateUser: Update user status and/or role
 * - listUsers: List all users in the system
 * - getUserPreferences: Get notification preferences for a user
 * - setupPreferences: Create or update notification preferences
 */
export const userManagement = onCall<
  UserManagementRequest,
  Promise<UserManagementResponse>
>(
  createRoutedFunction<UserManagementRequest, UserManagementResponse>(
    {
      updateStatus: handleUpdateStatus,
      updateUser: handleUpdateUser,
      listUsers: handleListUsers,
      getUserPreferences: handleGetUserPreferences,
      setupPreferences: handleSetupPreferences,
    },
    {
      requireAuth: true,
      requireAdmin: false,
      actionField: "action",
    }
  )
);

// ===========================
// ACTION HANDLERS
// ===========================

/**
 * Handler: Update User Status
 *
 * Updates a user's status (Pending/Approved/Suspended).
 * Validates the user cannot suspend themselves.
 * Updates both Firestore and Firebase Auth custom claims.
 */
async function handleUpdateStatus(
  request: CallableRequest<UserManagementRequest>
): Promise<UpdateStatusResponse> {
  const { userId, status } = request.data;

  // Validate required fields
  if (!userId || !status) {
    throw new HttpsError(
      "invalid-argument",
      USER_MANAGEMENT_ERRORS.STATUS_REQUIRED
    );
  }

  validateStatus(status);

  try {
    // Get and validate user exists
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    await getUserDocument(userId);

    // Business logic validation
    validateNotSuspendingSelf(request.auth!.uid, userId, status);

    // Update Firestore document
    const updateData = buildUpdateData(request.auth!.uid, { status });
    await userRef.update(updateData);

    // Sync with Firebase Auth claims
    await updateUserCustomClaims(userId, { status });

    return {
      success: true,
      message: USER_MANAGEMENT_MESSAGES.STATUS_UPDATED(status),
      userId,
      status,
    };
  } catch (error) {
    handleOperationError(error, "updating user status", USER_MANAGEMENT_ERRORS.UPDATE_STATUS_FAILED);
  }
}

/**
 * Handler: Update User
 *
 * Updates user status and/or role.
 * Validates users cannot suspend themselves or demote their own role.
 * Updates both Firestore and Firebase Auth custom claims.
 */
async function handleUpdateUser(
  request: CallableRequest<UserManagementRequest>
): Promise<UpdateUserResponse> {
  const { userId, status, role } = request.data;

  // Validate required fields
  if (!userId) {
    throw new HttpsError(
      "invalid-argument",
      USER_MANAGEMENT_ERRORS.USER_ID_REQUIRED
    );
  }

  if (!status && !role) {
    throw new HttpsError(
      "invalid-argument",
      USER_MANAGEMENT_ERRORS.UPDATE_FIELD_REQUIRED
    );
  }

  // Validate field values
  if (status) validateStatus(status);
  if (role) validateRole(role);

  try {
    // Get and validate user exists
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    await getUserDocument(userId);

    // Business logic validations for self-actions
    const isSelfUpdate = request.auth!.uid === userId;
    if (isSelfUpdate) {
      if (status === "Suspended") {
        validateNotSuspendingSelf(request.auth!.uid, userId, status);
      }
      if (role === "Staff") {
        validateNotChangingOwnRole(request.auth!.uid, userId, role);
      }
    }

    // Update Firestore document
    const updateData = buildUpdateData(request.auth!.uid, { status, role });
    await userRef.update(updateData);

    // Sync with Firebase Auth claims
    await updateUserCustomClaims(userId, { status, role });

    return {
      success: true,
      message: USER_MANAGEMENT_MESSAGES.USER_UPDATED,
      userId,
      updates: { status, role },
    };
  } catch (error) {
    handleOperationError(error, "updating user", USER_MANAGEMENT_ERRORS.UPDATE_USER_FAILED);
  }
}

/**
 * Handler: List Users
 *
 * Returns all users in the system ordered by creation date (newest first).
 * Transforms Firestore documents into clean ListUserData objects.
 */
async function handleListUsers(
  _request: CallableRequest<UserManagementRequest>
): Promise<ListUsersResponse> {
  try {
    const snapshot = await db
      .collection(COLLECTIONS.USERS)
      .orderBy(SORT_ORDERS.CREATED_AT_DESC.field, SORT_ORDERS.CREATED_AT_DESC.direction)
      .get();

    const users = snapshot.docs.map((doc) =>
      transformUserDocToListData(doc.id, doc.data())
    );

    return {
      success: true,
      users,
      count: users.length,
    };
  } catch (error) {
    handleOperationError(error, "listing users", USER_MANAGEMENT_ERRORS.LIST_USERS_FAILED);
  }
}

/**
 * Handler: Get User Preferences
 *
 * Retrieves notification preferences for a specific user.
 * Users can access their own preferences, admins can access any user's preferences.
 */
async function handleGetUserPreferences(
  request: CallableRequest<UserManagementRequest>
): Promise<PreferencesResponse> {
  const { userId } = request.data;
  const requestingUserId = request.auth?.uid;
  const isAdmin = request.auth?.token?.role === "Admin";

  // Validate required fields
  if (!userId) {
    throw new HttpsError(
      "invalid-argument",
      NOTIFICATION_PREFERENCES_ERRORS.MISSING_USER_ID
    );
  }

  validateAuthenticated(requestingUserId);

  // Validate permissions
  validatePreferenceAccess(requestingUserId, userId, isAdmin);

  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

    // User doesn't exist or has no preferences
    if (!userDoc.exists) {
      return {
        success: true,
        message: NOTIFICATION_PREFERENCES_MESSAGES.NOT_FOUND,
        data: null,
      };
    }

    const preferences = getPreferencesFromDoc(userId, userDoc);

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
      data: preferences,
    };
  } catch (error) {
    handleOperationError(error, "getting user preferences", NOTIFICATION_PREFERENCES_ERRORS.GET_FAILED);
  }
}

/**
 * Handler: Setup Preferences
 *
 * Creates or updates notification preferences for a user.
 * Users can modify their own preferences, admins can modify any user's preferences.
 * Applies default values for optional fields.
 */
async function handleSetupPreferences(
  request: CallableRequest<UserManagementRequest>
): Promise<PreferencesResponse> {
  const { userId, email, emailNotifications } = request.data;
  const requestingUserId = request.auth?.uid;
  const isAdmin = request.auth?.token?.role === "Admin";

  // Validate required fields
  if (!userId || !email) {
    throw new HttpsError(
      "invalid-argument",
      NOTIFICATION_PREFERENCES_ERRORS.MISSING_REQUIRED_FIELDS
    );
  }

  validateAuthenticated(requestingUserId);

  // Validate permissions
  validatePreferenceAccess(requestingUserId, userId, isAdmin);

  // Validate email requirement for email notifications
  if (emailNotifications && !email) {
    throw new HttpsError(
      "invalid-argument",
      NOTIFICATION_PREFERENCES_ERRORS.EMAIL_REQUIRED
    );
  }

  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    // Validate user exists
    if (!userDoc.exists) {
      throw new HttpsError(
        "not-found",
        NOTIFICATION_PREFERENCES_ERRORS.USER_NOT_FOUND
      );
    }

    // Check if preferences already exist
    const existingPreferences = userDoc.get(
      FIELD_NAMES.NOTIFICATION_PREFERENCES
    ) as NotificationPreferences | undefined;

    const isNewPreference = !existingPreferences;

    // Build preferences data with defaults
    const preferencesData = buildPreferencesData(request.data, isNewPreference);

    // Update/create preferences
    await userRef.set(
      { [FIELD_NAMES.NOTIFICATION_PREFERENCES]: preferencesData },
      { merge: true }
    );

    // Fetch saved preferences to return
    const savedDoc = await userRef.get();
    const savedPreferences = getPreferencesFromDoc(userId, savedDoc);

    return {
      success: true,
      message: existingPreferences
        ? NOTIFICATION_PREFERENCES_MESSAGES.UPDATE_SUCCESS
        : NOTIFICATION_PREFERENCES_MESSAGES.CREATE_SUCCESS,
      data: savedPreferences,
    };
  } catch (error) {
    handleOperationError(error, "setting up preferences", NOTIFICATION_PREFERENCES_ERRORS.SETUP_FAILED);
  }
}
