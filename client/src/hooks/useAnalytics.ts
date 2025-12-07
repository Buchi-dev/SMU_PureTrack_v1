/**
 * useAnalytics - Global Hook for Analytics Operations
 * 
 * Provides read-only access to analytics data including:
 * - Dashboard summary statistics
 * - Time-series trends
 * - Parameter-specific analytics
 * 
 * Uses SWR for efficient data fetching and caching.
 * Now enhanced with WebSocket for real-time analytics updates.
 * 
 * @module hooks/useAnalytics
 */

import useSWR from 'swr';
import { useCallback, useEffect, useState } from 'react';
import {
  analyticsService,
  type AnalyticsSummary,
  type TrendsData,
  type ParameterAnalytics,
  type TrendsQueryParams,
  type ParameterQueryParams,
} from '../services/analytics.Service';
import { io, Socket } from 'socket.io-client';
import { auth } from '../config/firebase.config';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseAnalyticsSummaryOptions {
  enabled?: boolean;
}

export interface UseAnalyticsSummaryReturn {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale?: boolean; // Indicates if WebSocket data is outdated
}

export interface UseAnalyticsTrendsOptions {
  params?: TrendsQueryParams;
  enabled?: boolean;
}

export interface UseAnalyticsTrendsReturn {
  trends: TrendsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseParameterAnalyticsOptions {
  params: ParameterQueryParams;
  enabled?: boolean;
}

export interface UseParameterAnalyticsReturn {
  analytics: ParameterAnalytics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// ANALYTICS SUMMARY HOOK
// ============================================================================

/**
 * Fetch dashboard analytics summary
 * Includes device counts, alert counts, and latest water quality metrics
 * Now uses WebSocket for real-time updates every 45 seconds
 * 
 * @example
 * const { summary, isLoading, refetch } = useAnalyticsSummary({
 *   enabled: true
 * });
 */
export function useAnalyticsSummary(
  options: UseAnalyticsSummaryOptions = {}
): UseAnalyticsSummaryReturn {
  const { enabled = true } = options;

  const cacheKey = enabled ? ['analytics', 'summary'] : null;
  const [isStale, setIsStale] = useState(false);

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await analyticsService.getSummary();
      return response.data;
    },
    {
      refreshInterval: 0, // 🔥 DISABLED - WebSocket provides real-time updates every 45s
      revalidateOnFocus: false,
      revalidateOnReconnect: true, // Refetch when network reconnects
      dedupingInterval: 5000,
      keepPreviousData: true,
      revalidateOnMount: true, // Initial fetch on mount
    }
  );

  // 🔥 WebSocket: Real-time analytics updates
  useEffect(() => {
    if (!enabled) return;

    let socket: Socket | null = null;
    let reconnectAttempts = 0;

    const setupWebSocket = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('📈 [useAnalyticsSummary] No authenticated user, skipping WebSocket setup');
          return;
        }

        const token = await currentUser.getIdToken();

        socket = io(WS_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 30000,
          reconnectionAttempts: Infinity,
        });

        socket.on('connect', () => {
          console.log('✅ [useAnalyticsSummary] WebSocket connected', socket?.id);
          setIsStale(false);
          reconnectAttempts = 0;

          // Fetch fresh data on reconnection
          mutate();
        });

        // Listen for analytics updates
        socket.on('analytics:update', (payload: { data: AnalyticsSummary; timestamp: number }) => {
          console.log('📈 [useAnalyticsSummary] Analytics update received via WebSocket');

          mutate(() => payload.data, false); // Update cache without revalidation
          setIsStale(false);
        });

        socket.on('connect_error', (error) => {
          console.error('❌ [useAnalyticsSummary] WebSocket connection error:', error);
          reconnectAttempts++;
          setIsStale(true);

          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
          console.log(`⏳ [useAnalyticsSummary] Reconnecting in ${delay / 1000}s...`);
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 [useAnalyticsSummary] WebSocket disconnected:', reason);
          setIsStale(true);

          if (reason === 'io server disconnect') {
            socket?.connect();
          }
        });
      } catch (error) {
        console.error('❌ [useAnalyticsSummary] WebSocket setup error:', error);
        setIsStale(true);
      }
    };

    setupWebSocket();

    return () => {
      if (socket) {
        console.log('🔌 [useAnalyticsSummary] Cleaning up WebSocket');
        socket.off('connect');
        socket.off('analytics:update');
        socket.off('connect_error');
        socket.off('disconnect');
        socket.disconnect();
      }
    };
  }, [enabled, mutate]);

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    summary: data || null,
    isLoading,
    error: error || null,
    refetch,
    isStale, // Expose stale indicator
  };
}

// ============================================================================
// ANALYTICS TRENDS HOOK
// ============================================================================

/**
 * Fetch time-series trends for water quality parameters
 * 
 * @example
 * const { trends, isLoading } = useAnalyticsTrends({
 *   params: {
 *     period: 'hour',
 *     hours: 24,
 *     deviceId: 'DEVICE-001'
 *   }
 * });
 */
export function useAnalyticsTrends(
  options: UseAnalyticsTrendsOptions = {}
): UseAnalyticsTrendsReturn {
  const { params = {}, enabled = true } = options;

  const cacheKey = enabled
    ? ['analytics', 'trends', JSON.stringify(params)]
    : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await analyticsService.getTrends(params);
      return response.data;
    },
    {
      refreshInterval: 60000, // Trends update every minute
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    trends: data || null,
    isLoading,
    error: error || null,
    refetch,
  };
}

// ============================================================================
// PARAMETER ANALYTICS HOOK
// ============================================================================

/**
 * Fetch parameter-specific analytics
 * 
 * @example
 * const { analytics, isLoading } = useParameterAnalytics({
 *   params: {
 *     parameter: 'pH',
 *     deviceId: 'DEVICE-001'
 *   }
 * });
 */
export function useParameterAnalytics(
  options: UseParameterAnalyticsOptions
): UseParameterAnalyticsReturn {
  const { params, enabled = true } = options;

  const cacheKey = enabled
    ? ['analytics', 'parameters', JSON.stringify(params)]
    : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await analyticsService.getParameterAnalytics(params);
      return response.data;
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    analytics: data || null,
    isLoading,
    error: error || null,
    refetch,
  };
}
