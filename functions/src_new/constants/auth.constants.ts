/**
 * Authentication Constants
 * Domain-specific constants for authentication and authorization
 *
 * @module constants/auth.constants
 */

// ===========================
// EMAIL DOMAIN CONSTANTS
// ===========================

/**
 * Allowed email domain for user authentication
 * Only users with this domain can register and sign in
 */
export const ALLOWED_EMAIL_DOMAIN = "@smu.edu.ph";

/**
 * Organization name for error messages and logging
 */
const ORGANIZATION_NAME = "Saint Mary's University";

// Import user status and role from userManagement constants (single source of truth)
import type {UserStatus, UserRole} from "./userManagement.constants";

// ===========================
// DEFAULT USER VALUES
// ===========================

/**
 * Default role assigned to new user accounts
 */
export const DEFAULT_USER_ROLE: UserRole = "Staff";

/**
 * Default status assigned to new user accounts
 */
export const DEFAULT_USER_STATUS: UserStatus = "Pending";

// ===========================
// AUTHENTICATION PROVIDER CONSTANTS
// ===========================

/**
 * Google authentication provider identifier
 */
export const AUTH_PROVIDERS = {
  GOOGLE: "google.com",
} as const;

// ===========================
// LOGGING CONSTANTS
// ===========================

/**
 * Authentication action types for logging
 */
export const AUTH_ACTIONS = {
  USER_CREATED: "user_account_created",
} as const;

/**
 * User status constants for logging purposes
 * Maps to UserStatus type from userManagement constants
 */
export const USER_STATUSES = {
  PENDING: "Pending" as UserStatus,
  APPROVED: "Approved" as UserStatus,
  SUSPENDED: "Suspended" as UserStatus,
} as const;

/**
 * Login result types
 */
export const LOGIN_RESULTS = {
  SUCCESS: "success",
  REJECTED: "rejected",
  ERROR: "error",
} as const;

// ===========================
// ERROR MESSAGES
// ===========================

/**
 * Standardized error messages for authentication
 */
export const AUTH_ERROR_MESSAGES = {
  DOMAIN_NOT_ALLOWED: `Only ${ORGANIZATION_NAME} (${ALLOWED_EMAIL_DOMAIN}) accounts are allowed.`,
  USER_NOT_FOUND: "User profile not found. Please contact the system administrator.",
  SIGN_IN_ERROR: "An unexpected error occurred during sign-in. Please try again.",
} as const;

// ===========================
// LOG MESSAGE PREFIXES
// ===========================

/**
 * Standardized log message prefixes for consistency
 */
export const LOG_PREFIXES = {
  BLOCKED: "[BLOCKED]",
  CREATING: "[CREATING]",
  SUCCESS: "[SUCCESS]",
  ERROR: "[ERROR]",
  SIGN_IN: "[SIGN-IN]",
  AUTHENTICATED: "[AUTHENTICATED]",
} as const;
