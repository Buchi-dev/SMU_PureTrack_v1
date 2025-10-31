/**
 * Type Definitions - Authentication Module
 * Centralized type definitions for authentication and user management
 * 
 * @module types/auth.types
 */

import * as admin from "firebase-admin";

// ===========================
// USER ROLE & STATUS TYPES
// ===========================

/**
 * User account status in the system
 * - Pending: Account created, awaiting admin approval
 * - Approved: Account approved and fully active
 * - Suspended: Account temporarily disabled
 */
export type UserStatus = "Pending" | "Approved" | "Suspended";

/**
 * User role defining access level
 * - Staff: Regular user with limited permissions
 * - Admin: Administrator with full system access
 */
export type UserRole = "Staff" | "Admin";

// ===========================
// USER PROFILE TYPES
// ===========================

/**
 * Complete user profile stored in Firestore
 * Contains all user information and metadata
 */
export interface UserProfile {
  uuid: string;
  firstname: string;
  lastname: string;
  middlename: string;
  department: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: admin.firestore.FieldValue;
  updatedAt?: admin.firestore.FieldValue;
  lastLogin?: admin.firestore.FieldValue;
}

// ===========================
// AUTHENTICATION EVENT TYPES
// ===========================

/**
 * Parsed user information from authentication event
 * Extracted and normalized from Firebase Auth user object
 */
export interface ParsedUserInfo {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  firstname: string;
  lastname: string;
}

/**
 * Display name components
 * Result of parsing a full name
 */
export interface ParsedDisplayName {
  firstname: string;
  lastname: string;
}

// ===========================
// VALIDATION RESULT TYPES
// ===========================

/**
 * Domain validation result
 * Contains validation status and normalized data
 */
export interface DomainValidationResult {
  isValid: boolean;
  email: string;
  domain: string;
}

// ===========================
// LOGGING TYPES
// ===========================

/**
 * Result of a login attempt
 */
export type LoginResult = "success" | "rejected" | "error";

/**
 * Login attempt record for audit trail
 * Stores detailed information about each sign-in attempt
 */
export interface LoginLog {
  uid: string;
  email: string;
  displayName: string;
  statusAttempted: UserStatus;
  timestamp: admin.firestore.FieldValue;
  result: LoginResult;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Business log entry for tracking system actions
 * Records administrative and system-level events
 */
export interface BusinessLog {
  action: string;
  uid: string;
  email: string;
  performedBy: string;
  timestamp: admin.firestore.FieldValue;
  details: Record<string, unknown>;
}
