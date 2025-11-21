/**
 * useRealtime_Alerts - Read Hook
 * 
 * Real-time polling for water quality alerts via Express REST API with SWR.
 * Polls for updates every 5 seconds to maintain live data sync.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * Use useCall_Alerts hook for write operations (acknowledge, resolve)
 * 
 * @module hooks/reads
 */

import useSWR from 'swr';
import { buildAlertsUrl } from '../../config/endpoints';
import { fetcher, swrRealtimeConfig } from '../../config/swr.config';
import type { WaterQualityAlert } from '../../schemas';

/**
 * Hook configuration options
 */
interface UseRealtimeAlertsOptions {
  /** Filter by alert status */
  status?: 'Unacknowledged' | 'Acknowledged' | 'Resolved';
  /** Filter by severity */
  severity?: 'Critical' | 'Warning' | 'Advisory';
  /** Filter by device ID */
  deviceId?: string;
  /** Maximum number of alerts to fetch (default: all) */
  limit?: number;
  /** Enable/disable polling (default: true) */
  enabled?: boolean;
  /** Custom polling interval in ms (default: 5000ms for enabled, 0 for disabled) */
  refreshInterval?: number;
}

/**
 * Hook return value
 */
interface UseRealtimeAlertsReturn {
  /** Array of real-time alerts */
  alerts: WaterQualityAlert[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
  /** Manual refetch function */
  refetch: () => void;
  /** Is currently revalidating */
  isValidating: boolean;
}

/**
 * Poll for real-time water quality alerts with SWR
 * Polls every 5 seconds for live updates
 * 
 * @example
 * ```tsx
 * // Get all alerts with real-time polling
 * const { alerts, isLoading, error } = useRealtime_Alerts();
 * 
 * // Get only unacknowledged critical alerts
 * const { alerts } = useRealtime_Alerts({ 
 *   status: 'Unacknowledged',
 *   severity: 'Critical'
 * });
 * ```
 * 
 * @param options - Filter and configuration options
 * @returns Real-time alerts data, loading state, and error state
 */
export const useRealtime_Alerts = (
  options: UseRealtimeAlertsOptions = {}
): UseRealtimeAlertsReturn => {
  const { status, severity, deviceId, limit, enabled = true, refreshInterval } = options;

  // Build URL with filters
  const url = enabled
    ? buildAlertsUrl({ status, severity, deviceId, limit })
    : null;

  // Determine polling interval
  const pollingInterval = !enabled 
    ? 0 
    : refreshInterval !== undefined 
    ? refreshInterval 
    : swrRealtimeConfig.refreshInterval;

  // Use SWR with real-time polling (default 5 seconds, customizable)
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    url,
    fetcher,
    {
      ...swrRealtimeConfig,
      refreshInterval: pollingInterval,
    }
  );

  return {
    alerts: data?.data || [],
    isLoading,
    error,
    refetch: mutate,
    isValidating,
  };
};

export default useRealtime_Alerts;
