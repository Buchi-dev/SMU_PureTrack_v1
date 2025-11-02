/**
 * User Management Utility Functions
 * Reusable helper functions for user management operations
 *
 * @module utils/userManagementHelpers
 */

import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

import type { UserStatus, UserRole } from "../constants/userManagement.constants";
import {
  VALID_USER_STATUSES,
  VALID_USER_ROLES,
  USER_MANAGEMENT_ERRORS,
} from "../constants/userManagement.constants";
import type { ListUserData } from "../types/userManagement.types";

// ===========================
// VALIDATION FUNCTIONS
// ===========================

/**
 * Validates user status input
 * @param {UserStatus} status - Status to validate
 * @throws {HttpsError} If status is invalid
 */
export function validateStatus(status: UserStatus): void {
  if (!VALID_USER_STATUSES.includes(status)) {
    throw new HttpsError(
      "invalid-argument",
      // eslint-disable-next-line new-cap
      USER_MANAGEMENT_ERRORS.INVALID_STATUS(VALID_USER_STATUSES)
    );
  }
}

/**
 * Validates user role input
 * @param {UserRole} role - Role to validate
 * @throws {HttpsError} If role is invalid
 */
export function validateRole(role: UserRole): void {
  if (!VALID_USER_ROLES.includes(role)) {
    // eslint-disable-next-line new-cap
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.INVALID_ROLE(VALID_USER_ROLES));
  }
}

// ===========================
// BUSINESS LOGIC VALIDATORS
// ===========================

/**
 * Validates that an admin is not trying to suspend their own account
 * @param {string} currentUserId - ID of the user making the request
 * @param {string} targetUserId - ID of the user being modified
 * @param {UserStatus} newStatus - New status being set
 * @throws {HttpsError} If admin tries to suspend themselves
 */
export function validateNotSuspendingSelf(
  currentUserId: string,
  targetUserId: string,
  newStatus: UserStatus
): void {
  if (currentUserId === targetUserId && newStatus === "Suspended") {
    throw new HttpsError("failed-precondition", USER_MANAGEMENT_ERRORS.CANNOT_SUSPEND_SELF);
  }
}

/**
 * Validates that an admin is not trying to change their own role
 * @param {string} currentUserId - ID of the user making the request
 * @param {string} targetUserId - ID of the user being modified
 * @param {UserRole} newRole - New role being set
 * @throws {HttpsError} If admin tries to change their own role
 */
export function validateNotChangingOwnRole(
  currentUserId: string,
  targetUserId: string,
  newRole: UserRole
): void {
  if (currentUserId === targetUserId && newRole === "Staff") {
    throw new HttpsError("failed-precondition", USER_MANAGEMENT_ERRORS.CANNOT_CHANGE_OWN_ROLE);
  }
}

// ===========================
// DATA TRANSFORMATION FUNCTIONS
// ===========================

/**
 * Converts Firestore user document to list data format
 * @param {string} docId - Firestore document ID
 * @param {FirebaseFirestore.DocumentData} data - Document data
 * @return {ListUserData} Formatted user data
 */
export function transformUserDocToListData(
  docId: string,
  data: FirebaseFirestore.DocumentData
): ListUserData {
  return {
    id: docId,
    uuid: data.uuid,
    firstname: data.firstname || "",
    lastname: data.lastname || "",
    middlename: data.middlename || "",
    department: data.department || "",
    phoneNumber: data.phoneNumber || "",
    email: data.email,
    role: data.role,
    status: data.status,
    createdAt: data.createdAt?.toDate().toISOString(),
    updatedAt: data.updatedAt?.toDate().toISOString(),
    lastLogin: data.lastLogin?.toDate().toISOString(),
  };
}

// ===========================
// FIRESTORE UPDATE HELPERS
// ===========================

/**
 * Builds update data object with standard metadata
 *
 * @param {string} performedBy - UID of user performing the update
 * @param {Partial<{status: UserStatus, role: UserRole}>} updates - Fields to update
 * @return {Record<string, unknown>} Update data with metadata
 */
export function buildUpdateData(
  performedBy: string,
  updates: Partial<{ status: UserStatus; role: UserRole }>
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    /* eslint-disable-next-line new-cap */
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: performedBy,
  };

  if (updates.status) {
    updateData.status = updates.status;
  }

  if (updates.role) {
    updateData.role = updates.role;
  }

  return updateData;
}

/**
 * Updates custom claims for a user in Firebase Auth
 *
 * @param {string} userId - User ID
 * @param {Partial<{status: UserStatus, role: UserRole}>} claims - Claims to update
 * @return {Promise<void>} Promise
 */
export async function updateUserCustomClaims(
  userId: string,
  claims: Partial<{ status: UserStatus; role: UserRole }>
): Promise<void> {
  const customClaims: Record<string, unknown> = {};

  if (claims.status) {
    customClaims.status = claims.status;
  }

  if (claims.role) {
    customClaims.role = claims.role;
  }

  await admin.auth().setCustomUserClaims(userId, customClaims);
}
