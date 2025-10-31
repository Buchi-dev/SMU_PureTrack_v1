/**
 * Before User Sign-In Hook
 * Authentication Blocking Function - Firebase Identity Platform
 *
 * Triggered on every sign-in attempt, including first sign-in after
 * account creation.
 *
 * Responsibilities:
 * - Validates email domain (restricts to @smu.edu.ph)
 * - Verifies user profile exists in Firestore
 * - Logs all sign-in attempts for security audit
 * - Updates last login timestamp
 * - Allows sign-in for all statuses (client handles routing)
 * - Blocks unauthorized domains
 *
 * Note: User status (Pending/Approved/Suspended) is checked client-side
 * for appropriate UI routing. This function focuses on authentication
 * and audit logging.
 *
 * @module auth/beforeSignIn
 */

import {beforeUserSignedIn, HttpsError} from "firebase-functions/v2/identity";
import {
  validateUserData,
  validateEmailDomain,
  parseUserInfo,
  getUserProfile,
  updateLastLogin,
  logSignInAttempt,
  createPermissionDeniedError,
  createNotFoundError,
  createInternalError,
} from "../utils/authHelpers";
import {
  USER_STATUSES,
  LOGIN_RESULTS,
  AUTH_ERROR_MESSAGES,
  LOG_PREFIXES,
} from "../constants/auth.constants";

/**
 * Before User Signed In - Sign-In Validation Hook
 *
 * This blocking function intercepts sign-in attempts and validates
 * user credentials and profile existence before granting access.
 */
export const beforeSignIn = beforeUserSignedIn(
  {
    region: "us-central1",
  },
  async (event) => {
    const authUser = event.data;

    // Validate user data exists
    validateUserData(authUser);

    // Parse user information
    const userInfo = parseUserInfo(authUser);

    // Validate email domain
    const domainValidation = validateEmailDomain(userInfo.email);

    if (!domainValidation.isValid) {
      console.warn(
        `${LOG_PREFIXES.BLOCKED} Sign-in attempt rejected for ${userInfo.email} - Domain not allowed`
      );

      // Log rejected sign-in attempt
      await logSignInAttempt(
        userInfo.uid,
        userInfo.email,
        userInfo.displayName,
        USER_STATUSES.PENDING,
        LOGIN_RESULTS.REJECTED,
        `Sign-in blocked: Email domain ${domainValidation.domain} not allowed`
      );

      throw createPermissionDeniedError(AUTH_ERROR_MESSAGES.DOMAIN_NOT_ALLOWED);
    }

    console.log(`${LOG_PREFIXES.SIGN_IN} Authentication attempt by: ${userInfo.email}`);

    try {
      // Retrieve user profile from Firestore
      const userProfile = await getUserProfile(userInfo.uid);

      if (!userProfile) {
        console.error(
          `${LOG_PREFIXES.ERROR} User profile not found for ${userInfo.email} (UID: ${userInfo.uid})`
        );

        // Log error for missing profile
        await logSignInAttempt(
          userInfo.uid,
          userInfo.email,
          userInfo.displayName,
          USER_STATUSES.PENDING,
          LOGIN_RESULTS.ERROR,
          "User profile not found in database - possible sync issue"
        );

        throw createNotFoundError(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
      }

      const userStatus = userProfile.status;

      console.log(
        `${LOG_PREFIXES.AUTHENTICATED} User ${userInfo.email} signed in - Status: ${userStatus}`
      );

      // Log successful sign-in attempt
      await logSignInAttempt(
        userInfo.uid,
        userInfo.email,
        userInfo.displayName,
        userStatus,
        LOGIN_RESULTS.SUCCESS,
        `Sign-in successful - User status: ${userStatus}`
      );

      // Update last login timestamp
      await updateLastLogin(userInfo.uid);

      // Allow sign-in to proceed
      // Client-side routing will handle status-based redirects
      return;
    } catch (error) {
      // Re-throw HttpsError instances (already handled)
      if (error instanceof HttpsError) {
        throw error;
      }

      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error(
        `${LOG_PREFIXES.ERROR} Unexpected error during sign-in for ${userInfo.email}: ${errorMessage}`
      );

      // Log unexpected error
      await logSignInAttempt(
        userInfo.uid,
        userInfo.email,
        userInfo.displayName,
        USER_STATUSES.PENDING,
        LOGIN_RESULTS.ERROR,
        `Unexpected error: ${errorMessage}`
      );

      throw createInternalError(AUTH_ERROR_MESSAGES.SIGN_IN_ERROR);
    }
  }
);
