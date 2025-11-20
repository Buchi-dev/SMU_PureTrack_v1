/**
 * useRealtime_MQTTMetrics - Read Hook
 * 
 * Real-time polling for MQTT Bridge health and status metrics via SWR.
 * Uses SWR's built-in polling to fetch metrics at regular intervals.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * @module hooks/reads
 */

import useSWR from 'swr';
import { fetcher, swrRealtimeConfig } from '../../config/swr.config';
import type { MqttBridgeHealth, MqttBridgeStatus } from '../../services/mqtt.service';

/**
 * Hook configuration options
 */
interface UseRealtimeMQTTMetricsOptions {
  /** Polling interval in milliseconds (default: 5000ms / 5 seconds) */
  pollInterval?: number;
  /** Enable/disable auto-polling (default: true) */
  enabled?: boolean;
}

/**
 * Hook return value
 */
interface UseRealtimeMQTTMetricsReturn {
  /** MQTT Bridge health data */
  health: MqttBridgeHealth | null;
  /** MQTT Bridge status data */
  status: MqttBridgeStatus | null;
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
 * Poll MQTT Bridge metrics in real-time via SWR
 * 
 * Fetches health and status data at regular intervals using SWR polling.
 * Automatically handles caching, deduplication, and revalidation.
 * 
 * @example
 * ```tsx
 * const { 
 *   health, 
 *   status, 
 *   isLoading, 
 *   error
 * } = useRealtime_MQTTMetrics({
 *   pollInterval: 3000 // Poll every 3 seconds
 * });
 * 
 * if (health?.mqtt.connected) {
 *   console.log('MQTT Bridge is connected');
 * }
 * ```
 * 
 * @param options - Configuration options
 * @returns Real-time MQTT metrics data, loading state, and error state
 */
export const useRealtime_MQTTMetrics = (
  options: UseRealtimeMQTTMetricsOptions = {}
): UseRealtimeMQTTMetricsReturn => {
  const { 
    pollInterval = 5000, 
    enabled = true
  } = options;

  // MQTT Bridge uses direct URLs (not through our REST API)
  const MQTT_BRIDGE_BASE_URL = 'https://mqtt-bridge-8158575421.us-central1.run.app';
  const healthUrl = enabled ? `${MQTT_BRIDGE_BASE_URL}/health` : null;
  const statusUrl = enabled ? `${MQTT_BRIDGE_BASE_URL}/status` : null;

  // Fetch health data with SWR
  const { 
    data: health, 
    error: healthError, 
    isLoading: healthLoading,
    mutate: refetchHealth,
    isValidating: healthValidating
  } = useSWR<MqttBridgeHealth>(
    healthUrl,
    fetcher,
    {
      ...swrRealtimeConfig,
      refreshInterval: enabled ? pollInterval : 0,
    }
  );

  // Fetch status data with SWR
  const { 
    data: status, 
    error: statusError, 
    isLoading: statusLoading,
    mutate: refetchStatus,
    isValidating: statusValidating
  } = useSWR<MqttBridgeStatus>(
    statusUrl,
    fetcher,
    {
      ...swrRealtimeConfig,
      refreshInterval: enabled ? pollInterval : 0,
    }
  );

  // Combine refetch functions
  const refetch = () => {
    refetchHealth();
    refetchStatus();
  };

  return {
    health: health || null,
    status: status || null,
    isLoading: healthLoading || statusLoading,
    error: healthError || statusError || null,
    refetch,
    isValidating: healthValidating || statusValidating,
  };
};

export default useRealtime_MQTTMetrics;
