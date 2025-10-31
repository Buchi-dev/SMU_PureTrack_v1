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

// ===========================
// USER ROLE CONSTANTS
// ===========================

/**
 * Available user roles in the system
 */
export const USER_ROLES = {
  STAFF: "Staff",
  ADMIN: "Admin",
} as const;

/**
 * Default role assigned to new user accounts
 */
export const DEFAULT_USER_ROLE = USER_ROLES.STAFF;

// ===========================
// USER STATUS CONSTANTS
// ===========================

/**
 * Available user account statuses
 */
export const USER_STATUSES = {
  PENDING: "Pending",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
} as const;

/**
 * Default status assigned to new user accounts
 */
export const DEFAULT_USER_STATUS = USER_STATUSES.PENDING;

// ===========================
// AUTHENTICATION PROVIDER CONSTANTS
// ===========================

/**
 * Supported authentication providers
 */
export const AUTH_PROVIDERS = {
  GOOGLE: "google.com",
  EMAIL: "password",
} as const;

// ===========================
// LOGGING CONSTANTS
// ===========================

/**
 * Authentication action types for logging
 */
export const AUTH_ACTIONS = {
  USER_CREATED: "user_account_created",
  USER_SIGNED_IN: "user_signed_in",
  USER_APPROVED: "user_approved",
  USER_SUSPENDED: "user_suspended",
  USER_ROLE_CHANGED: "user_role_changed",
  USER_STATUS_CHANGED: "user_status_changed",
  SIGN_IN_BLOCKED: "sign_in_blocked",
  ACCOUNT_CREATION_BLOCKED: "account_creation_blocked",
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
  USER_DATA_MISSING: "User data is missing from authentication event",
  SIGN_IN_ERROR: "An unexpected error occurred during sign-in. Please try again.",
  PROFILE_CREATION_ERROR: "Failed to create user profile. Please try again.",
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
  WARNING: "[WARNING]",
} as const;
