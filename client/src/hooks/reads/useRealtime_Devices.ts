/**
 * useRealtime_Devices - Read Hook
 * 
 * Real-time polling for device data via Express REST API with SWR.
 * Polls for device list and sensor readings every 5-15 seconds.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * Use useCall_Devices hook for write operations (update, delete)
 * 
 * @module hooks/reads
 */

import useSWR from 'swr';
import { buildDevicesUrl } from '../../config/endpoints';
import { fetcher, swrRealtimeConfig } from '../../config/swr.config';
import type { Device } from '../../schemas';

/**
 * Hook configuration options
 */
interface UseRealtimeDevicesOptions {
  /** Filter by device status */
  status?: 'online' | 'offline';
  /** Filter by registration status */
  registrationStatus?: 'registered' | 'pending';
  /** Enable/disable polling (default: true) */
  enabled?: boolean;
}

/**
 * Hook return value
 */
interface UseRealtimeDevicesReturn {
  /** Array of devices from Express API */
  devices: Device[];
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
 * Poll for real-time device data with SWR
 * Polls every 15 seconds for device list updates
 * 
 * For sensor readings, use a separate hook or call devicesService.getDeviceReadings()
 * 
 * @example
 * ```tsx
 * // Get all devices with real-time polling
 * const { devices, isLoading, error } = useRealtime_Devices();
 * 
 * // Get only registered online devices
 * const { devices } = useRealtime_Devices({ 
 *   status: 'online',
 *   registrationStatus: 'registered'
 * });
 * ```
 * 
 * @param options - Filter and configuration options
 * @returns Real-time device data, loading state, and error state
 */
export const useRealtime_Devices = (
  options: UseRealtimeDevicesOptions = {}
): UseRealtimeDevicesReturn => {
  const { status, registrationStatus, enabled = true } = options;

  // Build URL with filters
  const url = enabled
    ? buildDevicesUrl({ status, registrationStatus })
    : null;

  // Use SWR with polling (15 seconds for device list)
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    url,
    fetcher,
    {
      ...swrRealtimeConfig,
      // Poll every 15 seconds (less frequent than alerts)
      refreshInterval: enabled ? 15000 : 0,
    }
  );

  return {
    devices: data || [],
    isLoading,
    error,
    refetch: mutate,
    isValidating,
  };
};

export default useRealtime_Devices;
