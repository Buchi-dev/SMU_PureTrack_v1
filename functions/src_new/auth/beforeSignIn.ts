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
 * - Sets custom claims (role, status) in the authentication token
 * - Logs all sign-in attempts for security audit
 * - Updates last login timestamp
 * - Allows sign-in for all statuses (client handles routing)
 * - Blocks unauthorized domains
 *
 * Note: Custom claims enable backend authorization via request.auth.token.
 * User status routing is also handled client-side based on these claims.
 *
 * @module auth/beforeSignIn
 */

import {beforeUserSignedIn} from "firebase-functions/v2/identity";

import {
  USER_STATUSES,
  LOGIN_RESULTS,
  AUTH_ERROR_MESSAGES,
  LOG_PREFIXES,
} from "../constants/Auth.constants";
import {
  validateUserData,
  validateEmailDomain,
  parseUserInfo,
  getUserProfile,
  updateLastLogin,
  logSignInAttempt,
  createPermissionDeniedError,
  createNotFoundError,
} from "../utils/AuthHelpers";
import {withErrorHandling} from "../utils/ErrorHandlers";

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

    return await withErrorHandling(
      async () => {
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

        // Set custom claims for authorization
        // This allows the token to carry role and status information
        return {
          customClaims: {
            role: userProfile.role || "Staff",
            status: userProfile.status || "Pending",
          },
        };
      },
      `sign-in for ${userInfo.email}`,
      AUTH_ERROR_MESSAGES.SIGN_IN_ERROR
    );
  }
);
