/**
 * useDevices - Global Hook for Device Operations
 * 
 * Provides both read and write operations for IoT devices and sensor readings.
 * Uses SWR for efficient data fetching and caching.
 * 
 * Read Operations:
 * - List devices with filtering
 * - Get device statistics
 * - Fetch sensor readings for specific devices
 * - Real-time updates via polling
 * 
 * Write Operations:
 * - Update device settings
 * - Delete devices
 * 
 * @module hooks/useDevices
 */

import useSWR from 'swr';
import { useState, useCallback, useEffect } from 'react';
import {
  devicesService,
  type DeviceFilters,
  type DeviceReadingFilters,
  type DeviceStats,
  type UpdateDevicePayload,
} from '../services/devices.Service';
import type { DeviceWithReadings, SensorReading } from '../schemas';
import { useVisibilityPolling } from './useVisibilityPolling';
import { useSSE } from './useSSE';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseDevicesOptions {
  filters?: DeviceFilters;
  pollInterval?: number;
  enabled?: boolean;
  realtime?: boolean; // Enable SSE real-time updates (default: true)
}

export interface UseDevicesReturn {
  devices: DeviceWithReadings[];
  stats: DeviceStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: () => Promise<void>;
}

export interface UseDeviceReadingsOptions {
  deviceId: string;
  filters?: DeviceReadingFilters;
  enabled?: boolean;
}

export interface UseDeviceReadingsReturn {
  readings: SensorReading[];
  metadata: {
    count: number;
    avgPH: number;
    avgTurbidity: number;
    avgTDS: number;
  } | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseDeviceMutationsReturn {
  updateDevice: (deviceId: string, payload: UpdateDevicePayload) => Promise<void>;
  deleteDevice: (deviceId: string) => Promise<void>;
  registerDevice: (deviceId: string, building: string, floor: string, notes?: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// READ HOOK - Fetch devices
// ============================================================================

/**
 * Fetch devices with optional filtering and real-time updates
 * 
 * @example
 * const { devices, stats, isLoading, refetch } = useDevices({
 *   filters: { status: 'online', registrationStatus: 'registered' },
 *   pollInterval: 5000
 * });
 */
export function useDevices(options: UseDevicesOptions = {}): UseDevicesReturn {
  const {
    filters = {},
    pollInterval = 120000, // 2 minutes - fallback when SSE disconnected
    enabled = true,
    realtime = true, // Enable SSE by default
  } = options;

  // Connect to SSE for real-time updates
  const { state: sseState, subscribe } = useSSE({ enabled: enabled && realtime });

  // Add visibility detection to pause polling when tab is hidden
  const adjustedPollInterval = useVisibilityPolling(pollInterval);

  // Generate cache key from filters
  const cacheKey = enabled
    ? ['devices', 'list', JSON.stringify(filters)]
    : null;

  // Fetch devices with SWR
  const {
    data: devicesData,
    error: devicesError,
    mutate,
    isLoading: devicesLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await devicesService.getDevices(filters);
      
      // Debug logging to see what data is received
      if (import.meta.env.DEV && response.data) {
        console.log('[useDevices] Received devices:', response.data.length);
        response.data.forEach((device: any, index: number) => {
          if (index < 3) { // Only log first 3 devices
            console.log(`[useDevices] Device ${index + 1}:`, {
              deviceId: device.deviceId,
              name: device.name,
              status: device.status,
              hasLatestReading: !!device.latestReading,
              lastSeen: device.lastSeen,
            });
          }
        });
      }
      
      return response.data;
    },
    {
      // Use HTTP polling as fallback when SSE is disconnected or disabled
      refreshInterval: (realtime && sseState === 'connected') ? 0 : adjustedPollInterval,
      revalidateOnFocus: !realtime, // Only refetch on focus if SSE disabled
      revalidateOnReconnect: true, // Always refetch on network reconnect
      dedupingInterval: 60000, // Prevent duplicate requests for 60 seconds
      keepPreviousData: true, // Keep showing old data while fetching
    }
  );

  // Subscribe to SSE events for real-time updates
  useEffect(() => {
    if (!realtime || sseState !== 'connected') {
      return;
    }

    // Subscribe to device events
    const unsubscribeNew = subscribe('device:new', () => {
      console.log('[useDevices] Device added - refetching...');
      mutate(); // Refetch devices list
    });

    const unsubscribeUpdated = subscribe('device:updated', (event) => {
      console.log('[useDevices] Device updated:', event.data.deviceId);
      mutate(); // Refetch devices list
    });

    // Subscribe to sensor reading events (affects latestReading)
    const unsubscribeReading = subscribe('reading:new', (event) => {
      console.log('[useDevices] New reading for:', event.data.reading.deviceId);
      mutate(); // Refetch to get latest reading
    });

    return () => {
      unsubscribeNew();
      unsubscribeUpdated();
      unsubscribeReading();
    };
  }, [realtime, sseState, subscribe, mutate]);

  // Fetch device stats
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR(
    enabled ? ['devices', 'stats'] : null,
    async () => {
      const response = await devicesService.getDeviceStats();
      return response.data;
    },
    {
      refreshInterval: 600000, // Poll stats every 10 minutes (less critical data)
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Prevent duplicate requests for 1 minute
      keepPreviousData: true, // Keep showing old data while fetching
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    devices: (devicesData || []) as DeviceWithReadings[],
    stats: statsData || null,
    isLoading: devicesLoading || statsLoading,
    error: devicesError || statsError || null,
    refetch,
    mutate: async () => { await mutate(); },
  };
}

// ============================================================================
// READ HOOK - Fetch device sensor readings
// ============================================================================

/**
 * Fetch sensor readings for a specific device
 * 
 * @example
 * const { readings, metadata, isLoading } = useDeviceReadings({
 *   deviceId: 'DEVICE-001',
 *   filters: { limit: 100, startDate: '2024-01-01' }
 * });
 */
export function useDeviceReadings(
  options: UseDeviceReadingsOptions
): UseDeviceReadingsReturn {
  const { deviceId, filters = {}, enabled = true } = options;

  const cacheKey = enabled && deviceId
    ? ['devices', deviceId, 'readings', JSON.stringify(filters)]
    : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await devicesService.getDeviceReadings(deviceId, filters);
      return {
        readings: response.data,
        metadata: response.metadata || null,
      };
    },
    {
      refreshInterval: 30000, // Readings can be polled less frequently
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    readings: data?.readings || [],
    metadata: data?.metadata || null,
    isLoading,
    error: error || null,
    refetch,
  };
}

// ============================================================================
// WRITE HOOK - Device mutations
// ============================================================================

/**
 * Perform write operations on devices (update, delete, register)
 * 
 * @example
 * const { updateDevice, deleteDevice, registerDevice, isLoading } = useDeviceMutations();
 * 
 * await updateDevice('DEVICE-001', { location: 'Building A' });
 * await deleteDevice('DEVICE-002');
 * await registerDevice('DEVICE-003', 'Building A', 'Floor 2', 'Notes');
 */
export function useDeviceMutations(): UseDeviceMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateDevice = useCallback(
    async (deviceId: string, payload: UpdateDevicePayload) => {
      setIsLoading(true);
      setError(null);
      try {
        await devicesService.updateDevice(deviceId, payload);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update device');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteDevice = useCallback(async (deviceId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await devicesService.deleteDevice(deviceId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete device');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerDevice = useCallback(
    async (deviceId: string, building: string, floor: string, notes?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        // Build structured location metadata
        const metadata = {
          location: {
            building,
            floor,
            ...(notes && { notes }),
          },
        };
        
        // Also set the location string for backward compatibility
        const location = `${building} - ${floor}${notes ? ` (${notes})` : ''}`;
        
        // Call the new approve endpoint to register the device
        await devicesService.approveDeviceRegistration(deviceId, {
          location,
          metadata,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to register device');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    updateDevice,
    deleteDevice,
    registerDevice,
    isLoading,
    error,
  };
}
