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
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  devicesService,
  type DeviceFilters,
  type DeviceReadingFilters,
  type DeviceStats,
  type UpdateDevicePayload,
} from '../services/devices.Service';
import { SWR_CONFIG } from '../constants/api.constants';
import type { DeviceWithReadings, SensorReading } from '../schemas';
import { calculateDeviceUIStatus } from '../utils/deviceStatus.util';
import { io, Socket } from 'socket.io-client';
import { auth } from '../config/firebase.config';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

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
  recoverDevice: (deviceId: string) => Promise<void>;
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
    enabled = true,
  } = options;


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
      refreshInterval: 0, // 🔥 DISABLED - WebSocket provides real-time updates
      revalidateOnFocus: false, // Don't refetch on tab focus - WebSocket keeps data fresh
      revalidateOnReconnect: true, // Refetch when network reconnects
      dedupingInterval: SWR_CONFIG.DEDUPE_INTERVAL,
      keepPreviousData: true,
      revalidateIfStale: false, // Data is always fresh via WebSocket
      revalidateOnMount: true, // Initial fetch on mount only
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
      refreshInterval: 0, // 🔥 DISABLED - Stats derived from device list (WebSocket updated)
      revalidateOnFocus: false,
      dedupingInterval: SWR_CONFIG.DEDUPE_INTERVAL,
      keepPreviousData: true,
      revalidateIfStale: false,
      revalidateOnMount: true,
    }
  );

  // 🔥 FIX: Listen to WebSocket device status updates and update cache
  // ⚠️ IMPORTANT: useEffect must be called before useMemo/useCallback to maintain hook order
  useEffect(() => {
    if (!enabled) return;

    let socket: Socket | null = null;

    const setupWebSocket = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('📡 [useDevices] No authenticated user, skipping WebSocket setup');
          return;
        }

        const token = await currentUser.getIdToken();
        
        socket = io(WS_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
        });

        // Connection success
        socket.on('connect', () => {
          console.log('✅ [useDevices] WebSocket connected', socket?.id);
          
          // 🔥 FIX: Subscribe to device updates by joining rooms
          // If we have devices, subscribe to each device's room
          if (devicesData && Array.isArray(devicesData) && devicesData.length > 0) {
            const deviceIds = devicesData.map((d: any) => d.deviceId);
            socket?.emit('subscribe:devices', deviceIds);
            console.log('📡 [useDevices] Subscribed to devices:', deviceIds);
          }
        });

        // Listen for device status updates
        socket.on('device:status', (payload: { deviceId: string; status: 'online' | 'offline'; timestamp: number }) => {
          console.log('📡 [useDevices] Device status update via WebSocket:', payload.deviceId, payload.status);
          
          // Update the device in the SWR cache
          mutate((currentData) => {
            if (!currentData || !Array.isArray(currentData)) return currentData;
            
            return currentData.map((device: any) => {
              if (device.deviceId === payload.deviceId) {
                console.log(`📡 [useDevices] Updating device ${payload.deviceId} status to ${payload.status}`);
                return {
                  ...device,
                  status: payload.status,
                  lastSeen: new Date(payload.timestamp),
                };
              }
              return device;
            });
          }, false); // false = don't revalidate, just update cache
        });

        // Connection error handling
        socket.on('connect_error', (error) => {
          console.error('❌ [useDevices] WebSocket connection error:', error);
        });

        socket.on('disconnect', (reason) => {
          console.warn('🔌 [useDevices] WebSocket disconnected:', reason);
        });
      } catch (error) {
        console.error('❌ [useDevices] Failed to setup WebSocket:', error);
      }
    };

    setupWebSocket();

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect();
        console.log('📡 [useDevices] WebSocket disconnected');
      }
    };
  }, [enabled, mutate]); // Keep dependencies minimal to prevent unnecessary reconnections
  
  // Separate effect to handle device subscription updates
  useEffect(() => {
    // This effect runs when devices data changes to update subscriptions
    // without recreating the entire WebSocket connection
  }, [devicesData]);

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

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

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

  const recoverDevice = useCallback(
    async (deviceId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await devicesService.recoverDevice(deviceId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to recover device');
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
    recoverDevice,
    isLoading,
    error,
  };
}

/**
 * useDeletedDevices - Hook for Deleted Devices
 * 
 * Fetches soft-deleted devices that can be recovered
 * 
 * @param options - Configuration options
 * @returns Deleted devices list and utilities
 * 
 * @example
 * const { deletedDevices, isLoading, refetch } = useDeletedDevices();
 */
export function useDeletedDevices(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR(
    enabled ? 'deleted-devices' : null,
    () => devicesService.getDeletedDevices(),
    {
      ...SWR_CONFIG,
      revalidateOnFocus: true,
      refreshInterval: 0, // Don't auto-refresh deleted devices
    }
  );

  const deletedDevices = useMemo(() => {
    if (!data?.data || !Array.isArray(data.data)) return [];
    
    // Map to DeviceWithReadings format with computed uiStatus
    return data.data.map((device) => {
      // Cast to DeviceWithReadings
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
        sensorReadings: [] as SensorReading[], // No sensor readings for deleted devices
      };
    }) as DeviceWithReadings[];
  }, [data]);

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    deletedDevices,
    isLoading,
    error,
    refetch,
    mutate,
  };
}
