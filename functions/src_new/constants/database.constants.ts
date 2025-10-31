/**
 * Database Constants
 * Firestore collection names and database-related constants
 * 
 * @module constants/database.constants
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
} as const;

/**
 * Type-safe collection names
 */
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
