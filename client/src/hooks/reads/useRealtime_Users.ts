/**
 * useRealtime_Users - Read Hook
 * 
 * Real-time user list polling via SWR and Express REST API.
 * Polls user data at regular intervals using SWR's built-in polling.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * @module hooks/reads
 */

import useSWR from 'swr';
import { fetcher, swrImportantConfig } from '../../config/swr.config';
import { USER_ENDPOINTS } from '../../config/endpoints';
import type { UserListData, UserRole, UserStatus } from '../../schemas';

/**
 * Hook configuration options
 */
interface UseRealtimeUsersOptions {
  /** Filter by user role */
  role?: UserRole;
  /** Filter by user status */
  status?: UserStatus;
  /** Maximum number of users to fetch */
  limit?: number;
  /** Enable/disable auto-fetching (default: true) */
  enabled?: boolean;
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
  /** Whether a revalidation is in progress */
  isValidating: boolean;
}

/**
 * Subscribe to user updates via SWR polling of Express API
 * 
 * Uses SWR with 15-second polling interval for user management.
 * Automatically handles caching, deduplication, and revalidation.
 * 
 * @example
 * ```tsx
 * const { users, isLoading, error } = useRealtime_Users();
 * 
 * // Filter by role
 * const { users } = useRealtime_Users({ role: 'staff' });
 * 
 * // Filter by status
 * const { users } = useRealtime_Users({ status: 'active' });
 * 
 * // Conditional fetching
 * const { users } = useRealtime_Users({ enabled: isAdmin });
 * ```
 * 
 * @param options - Configuration options
 * @returns Users data, loading state, and error state
 */
export const useRealtime_Users = (
  options: UseRealtimeUsersOptions = {}
): UseRealtimeUsersReturn => {
  const { role, status, limit = 100, enabled = true } = options;

  // Build query parameters
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (status) params.append('status', status);
  if (limit) params.append('limit', limit.toString());

  const queryString = params.toString();
  const url = enabled 
    ? `${USER_ENDPOINTS.LIST}${queryString ? `?${queryString}` : ''}`
    : null;

  // Use SWR with important data config (15s polling)
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    url,
    fetcher,
    {
      ...swrImportantConfig,
      refreshInterval: enabled ? 15000 : 0, // 15 seconds
    }
  );

  return {
    users: data?.data || [],
    isLoading,
    error: error || null,
    refetch: mutate,
    isValidating,
  };
};

export default useRealtime_Users;
