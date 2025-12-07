/**
 * Success Messages Constants
 * Centralized success messages for consistent user feedback
 * Matches V2 backend success structure
 * Source: server_v2/src/core/configs/messages.config.ts
 */

/**
 * Alert Success Messages
 */
export const ALERT_SUCCESS = {
  CREATED: 'Alert created successfully',
  UPDATED: 'Alert updated successfully',
  DELETED: 'Alert deleted successfully',
  ACKNOWLEDGED: 'Alert acknowledged successfully',
  RESOLVED: 'Alert resolved successfully',
  FETCHED: 'Alerts retrieved successfully',
  STATISTICS_FETCHED: 'Alert statistics retrieved successfully',
} as const;

/**
 * Report Success Messages
 */
export const REPORT_SUCCESS = {
  CREATED: 'Report generated successfully',
  UPDATED: 'Report updated successfully',
  DELETED: 'Report deleted successfully',
  FETCHED: 'Reports retrieved successfully',
  DOWNLOADED: 'Report downloaded successfully',
  GENERATION_STARTED: 'Report generation started',
} as const;

/**
 * User Success Messages
 */
export const USER_SUCCESS = {
  CREATED: 'User created successfully',
  UPDATED: 'User updated successfully',
  FETCHED: 'Users retrieved successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  ROLE_UPDATED: 'User role updated successfully',
  STATUS_UPDATED: 'User status updated successfully',
  APPROVED: 'User approved successfully',
  SUSPENDED: 'User suspended successfully',
  ACTIVATED: 'User activated successfully',
} as const;

/**
 * Device Success Messages
 */
export const DEVICE_SUCCESS = {
  CREATED: 'Device registered successfully',
  UPDATED: 'Device updated successfully',
  DELETED: 'Device deleted successfully',
  FETCHED: 'Devices retrieved successfully',
  COMMAND_SENT: 'Command sent to device successfully',
  STATUS_UPDATED: 'Device status updated successfully',
  LOCATION_UPDATED: 'Device location updated successfully',
} as const;

/**
 * Sensor Reading Success Messages
 */
export const SENSOR_SUCCESS = {
  FETCHED: 'Sensor readings retrieved successfully',
  RECORDED: 'Sensor reading recorded successfully',
} as const;

/**
 * Authentication Success Messages
 */
export const AUTH_SUCCESS = {
  LOGIN: 'Signed in successfully',
  LOGOUT: 'Signed out successfully',
  TOKEN_VERIFIED: 'Token verified successfully',
  SESSION_REFRESHED: 'Session refreshed successfully',
  PASSWORD_RESET: 'Password reset email sent',
  PASSWORD_CHANGED: 'Password changed successfully',
} as const;

/**
 * Form Success Messages
 */
export const FORM_SUCCESS = {
  SUBMITTED: 'Form submitted successfully',
  SAVED: 'Changes saved successfully',
  RESET: 'Form reset successfully',
} as const;

/**
 * Analytics Success Messages
 */
export const ANALYTICS_SUCCESS = {
  FETCHED: 'Analytics data retrieved successfully',
  OVERVIEW_FETCHED: 'Overview statistics retrieved successfully',
  TRENDS_FETCHED: 'Trend analysis retrieved successfully',
} as const;

/**
 * File Success Messages
 */
export const FILE_SUCCESS = {
  UPLOADED: 'File uploaded successfully',
  DOWNLOADED: 'File downloaded successfully',
  DELETED: 'File deleted successfully',
} as const;

/**
 * General Success Messages
 */
export const GENERAL_SUCCESS = {
  OPERATION_COMPLETED: 'Operation completed successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  PREFERENCES_UPDATED: 'Preferences updated successfully',
  CHANGES_APPLIED: 'Changes applied successfully',
  ACTION_COMPLETED: 'Action completed successfully',
} as const;

/**
 * All success messages combined
 */
export const SUCCESS_MESSAGES = {
  ALERT: ALERT_SUCCESS,
  REPORT: REPORT_SUCCESS,
  USER: USER_SUCCESS,
  DEVICE: DEVICE_SUCCESS,
  SENSOR: SENSOR_SUCCESS,
  AUTH: AUTH_SUCCESS,
  FORM: FORM_SUCCESS,
  ANALYTICS: ANALYTICS_SUCCESS,
  FILE: FILE_SUCCESS,
  GENERAL: GENERAL_SUCCESS,
} as const;
