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
import { useState, useCallback, useMemo } from 'react';
import {
  devicesService,
  type DeviceFilters,
  type DeviceReadingFilters,
  type DeviceStats,
  type UpdateDevicePayload,
} from '../services/devices.Service';
import { SWR_CONFIG } from '../constants/api.constants';
import type { DeviceWithReadings, SensorReading } from '../schemas';
import { useVisibilityPolling } from './useVisibilityPolling';
import { calculateDeviceUIStatus } from '../utils/deviceStatus.util';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseDevicesOptions {
  filters?: DeviceFilters;
  pollInterval?: number;
  enabled?: boolean;
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
    pollInterval = SWR_CONFIG.REFRESH_INTERVAL.FREQUENT, // Use centralized SWR refresh interval
    enabled = true,
  } = options;

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
      if (import.meta.env.DEV) {
        console.log('[useDevices] API Response:', response);
        console.log('[useDevices] Received devices:', response.data?.length || 0);
        console.log('[useDevices] Response structure:', {
          success: response.success,
          hasData: !!response.data,
          dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
          pagination: response.pagination,
        });
        
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach((device: any, index: number) => {
            if (index < 3) { // Only log first 3 devices
              console.log(`[useDevices] Device ${index + 1}:`, {
                deviceId: device.deviceId,
                name: device.name,
                status: device.status,
                registrationStatus: device.registrationStatus,
                isRegistered: device.isRegistered,
                hasLatestReading: !!device.latestReading,
                lastSeen: device.lastSeen,
              });
            }
          });
        } else {
          console.warn('[useDevices] Data is not an array or is null:', response.data);
        }
      }
      
      return response.data;
    },
    {
      refreshInterval: adjustedPollInterval, // HTTP polling interval
      revalidateOnFocus: SWR_CONFIG.REVALIDATE_ON_FOCUS,
      revalidateOnReconnect: SWR_CONFIG.REVALIDATE_ON_RECONNECT,
      dedupingInterval: SWR_CONFIG.DEDUPE_INTERVAL,
      keepPreviousData: true,
      revalidateIfStale: SWR_CONFIG.REVALIDATE_IF_STALE,
      revalidateOnMount: true,
    }
  );

  // Fetch device stats - NO CACHING for fresh data
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
      refreshInterval: adjustedPollInterval, // Use same interval as device list
      revalidateOnFocus: SWR_CONFIG.REVALIDATE_ON_FOCUS,
      dedupingInterval: SWR_CONFIG.DEDUPE_INTERVAL,
      keepPreviousData: true,
      revalidateIfStale: SWR_CONFIG.REVALIDATE_IF_STALE,
      revalidateOnMount: true,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Enrich devices with computed uiStatus
  const enrichedDevices = useMemo(() => {
    if (!devicesData || !Array.isArray(devicesData)) return [];
    
    return devicesData.map((device) => {
      // Cast to DeviceWithReadings since API might include latestReading
      const deviceWithReading = device as DeviceWithReadings;
      
      // Calculate UI status using centralized helper
      const statusResult = calculateDeviceUIStatus({
        status: device.status,
        lastSeen: device.lastSeen,
        deviceId: device.deviceId,
        latestReading: deviceWithReading.latestReading || null,
      });
      
      return {
        ...deviceWithReading,
        uiStatus: statusResult.uiStatus,
        statusReason: statusResult.statusReason,
        hasRecentData: statusResult.hasRecentData,
        hasQualityWarnings: statusResult.hasQualityWarnings,
        lastSeenMs: statusResult.lastSeenMs,
      };
    });
  }, [devicesData]);

  return {
    devices: enrichedDevices as DeviceWithReadings[],
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
      dedupingInterval: 0, // DISABLED: No deduplication - always fetch fresh data
      keepPreviousData: false, // DISABLED: Don't show stale data
      revalidateIfStale: true, // Always revalidate stale data
      revalidateOnMount: true, // Always fetch on mount
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
        
        // Call approve endpoint - backend will update device and send 'go' command
        await devicesService.approveDeviceRegistration(deviceId, {
          location,
          metadata,
        });
        
        // Backend automatically sends 'go' command via MQTT
        // No need for frontend to send command separately
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
