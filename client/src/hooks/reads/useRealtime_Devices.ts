/**
 * useRealtime_Devices - Read Hook
 * 
 * Real-time listener for device sensor data via RTDB and Firestore.
 * Combines device metadata (Firestore) with live sensor readings (RTDB).
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * Architecture:
 * - Device status comes from Firestore ONLY
 * - RTDB subscriptions update latestReading but NOT device status
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
import { devicesService } from '../../services/devices.Service';
import type { Device, SensorReading } from '../../schemas';

/**
 * Simple throttle utility for RTDB updates
 * Ensures cache updates don't happen more frequently than specified interval
 */
function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = (...args: Parameters<T>) => {
    lastArgs = args;

    if (!timeoutId) {
      func(...args);
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        timeoutId = null;
        lastArgs = null;
      }, delay);
    }
  };

  return throttled as T;
}

/**
 * Device with sensor data
 */
export interface DeviceWithSensorData {
  /** Unique device identifier */
  deviceId: string;
  /** Human-readable device name */
  deviceName: string;
  /** Latest sensor reading from RTDB */
  latestReading: SensorReading | null;
  /** Device status from Firestore (source of truth) */
  status: 'online' | 'offline' | 'error' | 'maintenance';
  /** Location string (building, floor) */
  location?: string;
  /** Full device metadata */
  metadata?: Device;
}

/**
 * Hook configuration options
 */
interface UseRealtimeDevicesOptions {
  /** Enable/disable auto-subscription (default: true) */
  enabled?: boolean;
  /** Include full device metadata in response (default: false) */
  includeMetadata?: boolean;
}

/**
 * Hook return value
 */
interface UseRealtimeDevicesReturn {
  /** Array of devices with real-time sensor data */
  devices: DeviceWithSensorData[];
  /** Loading state - true on initial load only */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manual refetch function (reconnects listeners) */
  refetch: () => void;
  /** Whether data is being fetched (including background refetch) */
  isFetching: boolean;
  /** Whether data is stale and should be refetched */
  isStale: boolean;
}

/**
 * Subscribe to real-time device sensor data
 * 
 * Fetches device list from Firestore, then subscribes to RTDB for live readings.
 * Device status remains synced with Firestore (source of truth).
 * 
 * @example
 * ```tsx
 * const { devices, isLoading, error, refetch } = useRealtime_Devices();
 * 
 * // With metadata
 * const { devices } = useRealtime_Devices({ includeMetadata: true });
 * 
 * // Check fetching state
 * if (isFetching) {
 *   console.log('Updating data in background...');
 * }
 * ```
 * 
 * @param options - Configuration options
 * @returns Real-time device data, loading state, and error state
 */
export const useRealtime_Devices = (
  options: UseRealtimeDevicesOptions = {}
): UseRealtimeDevicesReturn => {
  const { enabled = true, includeMetadata = false } = options;
  const queryClient = useQueryClient();
  const unsubscribeAllRef = useRef<(() => void) | null>(null);

  // React Query configuration
  const queryKey = ['devices', 'realtime', { includeMetadata }];

  // Create throttled cache update function (max once per 500ms)
  // Prevents excessive re-renders from rapid sensor updates
  const throttledCacheUpdate = useRef(
    throttle((deviceId: string, reading: SensorReading) => {
      queryClient.setQueryData<DeviceWithSensorData[]>(queryKey, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((device) =>
          device.deviceId === deviceId
            ? { ...device, latestReading: reading }
            : device
        );
      });
    }, 500) // Update cache max once per 500ms per device
  );

  const {
    data: devices = [],
    isLoading,
    error,
    refetch,
    isFetching,
    isStale,
  } = useQuery<DeviceWithSensorData[], Error>({
    queryKey,
    queryFn: async () => {
      // Cleanup previous subscriptions if any
      if (unsubscribeAllRef.current) {
        unsubscribeAllRef.current();
        unsubscribeAllRef.current = null;
      }

      // READ: Fetch device list from Firestore
      const devicesData = await devicesService.listDevices();

      const formattedDevices: DeviceWithSensorData[] = devicesData.map((device) => ({
        deviceId: device.deviceId,
        deviceName: device.name || device.deviceId,
        latestReading: null,
        status: device.status || 'offline',
        location: device.metadata?.location
          ? `${device.metadata.location.building || ''}, ${device.metadata.location.floor || ''}`
          : undefined,
        ...(includeMetadata && { metadata: device }),
      }));

      // READ: Subscribe to real-time sensor readings from RTDB
      if (formattedDevices.length > 0) {
        const deviceIds = formattedDevices.map((d) => d.deviceId);
        
        unsubscribeAllRef.current = devicesService.subscribeToMultipleDevices(
          deviceIds,
          (deviceId, reading) => {
            if (reading) {
              // ✅ Throttled update: prevents excessive re-renders from rapid sensor updates
              // Cache updates max once per 500ms per device
              throttledCacheUpdate.current(deviceId, reading);
            }
          },
          (deviceId, err) => {
            console.error(`[useRealtime_Devices] Error with device ${deviceId}:`, err);
            // Don't set global error for individual device failures
          }
        );
      }

      return formattedDevices;
    },
    enabled,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes after unmount
    refetchOnWindowFocus: true, // Refetch on window focus to get latest device list
    refetchOnMount: true, // Refetch on mount
    retry: 2, // Retry failed fetches
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Cleanup subscription when component unmounts or includeMetadata changes
  useEffect(() => {
    return () => {
      if (unsubscribeAllRef.current) {
        unsubscribeAllRef.current();
        unsubscribeAllRef.current = null;
      }
    };
  }, [includeMetadata]); // Reconnect if includeMetadata changes

  return {
    devices,
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    },
    isFetching,
    isStale,
  };
};

export default useRealtime_Devices;
