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
