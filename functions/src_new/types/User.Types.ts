/**
 * User Management Type Definitions
 * Type definitions specific to user management operations
 *
 * @module types/userManagement.types
 */

import type {UserStatus, UserRole} from "../constants/User.Constants";

// ===========================
// REQUEST TYPES
// ===========================

/**
 * Request payload for updating user status
 */
export interface UpdateUserStatusRequest {
  userId: string;
  status: UserStatus;
}

/**
 * Request payload for updating user information
 * Can update status and/or role
 */
export interface UpdateUserRequest {
  userId: string;
  status?: UserStatus;
  role?: UserRole;
}

// ===========================
// RESPONSE TYPES
// ===========================

/**
 * Standard success response for user operations
 */
export interface UserOperationResponse {
  success: boolean;
  message: string;
  userId: string;
}

/**
 * Response for status update operation
 */
export interface UpdateStatusResponse extends UserOperationResponse {
  status: UserStatus;
}

/**
 * Response for user update operation
 */
export interface UpdateUserResponse extends UserOperationResponse {
  updates: {
    status?: UserStatus;
    role?: UserRole;
  };
}

/**
 * User data returned from list operation
 */
export interface ListUserData {
  id: string;
  uuid: string;
  firstname: string;
  lastname: string;
  middlename: string;
  department: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

/**
 * Response for list users operation
 */
export interface ListUsersResponse {
  success: boolean;
  users: ListUserData[];
  count: number;
}

/**
 * Notification Preferences Types
 * Type definitions for notification preference operations
 *
 * @module types/notificationPreferences.types
 */

// ===========================
// NOTIFICATION PREFERENCES TYPES
// ===========================

/**
 * Notification Preferences Document
 */
export interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  sendScheduledAlerts: boolean; // NEW: Enable/disable scheduled analytics reports
  alertSeverities: string[];
  parameters: string[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

// ===========================
// REQUEST TYPES
// ===========================

/**
 * Request to get user preferences
 */
export interface GetUserPreferencesRequest {
  action: "getUserPreferences";
  userId: string;
}

/**
 * Request to list all preferences (admin only)
 */
export interface ListAllPreferencesRequest {
  action: "listAllPreferences";
}

/**
 * Request to setup/update preferences
 */
export interface SetupPreferencesRequest {
  action: "setupPreferences";
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  sendScheduledAlerts: boolean; // NEW: Enable/disable scheduled analytics
  alertSeverities: string[];
  parameters: string[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

/**
 * Request to delete preferences
 */
export interface DeletePreferencesRequest {
  action: "deletePreferences";
  userId: string;
}

// ===========================
// RESPONSE TYPES
// ===========================

/**
 * Response for single preference operations
 */
export interface PreferencesResponse {
  success: boolean;
  message?: string;
  data?: NotificationPreferences | null;
  error?: string;
}

/**
 * Response for list preferences operation
 */
export interface ListPreferencesResponse {
  success: boolean;
  message?: string;
  data?: NotificationPreferences[];
  error?: string;
}