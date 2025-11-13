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

  const {
    data: devices = [],
    isLoading,
    error,
    refetch,
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
              // ✅ Update sensor reading in cache, keep Firestore status as source of truth
              queryClient.setQueryData<DeviceWithSensorData[]>(queryKey, (oldData) => {
                if (!oldData) return oldData;
                return oldData.map((device) =>
                  device.deviceId === deviceId
                    ? { ...device, latestReading: reading }
                    : device
                );
              });
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

  // Cleanup subscription when component unmounts or query key changes
  useEffect(() => {
    return () => {
      if (unsubscribeAllRef.current) {
        unsubscribeAllRef.current();
        unsubscribeAllRef.current = null;
      }
    };
  }, [queryKey.join(',')]);

  return {
    devices,
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
};

export default useRealtime_Devices;
