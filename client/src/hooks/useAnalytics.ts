/**
 * useAnalytics - Global Hook for Analytics Operations
 * 
 * Provides read-only access to analytics data including:
 * - Dashboard summary statistics
 * - Time-series trends
 * - Parameter-specific analytics
 * 
 * Uses SWR for efficient data fetching and caching.
 * 
 * @module hooks/useAnalytics
 */

import useSWR from 'swr';
import { useCallback } from 'react';
import {
  analyticsService,
  type AnalyticsSummary,
  type TrendsData,
  type ParameterAnalytics,
  type TrendsQueryParams,
  type ParameterQueryParams,
} from '../services/analytics.Service';
import { useVisibilityPolling } from './useVisibilityPolling';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseAnalyticsSummaryOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export interface UseAnalyticsSummaryReturn {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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
 * 
 * @example
 * const { summary, isLoading, refetch } = useAnalyticsSummary({
 *   pollInterval: 30000 // Update every 30 seconds
 * });
 */
export function useAnalyticsSummary(
  options: UseAnalyticsSummaryOptions = {}
): UseAnalyticsSummaryReturn {
  const {
    pollInterval = 60000, // Changed from 30000 to 60000
    enabled = true,
  } = options;

  // Add visibility detection to pause polling when tab is hidden
  const adjustedPollInterval = useVisibilityPolling(pollInterval);

  const cacheKey = enabled ? ['analytics', 'summary'] : null;

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
      refreshInterval: adjustedPollInterval, // Use adjusted interval
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    summary: data || null,
    isLoading,
    error: error || null,
    refetch,
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
