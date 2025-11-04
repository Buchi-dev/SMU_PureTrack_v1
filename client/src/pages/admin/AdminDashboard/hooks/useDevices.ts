import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { deviceManagementService } from '../../../../services/deviceManagement.Service';
import type { DeviceSensorData } from '../components';

/**
 * Custom hook to fetch devices and setup real-time sensor data listeners
 */
export const useDevices = () => {
  const [devices, setDevices] = useState<DeviceSensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const rtdb = getDatabase();

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
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
        setError(null);

        // Set up real-time listeners for each device
        formattedDevices.forEach((device) => {
          const sensorRef = ref(rtdb, `sensorReadings/${device.deviceId}/latestReading`);
          onValue(sensorRef, (snapshot) => {
            const reading = snapshot.val();
            if (reading) {
              setDevices((prev) =>
                prev.map((d) =>
                  d.deviceId === device.deviceId
                    ? { ...d, latestReading: reading, status: 'online' }
                    : d
                )
              );
            }
          });
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching devices:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch devices'));
        setLoading(false);
      }
    };

    fetchDevices();

    return () => {
      // Clean up RTDB listeners
      devices.forEach((device) => {
        const sensorRef = ref(rtdb, `sensorReadings/${device.deviceId}/latestReading`);
        off(sensorRef);
      });
    };
  }, [rtdb]);

  return { devices, loading, error };
};
