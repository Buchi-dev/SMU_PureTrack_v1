/**
 * useRealtime_Users - Read Hook
 * 
 * Real-time listener for user data via Firestore.
 * Subscribes to user updates and maintains live data sync.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * Powered by React Query for:
 * - Automatic caching and request deduplication
 * - Background refetching and smart invalidation
 * - Built-in error retry with exponential backoff
 * - DevTools integration for debugging
 * 
 * @module hooks/reads
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
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
 * Uses React Query for smart caching and automatic refetching.
 * Maintains real-time Firestore subscription and updates cache on changes.
 * 
 * @example
 * ```tsx
 * const { users, isLoading, error, refetch } = useRealtime_Users();
 * 
 * // Conditional subscription
 * const { users } = useRealtime_Users({ enabled: isAdmin });
 * 
 * // Check if data is stale
 * if (isStale) {
 *   console.log('User data might be outdated');
 * }
 * ```
 * 
 * @param options - Configuration options
 * @returns Real-time users data, loading state, and error state
 */
export const useRealtime_Users = (
  options: UseRealtimeUsersOptions = {}
): UseRealtimeUsersReturn => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // React Query configuration
  const queryKey = ['users', 'realtime'];

  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery<UserListData[], Error>({
    queryKey,
    queryFn: async () => {
      // Initial fetch - returns a promise that resolves with initial data
      return new Promise<UserListData[]>((resolve, reject) => {
        let initialDataReceived = false;

        const unsubscribe = usersService.subscribeToUsers(
          (usersData) => {
            if (!initialDataReceived) {
              // First data received - resolve the promise
              initialDataReceived = true;
              resolve(usersData);
            } else {
              // Subsequent updates - update cache directly
              queryClient.setQueryData<UserListData[]>(queryKey, usersData);
            }
          },
          (err) => {
            console.error('[useRealtime_Users] Subscription error:', err);
            if (!initialDataReceived) {
              reject(err instanceof Error ? err : new Error('Failed to fetch users'));
            }
          }
        );

        // Store unsubscribe function
        unsubscribeRef.current = unsubscribe;
      });
    },
    enabled,
    staleTime: 0, // Always consider data fresh (real-time subscription)
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes after unmount
    refetchOnWindowFocus: false, // Don't refetch on focus (we have real-time updates)
    refetchOnMount: true, // Refetch on mount to establish subscription
    retry: 3, // Retry failed subscriptions
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Cleanup subscription when component unmounts or query changes
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [queryKey.join(',')]);

  return {
    users,
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
};

export default useRealtime_Users;
