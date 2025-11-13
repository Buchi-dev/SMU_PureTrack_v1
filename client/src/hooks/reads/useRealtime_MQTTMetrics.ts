/**
 * useRealtime_MQTTMetrics - Read Hook
 * 
 * Real-time polling for MQTT Bridge health and status metrics.
 * Uses HTTP polling (not WebSocket) to fetch metrics at regular intervals.
 * 
 * ⚠️ READ ONLY - No write operations allowed
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
    enabled = true,
    retryDelay = 5000
  } = options;

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // React Query configuration for health
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
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(retryDelay * Math.pow(2, attemptIndex), 30000),
    staleTime: 0, // Always consider data stale to enable continuous polling
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes after unmount
  });

  // React Query configuration for status
  const statusQuery = useQuery<MqttBridgeStatus, Error>({
    queryKey: ['mqtt', 'status'],
    queryFn: async () => {
      const data = await mqttService.getStatus();
      return data;
    },
    enabled,
    refetchInterval: pollInterval,
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(retryDelay * Math.pow(2, attemptIndex), 30000),
    staleTime: 0, // Always consider data stale to enable continuous polling
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes after unmount
  });

  // Combined loading state - only true if both are loading for the first time
  const isLoading = healthQuery.isLoading || statusQuery.isLoading;
  
  // Combined error state - show error if either fails
  const error = healthQuery.error || statusQuery.error;

  // Determine if actively polling
  const isPolling = enabled && (healthQuery.isFetching || statusQuery.isFetching);

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
