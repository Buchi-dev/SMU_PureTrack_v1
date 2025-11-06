/**
 * Notification Preferences Constants
 * Error messages and success messages for notification preferences operations
 *
 * @module constants/notificationPreferences.constants
 */

// ===========================
// ERROR MESSAGES
// ===========================

/**
 * Standardized error messages for notification preferences
 * Use these constants for consistent error handling
 */
export const NOTIFICATION_PREFERENCES_ERRORS = {
  // Validation errors
  MISSING_USER_ID: "User ID is required",
  MISSING_REQUIRED_FIELDS: "Missing required fields",
  EMAIL_REQUIRED: "Email is required when email notifications are enabled",

  // Authentication errors
  UNAUTHENTICATED: "Authentication required to manage notification preferences",
  PERMISSION_DENIED: "You do not have permission to manage these notification preferences",
  ADMIN_REQUIRED: "Admin privileges required for this operation",

  // Operation errors
  GET_FAILED: "Failed to retrieve notification preferences",
  LIST_FAILED: "Failed to list notification preferences",
  SETUP_FAILED: "Failed to setup notification preferences",
  DELETE_FAILED: "Failed to delete notification preferences",
  USER_NOT_FOUND: "User not found",
} as const;

// ===========================
// SUCCESS MESSAGES
// ===========================

/**
 * Standardized success messages for notification preferences
 * Use these constants for consistent success responses
 */
export const NOTIFICATION_PREFERENCES_MESSAGES = {
  NOT_FOUND: "Notification preferences not found",
  GET_SUCCESS: "Notification preferences retrieved successfully",
  LIST_SUCCESS: "Notification preferences listed successfully",
  CREATE_SUCCESS: "Notification preferences created successfully",
  UPDATE_SUCCESS: "Notification preferences updated successfully",
  DELETE_SUCCESS: "Notification preferences deleted successfully",
} as const;
