/**
 * useRealtime_Users - Read Hook
 * 
 * Polling-based user list updates via Express API.
 * Fetches user data at regular intervals to simulate real-time updates.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * @module hooks/reads
 */

import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../../services/user.Service';
import type { UserListData } from '../../schemas';

/**
 * Hook configuration options
 */
interface UseRealtimeUsersOptions {
  /** Enable/disable auto-fetching (default: true) */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 5000ms = 5 seconds) */
  pollInterval?: number;
}

/**
 * Hook return value
 */
interface UseRealtimeUsersReturn {
  /** Array of users */
  users: UserListData[];
  /** Loading state - true on initial load only */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manual refetch function */
  refetch: () => void;
}

/**
 * Subscribe to user updates via polling Express API
 * 
 * @example
 * ```tsx
 * const { users, isLoading, error } = useRealtime_Users();
 * 
 * // Conditional fetching
 * const { users } = useRealtime_Users({ enabled: isAdmin });
 * 
 * // Custom poll interval
 * const { users } = useRealtime_Users({ pollInterval: 10000 });
 * ```
 * 
 * @param options - Configuration options
 * @returns Users data, loading state, and error state
 */
export const useRealtime_Users = (
  options: UseRealtimeUsersOptions = {}
): UseRealtimeUsersReturn => {
  const { enabled = true, pollInterval = 5000 } = options;

  const [users, setUsers] = useState<UserListData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  /**
   * Fetch users from Express API
   */
  const fetchUsers = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await usersService.getAllUsers({ limit: 100 });
      setUsers(response.data);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('[useRealtime_Users] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch users'));
      setIsLoading(false);
    }
  }, [enabled]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Initial fetch
    fetchUsers();

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchUsers();
    }, pollInterval);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, pollInterval, refetchTrigger, fetchUsers]);

  return {
    users,
    isLoading,
    error,
    refetch,
  };
};

export default useRealtime_Users;
