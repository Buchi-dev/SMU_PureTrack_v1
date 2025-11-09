/**
 * useRealtime_Users - Read Hook
 * 
 * Real-time listener for user data via Firestore.
 * Subscribes to user updates and maintains live data sync.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * @module hooks/reads
 */

import { useState, useEffect } from 'react';
import { usersService } from '../../services/user.Service';
import type { UserListData } from '../../schemas';

/**
 * Hook configuration options
 */
interface UseRealtimeUsersOptions {
  /** Enable/disable auto-subscription (default: true) */
  enabled?: boolean;
}

/**
 * Hook return value
 */
interface UseRealtimeUsersReturn {
  /** Array of real-time users */
  users: UserListData[];
  /** Loading state - true on initial load only */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manual refetch function (reconnects listener) */
  refetch: () => void;
}

/**
 * Subscribe to real-time user updates from Firestore
 * 
 * @example
 * ```tsx
 * const { users, isLoading, error } = useRealtime_Users();
 * 
 * // Conditional subscription
 * const { users } = useRealtime_Users({ enabled: isAdmin });
 * ```
 * 
 * @param options - Configuration options
 * @returns Real-time users data, loading state, and error state
 */
export const useRealtime_Users = (
  options: UseRealtimeUsersOptions = {}
): UseRealtimeUsersReturn => {
  const { enabled = true } = options;

  const [users, setUsers] = useState<UserListData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Subscribe to real-time users via service layer
    const unsubscribe = usersService.subscribeToUsers(
      (usersData) => {
        setUsers(usersData);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useRealtime_Users] Subscription error:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch users'));
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return {
    users,
    isLoading,
    error,
    refetch,
  };
};

export default useRealtime_Users;
