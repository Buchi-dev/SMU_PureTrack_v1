/**
 * Authentication Utility Functions
 * Reusable helper functions for auth-related operations
 *
 * @module utils/authHelpers
 */

import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/identity";

import {db} from "../config/firebase";
import {
  ALLOWED_EMAIL_DOMAIN,
  DEFAULT_USER_ROLE,
  DEFAULT_USER_STATUS,
} from "../constants/Auth.Constants";
import {COLLECTIONS, FIELD_NAMES} from "../constants/database.constants";
import {DEFAULT_NOTIFICATION_PREFERENCES} from "../constants/User.Constants";
import type {
  ParsedUserInfo,
  ParsedDisplayName,
  DomainValidationResult,
  UserProfile,
} from "../types/auth.types";

import {withErrorHandling} from "./ErrorHandlers";
import {sanitizeUserName, validateEmailWithDomain} from "./validators";

// ===========================
// VALIDATION FUNCTIONS
// ===========================

/**
 * Validates if an email belongs to the allowed domain
 * @param {string} email - Email address to validate
 * @return {DomainValidationResult} Validation result with details
 */
export function validateEmailDomain(email: string): DomainValidationResult {
  const result = validateEmailWithDomain(email, ALLOWED_EMAIL_DOMAIN);

  return {
    isValid: result.isValid,
    email: result.normalized,
    domain: ALLOWED_EMAIL_DOMAIN,
  };
}

/**
 * Validates user data from authentication event
 * @param {unknown} userData - User data from auth event
 * @throws {HttpsError} If user data is invalid
 */
export function validateUserData(userData: unknown): void {
  if (!userData) {
    throw new HttpsError("internal", "User data is missing from authentication event");
  }
}

// ===========================
// PARSING FUNCTIONS
// ===========================

/**
 * Parses and extracts user information from display name
 * Sanitizes names to prevent data pollution
 * @param {string} displayName - Full display name
 * @return {ParsedDisplayName} Parsed and sanitized name components
 */
export function parseDisplayName(displayName: string): ParsedDisplayName {
  const nameParts = (displayName || "").trim().split(" ");

  // Sanitize firstname
  const firstnameResult = sanitizeUserName(nameParts[0] || "");
  const firstname = firstnameResult.isValid ? firstnameResult.sanitized : "";

  // Sanitize lastname
  const lastnameRaw = nameParts.slice(1).join(" ") || "";
  const lastnameResult = sanitizeUserName(lastnameRaw);
  const lastname = lastnameResult.isValid ? lastnameResult.sanitized : "";

  return {firstname, lastname};
}

/**
 * Extracts and parses user information from auth event
 * @param {any} authUser - User object from Firebase Auth event
 * @return {ParsedUserInfo} Parsed user information
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, require-jsdoc
export function parseUserInfo(authUser: any): ParsedUserInfo {
  const {firstname, lastname} = parseDisplayName(authUser.displayName || "");

  return {
    uid: authUser.uid,
    email: authUser.email || "",
    displayName: authUser.displayName || "",
    phoneNumber: authUser.phoneNumber || "",
    firstname,
    lastname,
  };
}

// ===========================
// DATABASE OPERATIONS
// ===========================

/**
 * Creates a new user profile in Firestore
 * Includes default notification preferences for new users
 * @param {ParsedUserInfo} userInfo - Parsed user information
 * @return {Promise<void>}
 */
export async function createUserProfile(userInfo: ParsedUserInfo): Promise<void> {
  return await withErrorHandling(
    async () => {
      const userProfileData: UserProfile = {
        uuid: userInfo.uid,
        firstname: userInfo.firstname,
        lastname: userInfo.lastname,
        middlename: "",
        department: "",
        phoneNumber: userInfo.phoneNumber,
        email: userInfo.email,
        role: DEFAULT_USER_ROLE,
        status: DEFAULT_USER_STATUS,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Default notification preferences for new users
      const defaultNotificationPreferences = {
        userId: userInfo.uid,
        email: userInfo.email,
        emailNotifications: DEFAULT_NOTIFICATION_PREFERENCES.EMAIL_NOTIFICATIONS,
        sendScheduledAlerts: DEFAULT_NOTIFICATION_PREFERENCES.SEND_SCHEDULED_ALERTS,
        alertSeverities: DEFAULT_NOTIFICATION_PREFERENCES.ALERT_SEVERITIES,
        parameters: DEFAULT_NOTIFICATION_PREFERENCES.PARAMETERS,
        devices: DEFAULT_NOTIFICATION_PREFERENCES.DEVICES,
        quietHoursEnabled: DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_ENABLED,
        quietHoursStart: DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_START,
        quietHoursEnd: DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_END,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Create user document
      const userRef = db.collection(COLLECTIONS.USERS).doc(userInfo.uid);
      await userRef.set(userProfileData);

      // Create notification preferences in subcollection
      await userRef
        .collection(COLLECTIONS.NOTIFICATION_PREFERENCES)
        .add(defaultNotificationPreferences);
    },
    "creating user profile",
    "Failed to create user profile in database"
  );
}

/**
 * Retrieves user profile from Firestore
 * @param {string} uid - User ID
 * @return {Promise<UserProfile | null>} User profile or null if not found
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return await withErrorHandling(
    async () => {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

      if (!userDoc.exists) {
        return null;
      }

      return userDoc.data() as UserProfile;
    },
    "retrieving user profile",
    "Failed to retrieve user profile from database"
  );
}

/**
 * Updates user's last login timestamp
 * @param {string} uid - User ID
 * @return {Promise<void>}
 */
export async function updateLastLogin(uid: string): Promise<void> {
  return await withErrorHandling(
    async () => {
      await db.collection(COLLECTIONS.USERS).doc(uid).update({
        [FIELD_NAMES.LAST_LOGIN]: admin.firestore.FieldValue.serverTimestamp(),
        [FIELD_NAMES.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
      });
    },
    "updating last login timestamp",
    "Failed to update last login timestamp"
  );
}

// ===========================
// ERROR HANDLING
// ===========================

/**
 * Creates a standardized permission denied error
 * @param {string} message - Error message
 * @return {HttpsError}
 */
export function createPermissionDeniedError(message: string): HttpsError {
  return new HttpsError("permission-denied", message);
}

/**
 * Creates a standardized not found error
 * @param {string} message - Error message
 * @return {HttpsError}
 */
export function createNotFoundError(message: string): HttpsError {
  return new HttpsError("not-found", message);
}

/**
 * Creates a standardized internal error
 * @param {string} message - Error message
 * @return {HttpsError}
 */
export function createInternalError(message: string): HttpsError {
  return new HttpsError("internal", message);
}
