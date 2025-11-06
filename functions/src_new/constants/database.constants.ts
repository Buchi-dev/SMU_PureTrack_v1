/**
 * Database Constants
 * Firestore collection names and database-related constants
 *
 * @module constants/Database.Constants
 */

// ===========================
// FIRESTORE COLLECTION NAMES
// ===========================

/**
 * Primary Firestore collection names
 * Use these constants instead of hardcoded strings
 */
export const COLLECTIONS = {
  USERS: "users",
  LOGIN_LOGS: "login_logs",
  BUSINESS_LOGS: "business_logs",
  ALERTS: "alerts",
  NOTIFICATION_PREFERENCES: "notification_preferences",
  DEVICES: "devices",
  SENSOR_READINGS: "sensor_readings",
} as const;

// ===========================
// FIRESTORE FIELD NAMES
// ===========================

/**
 * Common Firestore field names
 * Use these constants to avoid hardcoded field name strings
 */
export const FIELD_NAMES = {
  // Timestamp fields
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  LAST_LOGIN: "lastLogin",
  TIMESTAMP: "timestamp",

  // User fields
  STATUS: "status",
  ROLE: "role",
  UPDATED_BY: "updatedBy",
  NOTIFICATION_PREFERENCES: "notificationPreferences",

  // Common fields
  EMAIL: "email",
  UID: "uid",
  DISPLAY_NAME: "displayName",
} as const;

// ===========================
// QUERY ORDERING
// ===========================

/**
 * Common query ordering configurations
 * Standardizes sort orders across the application
 */
export const SORT_ORDERS = {
  CREATED_AT_DESC: {
    field: "createdAt",
    direction: "desc" as const,
  },
  CREATED_AT_ASC: {
    field: "createdAt",
    direction: "asc" as const,
  },
  UPDATED_AT_DESC: {
    field: "updatedAt",
    direction: "desc" as const,
  },
  TIMESTAMP_DESC: {
    field: "timestamp",
    direction: "desc" as const,
  },
} as const;
