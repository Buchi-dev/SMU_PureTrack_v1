/**
 * User Management Constants
 * Domain-specific constants for user management operations
 *
 * @module constants/userManagement.constants
 */

// ===========================
// USER STATUS CONSTANTS
// ===========================

/**
 * Valid user status values
 * Single source of truth for all status-related operations
 */
export const VALID_USER_STATUSES = ["Pending", "Approved", "Suspended"] as const;

/**
 * User status type derived from constants
 */
export type UserStatus = (typeof VALID_USER_STATUSES)[number];

// ===========================
// USER ROLE CONSTANTS
// ===========================

/**
 * Valid user role values
 * Single source of truth for all role-related operations
 */
export const VALID_USER_ROLES = ["Admin", "Staff"] as const;

/**
 * User role type derived from constants
 */
export type UserRole = (typeof VALID_USER_ROLES)[number];

// ===========================
// ERROR MESSAGES
// ===========================

/**
 * Standardized error messages for user management operations
 */
export const USER_MANAGEMENT_ERRORS = {
  // Authentication errors
  UNAUTHENTICATED: "You must be logged in to perform this action",
  PERMISSION_DENIED: "Only administrators can perform this action",

  // Input validation errors
  USER_ID_REQUIRED: "userId is required",
  STATUS_REQUIRED: "userId and status are required",
  UPDATE_FIELD_REQUIRED: "At least one of status or role must be provided",
  INVALID_STATUS: (validStatuses: readonly string[]) =>
    `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
  INVALID_ROLE: (validRoles: readonly string[]) =>
    `Invalid role. Must be one of: ${validRoles.join(", ")}`,

  // Resource errors
  USER_NOT_FOUND: "User not found",

  // Business logic errors
  CANNOT_SUSPEND_SELF: "You cannot suspend your own account",
  CANNOT_CHANGE_OWN_ROLE: "You cannot change your own role",

  // Operation errors
  UPDATE_STATUS_FAILED: "Failed to update user status",
  UPDATE_USER_FAILED: "Failed to update user",
  LIST_USERS_FAILED: "Failed to list users",
} as const;

/**
 * Standardized success messages for user management operations
 */
export const USER_MANAGEMENT_MESSAGES = {
  STATUS_UPDATED: (status: UserStatus) => `User status updated to ${status}`,
  USER_UPDATED: "User updated successfully",
} as const;
