/**
 * Authentication Utility Functions
 * Reusable helper functions for auth-related operations
 *
 * @module utils/authHelpers
 */

import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/identity";

import {db} from "../config/firebase";
import {COLLECTIONS, FIELD_NAMES} from "../constants/Database.Constants";
import {
  ALLOWED_EMAIL_DOMAIN,
  DEFAULT_USER_ROLE,
  DEFAULT_USER_STATUS,
} from "../constants/Auth.Constants";
import {DEFAULT_NOTIFICATION_PREFERENCES} from "../constants/User.Constants";
import type {
  ParsedUserInfo,
  ParsedDisplayName,
  DomainValidationResult,
  LoginLog,
  BusinessLog,
  UserProfile,
  LoginResult,
} from "../types/Auth.Types";
import {withErrorHandling} from "./ErrorHandlers";

// ===========================
// VALIDATION FUNCTIONS
// ===========================

/**
 * Validates if an email belongs to the allowed domain
 * @param {string} email - Email address to validate
 * @return {DomainValidationResult} Validation result with details
 */
export function validateEmailDomain(email: string): DomainValidationResult {
  const normalizedEmail = email.toLowerCase().trim();
  const isValid = normalizedEmail.endsWith(ALLOWED_EMAIL_DOMAIN);

  return {
    isValid,
    email: normalizedEmail,
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
 * @param {string} displayName - Full display name
 * @return {ParsedDisplayName} Parsed name components
 */
export function parseDisplayName(displayName: string): ParsedDisplayName {
  const nameParts = (displayName || "").trim().split(" ");
  const firstname = nameParts[0] || "";
  const lastname = nameParts.slice(1).join(" ") || "";

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
// LOGGING FUNCTIONS
// ===========================

/**
 * Logs a sign-in attempt to Firestore
 * @param {string} uid - User ID
 * @param {string} email - User email
 * @param {string} displayName - User display name
 * @param {string} statusAttempted - User status at time of attempt
 * @param {LoginResult} result - Result of the login attempt
 * @param {string} message - Descriptive message
 * @return {Promise<void>}
 */
export async function logSignInAttempt(
  uid: string,
  email: string,
  displayName: string,
  statusAttempted: string,
  result: LoginResult,
  message: string
): Promise<void> {
  const loginLog: LoginLog = {
    uid,
    email,
    displayName,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statusAttempted: statusAttempted as any,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    result,
    message,
  };

  try {
    await db.collection(COLLECTIONS.LOGIN_LOGS).add(loginLog);
  } catch (error) {
    // Don't throw - logging failure shouldn't block authentication
    console.error("Failed to log sign-in attempt:", error);
  }
}

/**
 * Logs a business action to Firestore
 * @param {string} action - Action performed
 * @param {string} uid - User ID
 * @param {string} email - User email
 * @param {string} performedBy - Who performed the action
 * @param {Record<string, unknown>} details - Additional details
 * @return {Promise<void>}
 */
export async function logBusinessAction(
  action: string,
  uid: string,
  email: string,
  performedBy: string,
  details: Record<string, unknown>
): Promise<void> {
  const businessLog: BusinessLog = {
    action,
    uid,
    email,
    performedBy,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    details,
  };

  try {
    await db.collection(COLLECTIONS.BUSINESS_LOGS).add(businessLog);
  } catch (error) {
    // Don't throw - logging failure shouldn't block operations
    console.error("Failed to log business action:", error);
  }
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
        pushNotifications: DEFAULT_NOTIFICATION_PREFERENCES.PUSH_NOTIFICATIONS,
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

      // Create user document with notification preferences
      await db
        .collection(COLLECTIONS.USERS)
        .doc(userInfo.uid)
        .set({
          ...userProfileData,
          [FIELD_NAMES.NOTIFICATION_PREFERENCES]: defaultNotificationPreferences,
        });
    },
    "creating user profile",
    `Failed to create user profile in database`
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
