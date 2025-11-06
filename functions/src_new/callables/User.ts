/**
 * User Management Callable Function
 * Single function with switch case to handle multiple user management operations
 * Optimized to reduce Firebase function quota usage (66% reduction from 3 to 1 function)
 *
 * @module callable/userManagement
 *
 * MIGRATION GUIDE - Update client calls:
 *
 * Before:
 *   const updateStatus = httpsCallable(functions, 'updateUserStatus');
 *   await updateStatus({ userId, status });
 *
 * After:
 *   const userMgmt = httpsCallable(functions, 'userManagement');
 *   await userMgmt({ action: 'updateStatus', userId, status });
 *
 * Before:
 *   const updateUser = httpsCallable(functions, 'updateUser');
 *   await updateUser({ userId, status, role });
 *
 * After:
 *   const userMgmt = httpsCallable(functions, 'userManagement');
 *   await userMgmt({ action: 'updateUser', userId, status, role });
 *
 * Before:
 *   const listUsers = httpsCallable(functions, 'listUsers');
 *   await listUsers();
 *
 * After:
 *   const userMgmt = httpsCallable(functions, 'userManagement');
 *   await userMgmt({ action: 'listUsers' });
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";

import {db} from "../config/firebase";
import {
  USER_MANAGEMENT_ERRORS,
  USER_MANAGEMENT_MESSAGES,
} from "../constants/userManagement.constants";
import type {
  UpdateUserStatusRequest,
  UpdateUserRequest,
  UpdateStatusResponse,
  UpdateUserResponse,
  ListUsersResponse,
} from "../types/userManagement.types";
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
 * Request type for user management operations
 */
interface UserManagementRequest {
  action: "updateStatus" | "updateUser" | "listUsers";
  userId?: string;
  status?: UpdateUserStatusRequest["status"];
  role?: UpdateUserRequest["role"];
}

/**
 * Response type for user management operations
 */
type UserManagementResponse = UpdateStatusResponse | UpdateUserResponse | ListUsersResponse;

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
    },
    {
      requireAuth: true,
      requireAdmin: true,
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
