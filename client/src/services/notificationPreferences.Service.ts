/**
 * Notification Preferences Service
 * 
 * Provides API functions for managing user notification preferences
 * Communicates with Firebase Callable Function: notificationPreferences
 * 
 * @module services/notificationPreferencesService
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  sendScheduledAlerts: boolean;
  alertSeverities: string[];
  parameters: string[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Preferences data for setup/update operations
 */
export interface PreferencesData {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  sendScheduledAlerts: boolean;
  alertSeverities: string[];
  parameters: string[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

/**
 * Request for setting up notification preferences
 */
export interface SetupPreferencesRequest extends PreferencesData {
  action: 'setupPreferences';
}

/**
 * Request for getting user preferences
 */
export interface GetUserPreferencesRequest {
  action: 'getUserPreferences';
  userId: string;
}

/**
 * Request for listing all preferences
 */
export interface ListAllPreferencesRequest {
  action: 'listAllPreferences';
}

/**
 * Request for deleting preferences
 */
export interface DeletePreferencesRequest {
  action: 'deletePreferences';
  userId: string;
}

/**
 * Response for notification preferences operations
 */
export interface PreferencesResponse {
  success: boolean;
  message?: string;
  data?: NotificationPreferences;
  error?: string;
}

/**
 * Response for listing preferences
 */
export interface ListPreferencesResponse {
  success: boolean;
  data?: NotificationPreferences[];
  error?: string;
}

/**
 * Generic error response
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// NOTIFICATION PREFERENCES SERVICE
// ============================================================================

/**
 * Notification Preferences Service Class
 * Provides methods to interact with notificationPreferences Firebase Callable Function
 */
export class NotificationPreferencesService {
  private functions;
  private functionName = 'notificationPreferences';

  constructor() {
    this.functions = getFunctions();
  }

  /**
   * Get notification preferences for current user
   * 
   * Retrieves the notification preferences for a specific user.
   * Requires authentication.
   * 
   * @param {string} userId - The user ID to get preferences for
   * 
   * @returns {Promise<NotificationPreferences | null>} User's preferences or null if not set
   * 
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new NotificationPreferencesService();
   * try {
   *   const prefs = await service.getUserPreferences('user123');
   *   if (prefs) {
   *     console.log('Email notifications:', prefs.emailNotifications);
   *   } else {
   *     console.log('No preferences set yet');
   *   }
   * } catch (error) {
   *   console.error('Failed to load preferences:', error);
   * }
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const callable = httpsCallable<GetUserPreferencesRequest, PreferencesResponse>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        action: 'getUserPreferences',
        userId,
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to get user preferences');
      }

      return result.data.data || null;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to get user preferences');
    }
  }

  /**
   * List all notification preferences (admin only)
   * 
   * Retrieves notification preferences for all users.
   * Requires admin authentication.
   * 
   * @returns {Promise<NotificationPreferences[]>} Array of all user preferences
   * 
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new NotificationPreferencesService();
   * const allPrefs = await service.listAllPreferences();
   * console.log(`Total users with preferences: ${allPrefs.length}`);
   */
  async listAllPreferences(): Promise<NotificationPreferences[]> {
    try {
      const callable = httpsCallable<ListAllPreferencesRequest, ListPreferencesResponse>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        action: 'listAllPreferences',
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to list all preferences');
      }

      return result.data.data || [];
    } catch (error: any) {
      throw this.handleError(error, 'Failed to list all preferences');
    }
  }

  /**
   * Setup or update notification preferences
   * 
   * Creates or updates notification preferences for a user.
   * Requires authentication.
   * 
   * @param {PreferencesData} preferencesData - Notification preferences configuration
   * 
   * @returns {Promise<NotificationPreferences>} Updated preferences
   * 
   * @throws {ErrorResponse} If validation fails
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new NotificationPreferencesService();
   * try {
   *   const prefs = await service.setupPreferences({
   *     userId: 'user123',
   *     email: 'user@example.com',
   *     emailNotifications: true,
   *     pushNotifications: false,
   *     alertSeverities: ['Critical', 'Warning'],
   *     parameters: ['ph', 'tds'],
   *     devices: ['device_001'],
   *     quietHoursEnabled: true,
   *     quietHoursStart: '22:00',
   *     quietHoursEnd: '07:00'
   *   });
   *   console.log('Preferences saved successfully');
   * } catch (error) {
   *   console.error('Failed to save preferences:', error);
   * }
   */
  async setupPreferences(
    preferencesData: PreferencesData
  ): Promise<NotificationPreferences> {
    try {
      const callable = httpsCallable<SetupPreferencesRequest, PreferencesResponse>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        action: 'setupPreferences',
        ...preferencesData,
      });

      if (!result.data.success || !result.data.data) {
        throw new Error(
          result.data.error || 'Failed to setup notification preferences'
        );
      }

      return result.data.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to setup notification preferences');
    }
  }

  /**
   * Delete notification preferences
   * 
   * Removes notification preferences for a user.
   * Requires authentication.
   * 
   * @param {string} userId - The user ID to delete preferences for
   * 
   * @returns {Promise<void>}
   * 
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new NotificationPreferencesService();
   * await service.deletePreferences('user123');
   * console.log('Preferences deleted successfully');
   */
  async deletePreferences(userId: string): Promise<void> {
    try {
      const callable = httpsCallable<DeletePreferencesRequest, PreferencesResponse>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        action: 'deletePreferences',
        userId,
      });

      if (!result.data.success) {
        throw new Error(
          result.data.error || 'Failed to delete notification preferences'
        );
      }
    } catch (error: any) {
      throw this.handleError(error, 'Failed to delete notification preferences');
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Enable email notifications
   * 
   * Convenience method to enable email notifications for a user.
   * 
   * @param {string} userId - The user ID
   * @param {string} email - The user's email
   * 
   * @returns {Promise<NotificationPreferences>}
   * 
   * @example
   * await service.enableEmailNotifications('user123', 'user@example.com');
   */
  async enableEmailNotifications(
    userId: string,
    email: string
  ): Promise<NotificationPreferences> {
    const currentPrefs = await this.getUserPreferences(userId);
    
    return this.setupPreferences({
      userId,
      email,
      emailNotifications: true,
      pushNotifications: currentPrefs?.pushNotifications || false,
      sendScheduledAlerts: currentPrefs?.sendScheduledAlerts ?? true,
      alertSeverities: currentPrefs?.alertSeverities || ["Critical", "Warning", "Advisory"],
      parameters: currentPrefs?.parameters || [],
      devices: currentPrefs?.devices || [],
      quietHoursEnabled: currentPrefs?.quietHoursEnabled || false,
      quietHoursStart: currentPrefs?.quietHoursStart,
      quietHoursEnd: currentPrefs?.quietHoursEnd,
    });
  }

  /**
   * Disable email notifications
   * 
   * Convenience method to disable email notifications for a user.
   * 
   * @param {string} userId - The user ID
   * @param {string} email - The user's email
   * 
   * @returns {Promise<NotificationPreferences>}
   * 
   * @example
   * await service.disableEmailNotifications('user123', 'user@example.com');
   */
  async disableEmailNotifications(
    userId: string,
    email: string
  ): Promise<NotificationPreferences> {
    const currentPrefs = await this.getUserPreferences(userId);
    
    return this.setupPreferences({
      userId,
      email,
      emailNotifications: false,
      pushNotifications: currentPrefs?.pushNotifications || false,
      sendScheduledAlerts: currentPrefs?.sendScheduledAlerts ?? true,
      alertSeverities: currentPrefs?.alertSeverities || ["Critical", "Warning", "Advisory"],
      parameters: currentPrefs?.parameters || [],
      devices: currentPrefs?.devices || [],
      quietHoursEnabled: currentPrefs?.quietHoursEnabled || false,
      quietHoursStart: currentPrefs?.quietHoursStart,
      quietHoursEnd: currentPrefs?.quietHoursEnd,
    });
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Handle errors from Firebase Functions
   * 
   * Transforms Firebase Function errors into a consistent ErrorResponse format.
   * 
   * @private
   * @param {any} error - The error from Firebase Functions
   * @param {string} defaultMessage - Default message if error doesn't have one
   * 
   * @returns {ErrorResponse} Formatted error response
   */
  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('NotificationPreferencesService error:', error);

    // Extract error details from Firebase Functions error
    const code = error.code || 'unknown';
    const message = error.message || defaultMessage;
    const details = error.details || undefined;

    // Map Firebase error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'functions/unauthenticated': 'Please log in to manage notification preferences',
      'functions/permission-denied': 'You do not have permission to manage notification preferences',
      'functions/not-found': 'Notification preferences not found',
      'functions/invalid-argument': 'Invalid request parameters',
      'functions/failed-precondition': message, // Use original message for business logic errors
      'functions/internal': 'An internal error occurred. Please try again',
      'functions/unavailable': 'Notification service temporarily unavailable. Please try again',
      'functions/deadline-exceeded': 'Request timeout. Please try again',
    };

    const friendlyMessage = errorMessages[code] || message;

    return {
      code,
      message: friendlyMessage,
      details,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE EXPORT
// ============================================================================

/**
 * Singleton instance of NotificationPreferencesService
 * Use this exported instance in your application
 * 
 * @example
 * import { notificationPreferencesService } from './services/notificationPreferences.Service';
 * 
 * // Get user preferences
 * const prefs = await notificationPreferencesService.getUserPreferences('user123');
 * 
 * // Setup preferences
 * await notificationPreferencesService.setupPreferences({
 *   userId: 'user123',
 *   email: 'user@example.com',
 *   emailNotifications: true,
 *   alertSeverities: ['Critical']
 * });
 * 
 * // Enable email notifications (convenience method)
 * await notificationPreferencesService.enableEmailNotifications('user123', 'user@example.com');
 */
export const notificationPreferencesService = new NotificationPreferencesService();

/**
 * Default export for convenience
 */
export default notificationPreferencesService;
