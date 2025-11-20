/**
 * useRealtime_AnalyticsData - Global Read Hook
 * 
 * Real-time polling for analytics dashboard data via SWR and Express REST API.
 * Polls analytics summary at regular intervals using SWR's built-in polling.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * ⚠️ MIGRATION NOTE:
 * This hook has been simplified to use server-side analytics.
 * For detailed historical data, use the analytics service directly:
 * - analyticsService.getTrends() for time-series data
 * - analyticsService.getParameterAnalytics() for parameter details
 * - devicesService.getDeviceReadings() for device history
 * - alertsService.getAlerts() for historical alerts
 * 
 * @module hooks/reads
 */

import useSWR from 'swr';
import { fetcher, swrAnalyticsConfig } from '../../config/swr.config';
import { ANALYTICS_ENDPOINTS } from '../../config/endpoints';
import type { AnalyticsSummary } from '../../services/analytics.service';

/**
 * Hook configuration options
 */
interface UseRealtimeAnalyticsDataOptions {
  /** Enable/disable auto-fetch (default: true) */
  enabled?: boolean;
}

/**
 * Hook return value
 */
interface UseRealtimeAnalyticsDataReturn {
  /** Analytics summary data (devices, alerts, readings statistics) */
  summary: AnalyticsSummary | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manual refetch function */
  refetch: () => void;
  /** Whether a revalidation is in progress */
  isValidating: boolean;
}

/**
 * Fetch real-time analytics summary via SWR
 * 
 * Provides dashboard summary statistics including:
 * - Device counts and status
 * - Alert counts by severity
 * - Reading counts and compliance rates
 * 
 * For more detailed analytics, use the analytics service directly:
 * - analyticsService.getTrends() for time-series data
 * - analyticsService.getParameterAnalytics() for parameter-specific insights
 * 
 * @example
 * ```tsx
 * const { 
 *   summary, 
 *   isLoading,
 *   error
 * } = useRealtime_AnalyticsData();
 * 
 * if (summary) {
 *   console.log('Total devices:', summary.devices.total);
 *   console.log('Active alerts:', summary.alerts.active);
 * }
 * ```
 * 
 * @param options - Configuration options
 * @returns Analytics summary data, loading state, and error state
 */
export const useRealtime_AnalyticsData = (
  options: UseRealtimeAnalyticsDataOptions = {}
): UseRealtimeAnalyticsDataReturn => {
  const { enabled = true } = options;

  const url = enabled ? ANALYTICS_ENDPOINTS.SUMMARY : null;

  // Use SWR with analytics config (30s polling - less frequent than critical data)
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    url,
    fetcher,
    {
      ...swrAnalyticsConfig,
      refreshInterval: enabled ? 30000 : 0, // 30 seconds
    }
  );

  return {
    summary: data?.data || null,
    isLoading,
    error: error || null,
    refetch: mutate,
    isValidating,
  };
};
