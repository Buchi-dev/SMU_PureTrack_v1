/**
 * User Management Service
 * 
 * Provides API functions for user management operations
 * Communicates with Firebase Callable Function: userManagement
 * 
 * @module services/userManagementService
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import type { UserStatus, UserRole } from '../contexts';
import { refreshUserToken } from '../utils/authHelpers';
import { db } from '../config/firebase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User data returned from list operation
 * Matches backend ListUserData type from functions/src_new/types/User.Types.ts
 */
export interface UserListData {
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
  createdAt: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

/**
 * Request for updating user status
 */
export interface UpdateUserStatusRequest {
  userId: string;
  status: UserStatus;
}

/**
 * Request for updating user
 */
export interface UpdateUserRequest {
  userId: string;
  status?: UserStatus;
  role?: UserRole;
}

/**
 * Response for update status operation
 */
export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  userId: string;
  status: UserStatus;
}

/**
 * Response for update user operation
 */
export interface UpdateUserResponse {
  success: boolean;
  message: string;
  userId: string;
  updates: {
    status?: UserStatus;
    role?: UserRole;
  };
}

/**
 * Response for list users operation
 */
export interface ListUsersResponse {
  success: boolean;
  users: UserListData[];
  count: number;
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
// USER MANAGEMENT SERVICE
// ============================================================================

/**
 * User Management Service Class
 * Provides methods to interact with the userManagement Firebase Function
 */
export class UserManagementService {
  private functions;
  private functionName = 'UserCalls'; // Updated to match backend function name

  constructor() {
    this.functions = getFunctions();
  }

  /**
   * Subscribe to users (Real-time READ)
   * 
   * Sets up a real-time listener for user changes.
   * Follows Architecture Rule R1: Use real-time listeners (onSnapshot).
   * 
   * @param {Function} onUpdate - Callback when users data changes
   * @param {Function} onError - Callback when an error occurs
   * 
   * @returns {Unsubscribe} Function to call to unsubscribe
   * 
   * @example
   * const unsubscribe = service.subscribeToUsers(
   *   (users) => setUsers(users),
   *   (error) => console.error(error)
   * );
   * 
   * // Cleanup on unmount
   * return () => unsubscribe();
   */
  subscribeToUsers(
    onUpdate: (users: UserListData[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      usersQuery,
      (snapshot) => {
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
        onUpdate(users);
      },
      (error) => {
        console.error('Error subscribing to users:', error);
        onError(new Error(error.message || 'Failed to subscribe to users'));
      }
    );
  }

  /**
   * List all users (One-time READ - Use subscribeToUsers for real-time)
   * 
   * Retrieves all users from the system, ordered by creation date.
   * Requires admin authentication.
   * 
   * ⚠️ DEPRECATION NOTE: This is a one-time fetch. For real-time updates,
   * use subscribeToUsers() instead, which follows Architecture Rule R1.
   * 
   * @returns {Promise<ListUsersResponse>} List of users with count
   * 
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * // ❌ Old pattern (manual polling)
   * const result = await service.listUsers();
   * 
   * // ✅ New pattern (real-time)
   * const unsubscribe = service.subscribeToUsers(
   *   (users) => setUsers(users),
   *   (error) => console.error(error)
   * );
   */
  async listUsers(): Promise<ListUsersResponse> {
    const callable = httpsCallable<{ action: string }, ListUsersResponse>(
      this.functions,
      this.functionName
    );

    try {
      const result = await callable({ action: 'listUsers' });

      // Convert ISO string dates back to Date objects
      const users = result.data.users.map((user) => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
      }));

      return {
        ...result.data,
        users,
      };
    } catch (error: any) {
      // If permission denied, try refreshing token and retry once
      if (error.code === 'functions/permission-denied') {
        try {
          await refreshUserToken();
          const retryResult = await callable({ action: 'listUsers' });
          
          const users = retryResult.data.users.map((user) => ({
            ...user,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
          }));

          return {
            ...retryResult.data,
            users,
          };
        } catch (retryError: any) {
          throw this.handleError(retryError, 'Failed to list users');
        }
      }
      throw this.handleError(error, 'Failed to list users');
    }
  }

  /**
   * Update user status
   * 
   * Updates the status of a user (Pending, Approved, Suspended).
   * Requires admin authentication.
   * 
   * @param {string} userId - The ID of the user to update
   * @param {UserStatus} status - The new status
   * 
   * @returns {Promise<UpdateStatusResponse>} Success message and updated data
   * 
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * @throws {ErrorResponse} If the user is not found
   * @throws {ErrorResponse} If trying to suspend yourself
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new UserManagementService();
   * try {
   *   const result = await service.updateUserStatus('user123', 'Approved');
   *   console.log(result.message);
   * } catch (error) {
   *   console.error('Failed to update status:', error);
   * }
   */
  async updateUserStatus(
    userId: string,
    status: UserStatus
  ): Promise<UpdateStatusResponse> {
    try {
      const callable = httpsCallable<
        { action: string; userId: string; status: UserStatus },
        UpdateStatusResponse
      >(this.functions, this.functionName);

      const result = await callable({
        action: 'updateStatus',
        userId,
        status,
      });

      return result.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update user status');
    }
  }

  /**
   * Update user
   * 
   * Updates a user's status and/or role.
   * At least one of status or role must be provided.
   * Requires admin authentication.
   * 
   * @param {string} userId - The ID of the user to update
   * @param {UserStatus} [status] - The new status (optional)
   * @param {UserRole} [role] - The new role (optional)
   * 
   * @returns {Promise<UpdateUserResponse>} Success message and updated data
   * 
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * @throws {ErrorResponse} If the user is not found
   * @throws {ErrorResponse} If trying to suspend yourself
   * @throws {ErrorResponse} If trying to change your own role to Staff
   * @throws {ErrorResponse} If neither status nor role is provided
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new UserManagementService();
   * 
   * // Update only status
   * await service.updateUser('user123', 'Approved');
   * 
   * // Update only role
   * await service.updateUser('user123', undefined, 'Admin');
   * 
   * // Update both
   * await service.updateUser('user123', 'Approved', 'Admin');
   */
  async updateUser(
    userId: string,
    status?: UserStatus,
    role?: UserRole
  ): Promise<UpdateUserResponse> {
    try {
      const callable = httpsCallable<
        {
          action: string;
          userId: string;
          status?: UserStatus;
          role?: UserRole;
        },
        UpdateUserResponse
      >(this.functions, this.functionName);

      const result = await callable({
        action: 'updateUser',
        userId,
        status,
        role,
      });

      return result.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to update user');
    }
  }

  /**
   * Approve user
   * 
   * Convenience method to approve a pending user.
   * Shorthand for updateUserStatus(userId, 'Approved').
   * 
   * @param {string} userId - The ID of the user to approve
   * 
   * @returns {Promise<UpdateStatusResponse>} Success message and updated data
   * 
   * @example
   * const service = new UserManagementService();
   * await service.approveUser('user123');
   */
  async approveUser(userId: string): Promise<UpdateStatusResponse> {
    return this.updateUserStatus(userId, 'Approved');
  }

  /**
   * Suspend user
   * 
   * Convenience method to suspend a user.
   * Shorthand for updateUserStatus(userId, 'Suspended').
   * 
   * @param {string} userId - The ID of the user to suspend
   * 
   * @returns {Promise<UpdateStatusResponse>} Success message and updated data
   * 
   * @example
   * const service = new UserManagementService();
   * await service.suspendUser('user123');
   */
  async suspendUser(userId: string): Promise<UpdateStatusResponse> {
    return this.updateUserStatus(userId, 'Suspended');
  }

  /**
   * Reactivate user
   * 
   * Convenience method to reactivate a suspended user.
   * Shorthand for updateUserStatus(userId, 'Approved').
   * 
   * @param {string} userId - The ID of the user to reactivate
   * 
   * @returns {Promise<UpdateStatusResponse>} Success message and updated data
   * 
   * @example
   * const service = new UserManagementService();
   * await service.reactivateUser('user123');
   */
  async reactivateUser(userId: string): Promise<UpdateStatusResponse> {
    return this.updateUserStatus(userId, 'Approved');
  }

  /**
   * Promote user to admin
   * 
   * Convenience method to promote a user to Admin role.
   * Shorthand for updateUser(userId, undefined, 'Admin').
   * 
   * @param {string} userId - The ID of the user to promote
   * 
   * @returns {Promise<UpdateUserResponse>} Success message and updated data
   * 
   * @example
   * const service = new UserManagementService();
   * await service.promoteToAdmin('user123');
   */
  async promoteToAdmin(userId: string): Promise<UpdateUserResponse> {
    return this.updateUser(userId, undefined, 'Admin');
  }

  /**
   * Demote user to staff
   * 
   * Convenience method to demote a user to Staff role.
   * Shorthand for updateUser(userId, undefined, 'Staff').
   * 
   * @param {string} userId - The ID of the user to demote
   * 
   * @returns {Promise<UpdateUserResponse>} Success message and updated data
   * 
   * @example
   * const service = new UserManagementService();
   * await service.demoteToStaff('user123');
   */
  async demoteToStaff(userId: string): Promise<UpdateUserResponse> {
    return this.updateUser(userId, undefined, 'Staff');
  }

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
    // Extract error details from Firebase Functions error
    const code = error.code || 'unknown';
    const message = error.message || defaultMessage;
    const details = error.details || undefined;

    // Map Firebase error codes to user-friendly messages
    const errorMessages: { [key: string]: string } = {
      'functions/unauthenticated': 'Please log in to perform this action',
      'functions/permission-denied':
        'You do not have permission to perform this action',
      'functions/not-found': 'User not found',
      'functions/invalid-argument': 'Invalid request parameters',
      'functions/failed-precondition': message, // Use original message
      'functions/internal': 'An internal error occurred. Please try again',
      'functions/unavailable': 'Service temporarily unavailable',
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
 * Singleton instance of UserManagementService
 * 
 * @example
 * import { userManagementService } from './services/userManagement.Service';
 * 
 * // List users
 * const users = await userManagementService.listUsers();
 * 
 * // Update user status
 * await userManagementService.approveUser('user123');
 * 
 * // Update user role
 * await userManagementService.promoteToAdmin('user123');
 */
export const userManagementService = new UserManagementService();

/**
 * Default export for convenience
 */
export default userManagementService;
