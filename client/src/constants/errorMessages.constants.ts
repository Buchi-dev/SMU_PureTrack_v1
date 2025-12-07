/**
 * Error Messages Constants
 * Centralized error messages for consistent user feedback
 * Matches V2 backend error structure
 * Source: server_v2/src/core/configs/messages.config.ts
 */

/**
 * Authentication & Authorization Errors
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid credentials provided',
  TOKEN_EXPIRED: 'Authentication token has expired. Please sign in again',
  TOKEN_INVALID: 'Invalid authentication token. Please sign in again',
  TOKEN_MISSING: 'Authentication token is required',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  USER_NOT_FOUND: 'User not found',
  USER_SUSPENDED: 'Your account has been suspended. Please contact an administrator',
  USER_PENDING: 'Your account is pending approval. Please wait for administrator approval',
  UNAUTHORIZED: 'Unauthorized access. Please sign in',
  FORBIDDEN: 'Access to this resource is forbidden',
  INVALID_EMAIL_DOMAIN: 'Only @smu.edu.ph email addresses are allowed',
  FIREBASE_AUTH_FAILED: 'Firebase authentication failed',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again',
} as const;

/**
 * Validation Errors
 */
export const VALIDATION_ERRORS = {
  FAILED: 'Validation failed. Please check your input',
  MISSING_REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_FORMAT: (field: string) => `Invalid format for ${field}`,
  OUT_OF_RANGE: (field: string, min: number, max: number) =>
    `${field} must be between ${min} and ${max}`,
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_DATE: 'Please enter a valid date',
  INVALID_DATE_RANGE: 'End date must be after start date',
  INVALID_ID: 'Invalid ID format',
  INVALID_ENUM: (field: string, values: string[]) =>
    `${field} must be one of: ${values.join(', ')}`,
  FIELD_TOO_SHORT: (field: string, minLength: number) =>
    `${field} must be at least ${minLength} characters`,
  FIELD_TOO_LONG: (field: string, maxLength: number) =>
    `${field} must not exceed ${maxLength} characters`,
} as const;

/**
 * Resource Errors
 */
export const RESOURCE_ERRORS = {
  NOT_FOUND: (resource: string) => `${resource} not found`,
  ALREADY_EXISTS: (resource: string) => `${resource} already exists`,
  CONFLICT: (resource: string) => `Conflict with existing ${resource}`,
  DELETED: (resource: string) => `${resource} has been deleted`,
  IN_USE: (resource: string) => `${resource} is currently in use and cannot be deleted`,
} as const;

/**
 * Device Errors
 */
export const DEVICE_ERRORS = {
  NOT_FOUND: 'Device not found',
  ALREADY_REGISTERED: 'Device is already registered',
  NOT_REGISTERED: 'Device is not registered. Please register the device first',
  OFFLINE: 'Device is currently offline',
  INVALID_ID: 'Invalid device ID format',
  REGISTRATION_FAILED: 'Device registration failed',
  COMMAND_FAILED: 'Failed to send command to device',
  INVALID_SENSOR_DATA: 'Invalid sensor data received from device',
  UPDATE_FAILED: 'Failed to update device',
  DELETE_FAILED: 'Failed to delete device',
  NO_DEVICES: 'No devices found',
} as const;

/**
 * Alert Errors
 */
export const ALERT_ERRORS = {
  NOT_FOUND: 'Alert not found',
  ALREADY_ACKNOWLEDGED: 'Alert has already been acknowledged',
  ALREADY_RESOLVED: 'Alert has already been resolved',
  CANNOT_RESOLVE_UNACKNOWLEDGED: 'Cannot resolve unacknowledged alert. Please acknowledge it first',
  INVALID_SEVERITY: 'Invalid alert severity level',
  INVALID_STATUS: 'Invalid alert status',
  COOLDOWN_ACTIVE: (minutes: number) => 
    `Alert cooldown period is active. Please wait ${minutes} minutes before creating a similar alert`,
  CREATION_FAILED: 'Failed to create alert',
  UPDATE_FAILED: 'Failed to update alert',
  DELETE_FAILED: 'Failed to delete alert',
  ACKNOWLEDGE_FAILED: 'Failed to acknowledge alert',
  RESOLVE_FAILED: 'Failed to resolve alert',
  NO_ALERTS: 'No alerts found',
} as const;

/**
 * Report Errors
 */
export const REPORT_ERRORS = {
  NOT_FOUND: 'Report not found',
  GENERATION_FAILED: 'Report generation failed. Please try again',
  GENERATION_IN_PROGRESS: 'Report generation is already in progress',
  INVALID_DATE_RANGE: 'Invalid date range for report',
  NO_DATA_AVAILABLE: 'No data available for the specified period',
  FILE_TOO_LARGE: 'Report file size exceeds maximum limit',
  DOWNLOAD_FAILED: 'Report download failed',
  DELETE_FAILED: 'Failed to delete report',
  INVALID_TYPE: 'Invalid report type',
} as const;

/**
 * User Management Errors
 */
export const USER_ERRORS = {
  NOT_FOUND: 'User not found',
  ALREADY_EXISTS: 'User already exists',
  INVALID_ROLE: 'Invalid user role',
  INVALID_STATUS: 'Invalid user status',
  CANNOT_CHANGE_OWN_ROLE: 'You cannot change your own role',
  CANNOT_SUSPEND_SELF: 'You cannot suspend your own account',
  UPDATE_FAILED: 'Failed to update user',
  ROLE_UPDATE_FAILED: 'Failed to update user role',
  STATUS_UPDATE_FAILED: 'Failed to update user status',
  PROFILE_INCOMPLETE: 'Please complete your profile',
  NO_USERS: 'No users found',
} as const;

/**
 * Sensor Reading Errors
 */
export const SENSOR_ERRORS = {
  INVALID_PARAMETER: 'Invalid sensor parameter',
  INVALID_VALUE: 'Invalid sensor value',
  OUT_OF_RANGE: (parameter: string) => `${parameter} value is out of acceptable range`,
  NO_DATA: 'No sensor data available',
  READING_FAILED: 'Failed to read sensor data',
  NO_READINGS: 'No sensor readings found',
} as const;

/**
 * Network & API Errors
 */
export const NETWORK_ERRORS = {
  NO_CONNECTION: 'No internet connection. Please check your network',
  TIMEOUT: 'Request timed out. Please try again',
  SERVER_ERROR: 'Server error. Please try again later',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later',
  BAD_REQUEST: 'Bad request. Please check your input',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again',
  CORS_ERROR: 'CORS error. Please contact support',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down and try again later',
} as const;

/**
 * File Operation Errors
 */
export const FILE_ERRORS = {
  TOO_LARGE: 'File size exceeds maximum limit',
  UPLOAD_FAILED: 'File upload failed',
  NOT_FOUND: 'File not found',
  INVALID_FORMAT: 'Invalid file format',
  DOWNLOAD_FAILED: 'File download failed',
} as const;

/**
 * Form Errors
 */
export const FORM_ERRORS = {
  SUBMISSION_FAILED: 'Form submission failed. Please try again',
  VALIDATION_FAILED: 'Please fix the errors in the form',
  REQUIRED_FIELDS: 'Please fill in all required fields',
  INVALID_INPUT: 'Please check your input and try again',
} as const;

/**
 * General Errors
 */
export const GENERAL_ERRORS = {
  INTERNAL_ERROR: 'An internal error occurred. Please try again',
  NOT_IMPLEMENTED: 'This feature is not yet available',
  FEATURE_DISABLED: 'This feature is currently disabled',
  MAINTENANCE_MODE: 'System is under maintenance. Please try again later',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again',
} as const;

/**
 * All error messages combined
 */
export const ERROR_MESSAGES = {
  AUTH: AUTH_ERRORS,
  VALIDATION: VALIDATION_ERRORS,
  RESOURCE: RESOURCE_ERRORS,
  DEVICE: DEVICE_ERRORS,
  ALERT: ALERT_ERRORS,
  REPORT: REPORT_ERRORS,
  USER: USER_ERRORS,
  SENSOR: SENSOR_ERRORS,
  NETWORK: NETWORK_ERRORS,
  FILE: FILE_ERRORS,
  FORM: FORM_ERRORS,
  GENERAL: GENERAL_ERRORS,
} as const;

/**
 * Get user-friendly error message from error object
 */
export const getErrorMessage = (error: unknown): string => {
  if (!error) return GENERAL_ERRORS.UNKNOWN_ERROR;
  
  if (typeof error === 'string') return error;
  
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('Network Error')) return NETWORK_ERRORS.NO_CONNECTION;
    if (error.message.includes('timeout')) return NETWORK_ERRORS.TIMEOUT;
    if (error.message.includes('401')) return AUTH_ERRORS.UNAUTHORIZED;
    if (error.message.includes('403')) return AUTH_ERRORS.FORBIDDEN;
    if (error.message.includes('404')) return NETWORK_ERRORS.SERVER_ERROR;
    if (error.message.includes('500')) return NETWORK_ERRORS.SERVER_ERROR;
    
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
  }
  
  return GENERAL_ERRORS.UNKNOWN_ERROR;
};
