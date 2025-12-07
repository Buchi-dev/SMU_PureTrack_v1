/**
 * useUsers - Global Hook for User Management Operations
 * 
 * Provides both read and write operations for user management.
 * Uses SWR for efficient data fetching and caching.
 * 
 * Read Operations:
 * - List users with filtering
 * - Get user by ID
 * - Get user preferences
 * 
 * Write Operations:
 * - Update user role
 * - Update user status
 * - Update user profile
 * - Complete user profile
 * - Delete user
 * - Update notification preferences
 * 
 * @module hooks/useUsers
 */

import useSWR from 'swr';
import { useState, useCallback } from 'react';
import {
  userService,
  type UserFilters,
  type UpdateUserRoleRequest,
  type UpdateUserStatusRequest,
  type UpdateUserProfileRequest,
  type CompleteUserProfileRequest,
  type UserPreferences,
} from '../services/user.Service';
import type { UserListData } from '../schemas';
import { useVisibilityPolling } from './useVisibilityPolling';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseUsersOptions {
  filters?: UserFilters;
  pollInterval?: number;
  enabled?: boolean;
}

export interface UseUsersReturn {
  users: UserListData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  } | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: () => Promise<void>;
}

export interface UseUserOptions {
  userId: string;
  enabled?: boolean;
}

export interface UseUserReturn {
  user: UserListData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseUserPreferencesOptions {
  userId: string;
  enabled?: boolean;
}

export interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseUserMutationsReturn {
  updateUserRole: (userId: string, payload: UpdateUserRoleRequest) => Promise<void>;
  updateUserStatus: (userId: string, payload: UpdateUserStatusRequest) => Promise<void>;
  updateUserProfile: (userId: string, payload: UpdateUserProfileRequest) => Promise<void>;
  completeUserProfile: (userId: string, payload: CompleteUserProfileRequest) => Promise<void>;
  updateUserPreferences: (userId: string, preferences: Partial<UserPreferences>) => Promise<void>;
  resetUserPreferences: (userId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// READ HOOK - Fetch users list
// ============================================================================

/**
 * Fetch users with optional filtering
 * 
 * @example
 * const { users, pagination, isLoading, refetch } = useUsers({
 *   filters: { role: 'staff', status: 'active', page: 1, limit: 20 }
 * });
 */
export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const {
    filters = {},
    pollInterval = 30000, // Changed from 0 to 30000 for periodic updates
    enabled = true,
  } = options;

  // Add visibility detection to pause polling when tab is hidden
  const adjustedPollInterval = useVisibilityPolling(pollInterval);

  const cacheKey = enabled
    ? ['users', 'list', JSON.stringify(filters)]
    : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await userService.getAllUsers(filters);
      return {
        users: response.data,
        pagination: response.pagination,
      };
    },
    {
      refreshInterval: adjustedPollInterval, // Use adjusted interval
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      // Stop polling if we get auth errors
      onError: (err) => {
        if (err?.response?.status === 401) {
          console.warn('[useUsers] Authentication error - stopping polling');
        }
      },
      // Don't retry on 401 errors
      shouldRetryOnError: (err) => {
        return err?.response?.status !== 401;
      },
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    users: data?.users || [],
    pagination: data?.pagination || null,
    isLoading,
    error: error || null,
    refetch,
    mutate: async () => { await mutate(); },
  };
}

// ============================================================================
// READ HOOK - Fetch single user
// ============================================================================

/**
 * Fetch a single user by ID
 * 
 * @example
 * const { user, isLoading, refetch } = useUser({
 *   userId: 'user-123'
 * });
 */
export function useUser(options: UseUserOptions): UseUserReturn {
  const { userId, enabled = true } = options;

  const cacheKey = enabled && userId
    ? ['users', userId]
    : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await userService.getUserById(userId);
      return response.data;
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    user: data || null,
    isLoading,
    error: error || null,
    refetch,
  };
}

// ============================================================================
// READ HOOK - Fetch user preferences
// ============================================================================

/**
 * Fetch notification preferences for a user
 * 
 * @example
 * const { preferences, isLoading } = useUserPreferences({
 *   userId: 'user-123'
 * });
 */
export function useUserPreferences(
  options: UseUserPreferencesOptions
): UseUserPreferencesReturn {
  const { userId, enabled = true } = options;

  const cacheKey = enabled && userId
    ? ['users', userId, 'preferences']
    : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await userService.getUserPreferences(userId);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    preferences: data || null,
    isLoading,
    error: error || null,
    refetch,
  };
}

// ============================================================================
// WRITE HOOK - User mutations
// ============================================================================

/**
 * Perform write operations on users
 * 
 * @example
 * const { updateUserRole, updateUserStatus, isLoading } = useUserMutations();
 * 
 * await updateUserRole('user-123', { role: 'admin' });
 * await updateUserStatus('user-456', { status: 'active' });
 */
export function useUserMutations(): UseUserMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateUserRole = useCallback(
    async (userId: string, payload: UpdateUserRoleRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        await userService.updateUserRole(userId, payload.role);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update user role');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateUserStatus = useCallback(
    async (userId: string, payload: UpdateUserStatusRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        await userService.updateUserStatus(userId, payload.status);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update user status');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateUserProfile = useCallback(
    async (userId: string, payload: UpdateUserProfileRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        await userService.updateUserProfile(userId, payload);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update user profile');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const completeUserProfile = useCallback(
    async (userId: string, payload: CompleteUserProfileRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        await userService.completeUserProfile(userId, payload);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to complete user profile');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateUserPreferences = useCallback(
    async (userId: string, preferences: Partial<UserPreferences>) => {
      setIsLoading(true);
      setError(null);
      try {
        await userService.updateUserPreferences(userId, preferences);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update preferences');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const resetUserPreferences = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await userService.resetUserPreferences(userId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reset preferences');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    updateUserRole,
    updateUserStatus,
    updateUserProfile,
    completeUserProfile,
    updateUserPreferences,
    resetUserPreferences,
    isLoading,
    error,
  };
}
