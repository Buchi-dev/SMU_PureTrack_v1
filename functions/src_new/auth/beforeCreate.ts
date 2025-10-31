/**
 * Before User Creation Hook
 * Authentication Blocking Function - Firebase Identity Platform
 *
 * Triggered when a user attempts to create an account for the first time
 * via Google OAuth authentication.
 *
 * Responsibilities:
 * - Validates email domain (restricts to @smu.edu.ph)
 * - Creates initial user profile in Firestore
 * - Sets default role (Staff) and status (Pending)
 * - Logs account creation for audit trail
 * - Blocks unauthorized domain registration
 *
 * @module auth/beforeCreate
 */

import {beforeUserCreated} from "firebase-functions/v2/identity";
import {
  validateUserData,
  validateEmailDomain,
  parseUserInfo,
  createUserProfile,
  logBusinessAction,
  createPermissionDeniedError,
} from "../utils/authHelpers";
import {
  DEFAULT_USER_ROLE,
  DEFAULT_USER_STATUS,
  AUTH_ACTIONS,
  AUTH_ERROR_MESSAGES,
  LOG_PREFIXES,
  AUTH_PROVIDERS,
} from "../constants/auth.constants";

/**
 * Before User Created - Account Registration Hook
 *
 * This blocking function intercepts user creation and validates
 * domain restrictions before allowing account registration.
 */
export const beforeCreate = beforeUserCreated(
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
        `${LOG_PREFIXES.BLOCKED} Account creation attempt rejected for ${userInfo.email} - Domain not allowed`
      );

      throw createPermissionDeniedError(AUTH_ERROR_MESSAGES.DOMAIN_NOT_ALLOWED);
    }

    console.log(`${LOG_PREFIXES.CREATING} Initializing user profile for: ${userInfo.email}`);

    try {
      // Create user profile with default values
      await createUserProfile(userInfo);

      console.log(
        `${LOG_PREFIXES.SUCCESS} User profile created - Email: ${userInfo.email}, ` +
        `Role: ${DEFAULT_USER_ROLE}, Status: ${DEFAULT_USER_STATUS}`
      );

      // Log account creation for audit trail
      await logBusinessAction(
        AUTH_ACTIONS.USER_CREATED,
        userInfo.uid,
        userInfo.email,
        "system",
        {
          role: DEFAULT_USER_ROLE,
          status: DEFAULT_USER_STATUS,
          provider: AUTH_PROVIDERS.GOOGLE,
          firstname: userInfo.firstname,
          lastname: userInfo.lastname,
        }
      );

      // Allow user creation to proceed
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(
        `${LOG_PREFIXES.ERROR} Failed to create user profile for ${userInfo.email}: ${errorMessage}`
      );

      // Allow creation to proceed even if profile creation fails
      // The user can complete their profile later through the UI
      return;
    }
  }
);
