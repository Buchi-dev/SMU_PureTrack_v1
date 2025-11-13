/**
 * useRealtime_MQTTMetrics - Read Hook
 * 
 * Real-time polling for MQTT Bridge health and status metrics.
 * Uses HTTP polling (not WebSocket) to fetch metrics at regular intervals.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * Architecture:
 * - Uses separate queries for health and status to allow partial failures
 * - Each endpoint can fail independently without blocking the other
 * - Better resilience for network issues or service degradation
 * 
 * Powered by React Query for:
 * - Automatic polling with refetchInterval
 * - Smart error recovery and exponential backoff
 * - Background refetching and caching
 * - Automatic request deduplication
 * 
 * @module hooks/reads
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { mqttService } from '../../services/mqtt.service';
import type { MqttBridgeHealth, MqttBridgeStatus } from '../../services/mqtt.service';

/**
 * Hook configuration options
 */
interface UseRealtimeMQTTMetricsOptions {
  /** Polling interval in milliseconds (default: 2000ms / 2 seconds) */
  pollInterval?: number;
  /** Enable/disable auto-polling (default: true) */
  enabled?: boolean;
  /** Retry delay after errors in milliseconds (default: 5000ms) */
  retryDelay?: number;
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
  /** Timestamp of last successful update */
  lastUpdate: Date | null;
  /** Manual refetch function */
  refetch: () => Promise<void>;
  /** Whether actively polling */
  isPolling: boolean;
}

/**
 * Poll MQTT Bridge metrics in real-time
 * 
 * Fetches health and status data at regular intervals using HTTP polling.
 * Implements smart caching and error recovery.
 * 
 * @example
 * ```tsx
 * const { 
 *   health, 
 *   status, 
 *   isLoading, 
 *   error, 
 *   lastUpdate 
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
    pollInterval = 2000, 
    enabled = true
  } = options;

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Separate queries for better error isolation
  // Each can fail independently without blocking the other
  const healthQuery = useQuery<MqttBridgeHealth, Error>({
    queryKey: ['mqtt', 'health'],
    queryFn: async () => {
      const data = await mqttService.getHealth();
      setLastUpdate(new Date());
      return data;
    },
    enabled,
    refetchInterval: pollInterval,
    refetchIntervalInBackground: true,
    retry: 1, // Only retry once for faster failure
    retryDelay: 1000, // Quick retry
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    // Don't throw on error - return undefined and let UI handle it
    throwOnError: false,
  });

  const statusQuery = useQuery<MqttBridgeStatus, Error>({
    queryKey: ['mqtt', 'status'],
    queryFn: async () => {
      return await mqttService.getStatus();
    },
    enabled,
    refetchInterval: pollInterval,
    refetchIntervalInBackground: true,
    retry: 1, // Only retry once for faster failure
    retryDelay: 1000, // Quick retry
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    // Don't throw on error - return undefined and let UI handle it
    throwOnError: false,
  });

  // Combined loading state - only true if BOTH are loading for the first time AND have no data yet
  // This prevents infinite loading if one query succeeds
  const isLoading = (healthQuery.isLoading || statusQuery.isLoading) && 
                    !healthQuery.data && 
                    !statusQuery.data;
  
  // Combined error state - show error only if BOTH fail
  // This allows partial success (e.g., health works but status fails)
  const error = (healthQuery.error && statusQuery.error) 
    ? (healthQuery.error || statusQuery.error) 
    : null;

  // Determine if actively polling
  const isPolling = enabled && (healthQuery.isFetching || statusQuery.isFetching);

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[useRealtime_MQTTMetrics] State:', {
      isLoading,
      isPolling,
      healthData: !!healthQuery.data,
      statusData: !!statusQuery.data,
      healthLoading: healthQuery.isLoading,
      statusLoading: statusQuery.isLoading,
      healthError: healthQuery.error?.message,
      statusError: statusQuery.error?.message,
      healthMetrics: healthQuery.data?.metrics,
      statusMetrics: statusQuery.data?.metrics,
    });
    
    // Deep log the full health object to see structure
    if (healthQuery.data) {
      console.log('[useRealtime_MQTTMetrics] Full Health Data:', JSON.stringify(healthQuery.data, null, 2));
    }
    if (statusQuery.data) {
      console.log('[useRealtime_MQTTMetrics] Full Status Data:', JSON.stringify(statusQuery.data, null, 2));
    }
  }

  return {
    health: healthQuery.data ?? null,
    status: statusQuery.data ?? null,
    isLoading,
    error,
    lastUpdate,
    refetch: async () => {
      await Promise.all([healthQuery.refetch(), statusQuery.refetch()]);
    },
    isPolling,
  };
};

export default useRealtime_MQTTMetrics;
