/**
 * useCall_Users - Write Hook
 * 
 * Handles user write operations (update status, update role).
 * Wraps usersService functions with React-friendly state management.
 * 
 * ⚠️ WRITE ONLY - Does not handle real-time subscriptions
 * 
 * @module hooks/writes
 */

import { useMutation } from './useMutation';
import { usersService } from '../../services/user.Service';
import type { UserRole, UserStatus } from '../../schemas';
import type { NotificationPreferences, PreferencesData } from '../../services/user.Service';

/**
 * Update user response
 */
interface UpdateUserResult {
  success: boolean;
  message: string;
  userId: string;
  updates: {
    status?: UserStatus;
    role?: UserRole;
  };
}

/**
 * Hook return value
 */
interface UseCallUsersReturn {
  /** Update user status only */
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  /** Update user status and/or role */
  updateUser: (userId: string, status?: UserStatus, role?: UserRole) => Promise<UpdateUserResult>;
  /** Get user notification preferences */
  getUserPreferences: (userId: string) => Promise<NotificationPreferences | null>;
  /** Setup/update user notification preferences */
  setupPreferences: (preferences: PreferencesData) => Promise<NotificationPreferences>;
  /** Loading state for any operation */
  isLoading: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Success flag - true after successful operation */
  isSuccess: boolean;
  /** Result from last update operation */
  updateResult: UpdateUserResult | null;
  /** Reset error, success states, and update result */
  reset: () => void;
}

/**
 * Hook for user write operations
 * 
 * Provides functions to update user status, roles, and notification preferences
 * with proper loading/error/success state management.
 * 
 * @example
 * ```tsx
 * const { 
 *   updateUserStatus, 
 *   updateUser,
 *   getUserPreferences,
 *   setupPreferences,
 *   isLoading, 
 *   error, 
 *   isSuccess,
 *   updateResult
 * } = useCall_Users();
 * 
 * // Update user status only
 * await updateUserStatus('user-123', 'Approved');
 * 
 * // Update user status and role
 * const result = await updateUser('user-123', 'Approved', 'Staff');
 * 
 * // Get user notification preferences
 * const prefs = await getUserPreferences('user-123');
 * 
 * // Setup notification preferences
 * await setupPreferences({
 *   userId: 'user-123',
 *   email: 'user@example.com',
 *   emailNotifications: true,
 *   alertSeverities: ['Critical', 'Warning']
 * });
 * 
 * if (isSuccess) {
 *   message.success('User updated successfully');
 * }
 * ```
 * 
 * @returns User operation functions and state
 */
export const useCall_Users = (): UseCallUsersReturn => {
  const updateStatusMutation = useMutation<void, Error, { userId: string; status: UserStatus }>({
    mutationFn: async ({ userId, status }) => {
      await usersService.updateUserStatus(userId, status);
    },
    invalidateQueries: [['users', 'realtime']], // Auto-refresh users list
    onError: (error) => {
      console.error('[useCall_Users] Update status error:', error);
    },
  });

  const updateUserMutation = useMutation<UpdateUserResult, Error, { userId: string; status?: UserStatus; role?: UserRole }>({
    mutationFn: async ({ userId, status, role }) => {
      const response = await usersService.updateUser(userId, status, role);
      return {
        success: response.success,
        message: response.message,
        userId: response.userId,
        updates: response.updates,
      };
    },
    invalidateQueries: [['users', 'realtime']], // Auto-refresh users list
    onError: (error) => {
      console.error('[useCall_Users] Update user error:', error);
    },
  });

  const getPreferencesMutation = useMutation<NotificationPreferences | null, Error, string>({
    mutationFn: async (userId) => {
      return await usersService.getUserPreferences(userId);
    },
    onError: (error) => {
      console.error('[useCall_Users] Get preferences error:', error);
    },
  });

  const setupPreferencesMutation = useMutation<NotificationPreferences, Error, PreferencesData>({
    mutationFn: async (preferences) => {
      return await usersService.setupPreferences(preferences);
    },
    onError: (error) => {
      console.error('[useCall_Users] Setup preferences error:', error);
    },
  });

  // Determine combined loading/error/success state (React Query uses 'isPending')
  const isLoading = 
    updateStatusMutation.isPending || 
    updateUserMutation.isPending || 
    getPreferencesMutation.isPending || 
    setupPreferencesMutation.isPending;
  
  const error = 
    updateStatusMutation.error || 
    updateUserMutation.error || 
    getPreferencesMutation.error || 
    setupPreferencesMutation.error;
  
  const isSuccess = 
    updateStatusMutation.isSuccess || 
    updateUserMutation.isSuccess || 
    getPreferencesMutation.isSuccess || 
    setupPreferencesMutation.isSuccess;

  const reset = () => {
    updateStatusMutation.reset();
    updateUserMutation.reset();
    getPreferencesMutation.reset();
    setupPreferencesMutation.reset();
  };

  return {
    updateUserStatus: (userId: string, status: UserStatus) => 
      updateStatusMutation.mutateAsync({ userId, status }),
    updateUser: (userId: string, status?: UserStatus, role?: UserRole) => 
      updateUserMutation.mutateAsync({ userId, status, role }),
    getUserPreferences: getPreferencesMutation.mutateAsync,
    setupPreferences: setupPreferencesMutation.mutateAsync,
    isLoading,
    error,
    isSuccess,
    updateResult: updateUserMutation.data ?? null,
    reset,
  };
};

export default useCall_Users;
