/**
 * Alert Management Constants
 * Error messages and success messages for alert management operations
 *
 * @module constants/alertManagement.constants
 */

// ===========================
// ERROR MESSAGES
// ===========================

/**
 * Standardized error messages for alert management
 * Use these constants for consistent error handling
 */
export const ALERT_MANAGEMENT_ERRORS = {
  // Validation errors
  MISSING_ALERT_ID: "Alert ID is required",

  // Authentication errors
  UNAUTHENTICATED: "Authentication required to manage alerts",

  // Business logic errors
  ALERT_NOT_FOUND: "Alert not found",
  ALREADY_ACKNOWLEDGED: "Alert has already been acknowledged",
  ALREADY_RESOLVED: "Alert has already been resolved",

  // Operation errors
  ACKNOWLEDGE_FAILED: "Failed to acknowledge alert",
  RESOLVE_FAILED: "Failed to resolve alert",
  LIST_FAILED: "Failed to list alerts",
} as const;

// ===========================
// SUCCESS MESSAGES
// ===========================

/**
 * Standardized success messages for alert management
 * Use these constants for consistent success responses
 */
export const ALERT_MANAGEMENT_MESSAGES = {
  ACKNOWLEDGE_SUCCESS: "Alert acknowledged successfully",
  RESOLVE_SUCCESS: "Alert resolved successfully",
  LIST_SUCCESS: "Alerts retrieved successfully",
} as const;
