import { useState, useEffect } from 'react';
import { deviceManagementService } from '../services/deviceManagement.Service';
import type { DeviceSensorData } from '../pages/admin/AdminDashboard/components';

/**
 * Custom hook to fetch devices and setup real-time sensor data listeners
 * Uses deviceManagementService for centralized data access
 * 
 * IMPORTANT: Device status comes from Firestore only.
 * RTDB subscriptions update latestReading but NOT device status.
 */
export const useDevices = () => {
  const [devices, setDevices] = useState<DeviceSensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribeAll: (() => void) | null = null;

    const initDevices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // READ: Fetch device list directly from Firestore
        const devicesData = await deviceManagementService.listDevices();
        
        const formattedDevices: DeviceSensorData[] = devicesData.map((device) => ({
          deviceId: device.deviceId,
          deviceName: device.name || device.deviceId,
          latestReading: null,
          status: device.status || 'offline',
          location: device.metadata?.location
            ? `${device.metadata.location.building || ''}, ${device.metadata.location.floor || ''}`
            : undefined,
        }));

        setDevices(formattedDevices);

        // READ: Subscribe to real-time sensor readings (direct RTDB access)
        if (formattedDevices.length > 0) {
          const deviceIds = formattedDevices.map((d) => d.deviceId);
          unsubscribeAll = deviceManagementService.subscribeToMultipleDevices(
            deviceIds,
            (deviceId, reading) => {
              if (reading) {
                // ✅ Update sensor reading but keep Firestore status as source of truth
                setDevices((prev) =>
                  prev.map((d) =>
                    d.deviceId === deviceId
                      ? { ...d, latestReading: reading }
                      : d
                  )
                );
              }
            },
            (deviceId, err) => {
              console.error(`Error with device ${deviceId}:`, err);
            }
          );
        }
      } catch (err) {
        console.error('Error fetching devices:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch devices'));
      } finally {
        setLoading(false);
      }
    };

    initDevices();

    return () => unsubscribeAll?.();
  }, []);

  return { devices, loading, error };
};
