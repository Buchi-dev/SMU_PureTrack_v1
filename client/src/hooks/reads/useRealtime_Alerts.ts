/**
 * useRealtime_Alerts - Read Hook
 * 
 * Real-time listener for water quality alerts via Firestore.
 * Subscribes to alert updates and maintains live data sync.
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
import { alertsService } from '../../services/alerts.Service';
import type { WaterQualityAlert } from '../../schemas';

/**
 * Hook configuration options
 */
interface UseRealtimeAlertsOptions {
  /** Maximum number of alerts to fetch (default: 20) */
  maxAlerts?: number;
  /** Enable/disable auto-subscription (default: true) */
  enabled?: boolean;
}

/**
 * Hook return value
 */
interface UseRealtimeAlertsReturn {
  /** Array of real-time alerts */
  alerts: WaterQualityAlert[];
  /** Loading state - true on initial load only */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manual refetch function (reconnects listener) */
  refetch: () => void;
  /** Whether data is being fetched (including background refetch) */
  isFetching: boolean;
  /** Whether data is stale and should be refetched */
  isStale: boolean;
}

/**
 * Subscribe to real-time water quality alerts from Firestore
 * 
 * Uses React Query for smart caching and automatic refetching.
 * Maintains real-time Firestore subscription and updates cache on changes.
 * 
 * @example
 * ```tsx
 * const { alerts, isLoading, error, refetch } = useRealtime_Alerts({ maxAlerts: 50 });
 * 
 * // Check if data is stale
 * if (isStale) {
 *   console.log('Data might be outdated');
 * }
 * 
 * // Manual refetch
 * await refetch();
 * ```
 * 
 * @param options - Configuration options
 * @returns Real-time alerts data, loading state, and error state
 */
export const useRealtime_Alerts = (
  options: UseRealtimeAlertsOptions = {}
): UseRealtimeAlertsReturn => {
  const { maxAlerts = 20, enabled = true } = options;
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // React Query configuration
  const queryKey = ['alerts', 'realtime', maxAlerts];

  const {
    data: alerts = [],
    isLoading,
    error,
    refetch,
    isFetching,
    isStale,
  } = useQuery<WaterQualityAlert[], Error>({
    queryKey,
    queryFn: async () => {
      // Initial fetch - returns a promise that resolves with initial data
      return new Promise<WaterQualityAlert[]>((resolve, reject) => {
        let initialDataReceived = false;

        const unsubscribe = alertsService.subscribeToAlerts(
          (alertsData) => {
            if (!initialDataReceived) {
              // First data received - resolve the promise
              initialDataReceived = true;
              resolve(alertsData);
            } else {
              // Subsequent updates - update cache directly
              queryClient.setQueryData<WaterQualityAlert[]>(queryKey, alertsData);
            }
          },
          (err) => {
            console.error('[useRealtime_Alerts] Subscription error:', err);
            if (!initialDataReceived) {
              reject(err instanceof Error ? err : new Error('Failed to fetch alerts'));
            }
          },
          maxAlerts
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

  // Cleanup subscription when component unmounts or maxAlerts changes
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [maxAlerts]); // Reconnect if maxAlerts changes

  return {
    alerts,
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    },
    isFetching,
    isStale,
  };
};

export default useRealtime_Alerts;
