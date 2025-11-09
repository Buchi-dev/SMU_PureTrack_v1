/**
 * Users Service
 * 
 * Manages user accounts, roles, permissions, and notification preferences.
 * 
 * Write Operations: Cloud Functions (UserCalls)
 * Read Operations: Firestore real-time listeners
 * 
 * Features:
 * - User CRUD operations
 * - Role and status management
 * - Notification preferences
 * - Real-time user list subscriptions
 * 
 * @module services/users
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import type { UserStatus, UserRole, UserListData } from '../schemas';
import { refreshUserToken } from '../utils/authHelpers';
import { db } from '../config/firebase';
import { dataFlowLogger, DataSource, FlowLayer } from '../utils/dataFlowLogger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UpdateUserStatusRequest {
  userId: string;
  status: UserStatus;
}

export interface UpdateUserRequest {
  userId: string;
  status?: UserStatus;
  role?: UserRole;
}

export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  userId: string;
  status: UserStatus;
}

export interface UpdateUserResponse {
  success: boolean;
  message: string;
  userId: string;
  updates: {
    status?: UserStatus;
    role?: UserRole;
  };
}

export interface ListUsersResponse {
  success: boolean;
  users: UserListData[];
  count: number;
}

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

export interface SetupPreferencesRequest extends PreferencesData {
  action: 'setupPreferences';
}

export interface GetUserPreferencesRequest {
  action: 'getUserPreferences';
  userId: string;
}

export interface ListAllPreferencesRequest {
  action: 'listAllPreferences';
}

export interface DeletePreferencesRequest {
  action: 'deletePreferences';
  userId: string;
}

export interface PreferencesResponse {
  success: boolean;
  message?: string;
  data?: NotificationPreferences;
  error?: string;
}

export interface ListPreferencesResponse {
  success: boolean;
  data?: NotificationPreferences[];
  error?: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class UsersService {
  // ==========================================================================
  // PROPERTIES
  // ==========================================================================
  
  private readonly functions = getFunctions();
  private readonly functionName = 'UserCalls';

  // ==========================================================================
  // ERROR MESSAGES
  // ==========================================================================
  
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    'functions/unauthenticated': 'Please log in to perform this action',
    'functions/permission-denied': 'You do not have permission to perform this action',
    'functions/not-found': 'User not found',
    'functions/invalid-argument': 'Invalid request parameters',
    'functions/failed-precondition': '', // Use backend message
    'functions/internal': 'An internal error occurred. Please try again',
    'functions/unavailable': 'Service temporarily unavailable',
    'functions/deadline-exceeded': 'Request timeout. Please try again',
  };

  // ==========================================================================
  // READ OPERATIONS (Firestore Subscriptions)
  // ==========================================================================

  /**
   * Subscribe to real-time user list updates
   * 
   * Implements defensive caching to prevent:
   * - Null snapshot propagation
   * - Empty state regression during active sessions
   * - UI flicker from Firestore listener stalls
   * 
   * @param onUpdate - Callback invoked with updated user list
   * @param onError - Callback invoked on subscription errors
   * @returns Unsubscribe function
   */
  subscribeToUsers(
    onUpdate: (users: UserListData[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    // Cache to prevent propagating invalid snapshots
    let lastValidSnapshot: UserListData[] | null = null;
    let isFirstSnapshot = true;

    return onSnapshot(
      usersQuery,
      (snapshot) => {
        // DEFENSIVE: Validate snapshot before propagating to UI
        if (!snapshot) {
          dataFlowLogger.logValidationIssue(
            DataSource.FIRESTORE,
            FlowLayer.SERVICE,
            'Received null snapshot',
            null
          );
          console.warn('[UsersService] Received null snapshot, maintaining cached state');
          return;
        }

        // Parse users from snapshot
        const users = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            uuid: data.uuid || '',
            firstname: data.firstname || '',
            lastname: data.lastname || '',
            middlename: data.middlename || '',
            department: data.department || '',
            phoneNumber: data.phoneNumber || '',
            email: data.email || '',
            role: data.role as UserRole,
            status: data.status as UserStatus,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
            lastLogin: data.lastLogin?.toDate(),
          } as UserListData;
        });

        dataFlowLogger.log(
          DataSource.FIRESTORE,
          FlowLayer.SERVICE,
          'User snapshot received',
          { userCount: users.length, isFirstSnapshot }
        );

        // DEFENSIVE: Prevent empty state regression during active session
        if (!isFirstSnapshot && users.length === 0 && lastValidSnapshot && lastValidSnapshot.length > 0) {
          dataFlowLogger.logStateRejection(
            DataSource.FIRESTORE,
            FlowLayer.SERVICE,
            'Empty snapshot during active session - likely Firestore listener stall',
            users,
            lastValidSnapshot
          );
          console.warn('[UsersService] Rejecting empty snapshot - likely Firestore listener stall');
          console.warn('[UsersService] Maintaining cached state with', lastValidSnapshot.length, 'users');
          return;
        }

        // Valid data - cache and propagate
        lastValidSnapshot = users;
        isFirstSnapshot = false;
        
        dataFlowLogger.log(
          DataSource.FIRESTORE,
          FlowLayer.SERVICE,
          'Propagating valid user data',
          { userCount: users.length }
        );
        
        onUpdate(users);
      },
      (error) => {
        dataFlowLogger.log(
          DataSource.FIRESTORE,
          FlowLayer.SERVICE,
          'Snapshot error',
          { error: error.message }
        );
        console.error('[UsersService] Snapshot error:', error);
        onError(new Error(error.message || 'Failed to subscribe to users'));
      }
    );
  }

  // ==========================================================================
  // WRITE OPERATIONS (Cloud Functions)
  // ==========================================================================

  /**
   * Generic Cloud Function caller with type safety
   * 
   * @template T - Request payload type
   * @template R - Response type
   * @param action - Cloud Function action name
   * @param data - Request data (without action field)
   * @returns Typed response data
   * @throws {ErrorResponse} Transformed error with user-friendly message
   */
  private async callFunction<T, R = any>(
    action: string,
    data?: Omit<T, 'action'>
  ): Promise<R> {
    try {
      const callable = httpsCallable<T, R>(this.functions, this.functionName);
      const payload = data ? { action, ...data } : { action };
      const result = await callable(payload as T);
      
      return result.data;
    } catch (error: any) {
      // If permission denied, try refreshing token and retry once
      if (error.code === 'functions/permission-denied') {
        try {
          await refreshUserToken();
          const callable = httpsCallable<T, R>(this.functions, this.functionName);
          const payload = data ? { action, ...data } : { action };
          const retryResult = await callable(payload as T);
          return retryResult.data;
        } catch (retryError: any) {
          throw this.handleError(retryError, `Failed to ${action}`);
        }
      }
      throw this.handleError(error, `Failed to ${action}`);
    }
  }

  /**
   * List all users
   * 
   * @returns Promise with user list and count
   * @throws {ErrorResponse} If list operation fails
   */
  async listUsers(): Promise<ListUsersResponse> {
    const result = await this.callFunction<{ action: string }, ListUsersResponse>('listUsers');

    // Convert ISO string dates back to Date objects
    const users = result.users.map((user) => ({
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
      lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
    }));

    return {
      ...result,
      users,
    };
  }

  async updateUserStatus(
    userId: string,
    status: UserStatus
  ): Promise<UpdateStatusResponse> {
    return this.callFunction<
      { action: string; userId: string; status: UserStatus },
      UpdateStatusResponse
    >('updateStatus', { userId, status });
  }

  async updateUser(
    userId: string,
    status?: UserStatus,
    role?: UserRole
  ): Promise<UpdateUserResponse> {
    return this.callFunction<
      { action: string; userId: string; status?: UserStatus; role?: UserRole },
      UpdateUserResponse
    >('updateUser', { userId, status, role });
  }

  async approveUser(userId: string): Promise<UpdateStatusResponse> {
    return this.updateUserStatus(userId, 'Approved');
  }

  async suspendUser(userId: string): Promise<UpdateStatusResponse> {
    return this.updateUserStatus(userId, 'Suspended');
  }

  async reactivateUser(userId: string): Promise<UpdateStatusResponse> {
    return this.updateUserStatus(userId, 'Approved');
  }

  async promoteToAdmin(userId: string): Promise<UpdateUserResponse> {
    return this.updateUser(userId, undefined, 'Admin');
  }

  async demoteToStaff(userId: string): Promise<UpdateUserResponse> {
    return this.updateUser(userId, undefined, 'Staff');
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    const result = await this.callFunction<
      GetUserPreferencesRequest,
      PreferencesResponse
    >('getUserPreferences', { userId });

    if (!result.success) {
      throw new Error(result.error || 'Failed to get user preferences');
    }

    return result.data || null;
  }

  async listAllPreferences(): Promise<NotificationPreferences[]> {
    const result = await this.callFunction<
      ListAllPreferencesRequest,
      ListPreferencesResponse
    >('listAllPreferences');

    if (!result.success) {
      throw new Error(result.error || 'Failed to list all preferences');
    }

    return result.data || [];
  }

  async setupPreferences(
    preferencesData: PreferencesData
  ): Promise<NotificationPreferences> {
    const result = await this.callFunction<
      SetupPreferencesRequest,
      PreferencesResponse
    >('setupPreferences', preferencesData);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to setup notification preferences');
    }

    return result.data;
  }

  async deletePreferences(userId: string): Promise<void> {
    const result = await this.callFunction<
      DeletePreferencesRequest,
      PreferencesResponse
    >('deletePreferences', { userId });

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete notification preferences');
    }
  }

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

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  /**
   * Transform errors into user-friendly messages
   * 
   * @param error - Raw error from Firebase or application
   * @param defaultMessage - Fallback message if error unmapped
   * @returns Standardized error response
   */
  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('[UsersService] Error:', error);

    // Extract error details from Firebase Functions error
    const code = error.code || 'unknown';
    const message = error.message || defaultMessage;
    const details = error.details || undefined;

    const friendlyMessage = code === 'functions/failed-precondition'
      ? message 
      : UsersService.ERROR_MESSAGES[code] || message;

    return {
      code,
      message: friendlyMessage,
      details,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const usersService = new UsersService();
export default usersService;
