import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { deviceManagementService } from '../../../../services/deviceManagement.Service';
import type { Device } from '../../../../schemas';

interface UseDeviceManagementOptions {
  enableRealtime?: boolean; // Enable real-time sensor data updates
}

/**
 * Custom hook for managing devices in AdminDeviceManagement
 * 
 * Features:
 * - Fetches device list from Firestore
 * - Optional real-time sensor data subscriptions
 * - Automatic status updates (online/offline) when real-time is enabled
 * - Manual refresh capability
 * 
 * @param options - Configuration options
 * @param options.enableRealtime - Enable real-time sensor data updates (default: false)
 * 
 * @returns {Object} Device management state and actions
 * @returns {Device[]} devices - Array of all devices
 * @returns {boolean} loading - Loading state
 * @returns {Error | null} error - Error state if any
 * @returns {Function} loadDevices - Function to manually reload devices
 * 
 * @example
 * // Without real-time updates
 * const { devices, loading, loadDevices } = useDeviceManagement();
 * 
 * @example
 * // With real-time updates
 * const { devices, loading, loadDevices } = useDeviceManagement({ enableRealtime: true });
 */
export const useDeviceManagement = (options: UseDeviceManagementOptions = {}) => {
  const { enableRealtime = false } = options;
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load devices
  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deviceManagementService.listDevices();
      setDevices(data);
    } catch (err) {
      const errorMessage = 'Failed to load devices';
      message.error(errorMessage);
      console.error('Error loading devices:', err);
      setError(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Setup real-time sensor data subscriptions if enabled
  useEffect(() => {
    if (!enableRealtime || devices.length === 0) return;

    const deviceIds = devices.map((d) => d.deviceId);
    
    const unsubscribe = deviceManagementService.subscribeToMultipleDevices(
      deviceIds,
      (deviceId, reading) => {
        if (reading) {
          // Update device status to online when receiving data
          setDevices((prev) =>
            prev.map((device) =>
              device.deviceId === deviceId
                ? { ...device, status: 'online', lastSeen: { seconds: Date.now() / 1000 } as any }
                : device
            )
          );
        }
      },
      (deviceId, err) => {
        console.error(`Real-time error for device ${deviceId}:`, err);
        // Update device status to offline on error
        setDevices((prev) =>
          prev.map((device) =>
            device.deviceId === deviceId
              ? { ...device, status: 'offline' }
              : device
          )
        );
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, [enableRealtime, devices.length]); // Only re-subscribe when device count changes

  return {
    devices,
    loading,
    error,
    loadDevices,
  };
};
