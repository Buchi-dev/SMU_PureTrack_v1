import { useState, useEffect, useCallback, useRef } from 'react';
import { deviceManagementService } from '../../../../services/deviceManagement.Service';
import type { Device, SensorReading } from '../../../../schemas';
import { dataFlowLogger, DataSource, FlowLayer } from '../../../../utils/dataFlowLogger';

export interface RealtimeDeviceData {
  device: Device;
  latestReading: SensorReading | null;
  isOnline: boolean;
  lastUpdateTime: Date | null;
}

export const useRealtimeDevices = () => {
  const [devices, setDevices] = useState<RealtimeDeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());
  const isActiveRef = useRef(true);
  const lastValidDevicesRef = useRef<RealtimeDeviceData[]>([]);
  const isInitialLoadRef = useRef(true);

  // Fetch devices list from Firestore
  const fetchDevices = useCallback(async () => {
    try {
      if (isInitialLoadRef.current) {
        setLoading(true);
      }
      setError(null);
      
      const devicesList = await deviceManagementService.listDevices();
      
      // Preserve existing readings when updating device list
      const previousDevicesMap = new Map(
        lastValidDevicesRef.current.map(d => [d.device.deviceId, d])
      );
      
      // Initialize device data, preserving readings from cache
      const initialData: RealtimeDeviceData[] = devicesList.map(device => {
        const cached = previousDevicesMap.get(device.deviceId);
        return {
          device,
          latestReading: cached?.latestReading || null,
          isOnline: cached?.isOnline ?? (device.status === 'online'),
          lastUpdateTime: cached?.lastUpdateTime || null,
        };
      });
      
      if (isActiveRef.current) {
        setDevices(initialData);
        lastValidDevicesRef.current = initialData;
        setLastUpdate(new Date());
      }
      
      return devicesList;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch devices');
      if (isActiveRef.current) {
        setError(error);
        // Keep displaying cached data on error
        if (lastValidDevicesRef.current.length > 0) {
          console.warn('Using cached device data due to fetch error');
        }
      }
      throw error;
    } finally {
      if (isActiveRef.current) {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    }
  }, []);

  // Subscribe to sensor readings for a device
  const subscribeToDevice = useCallback((deviceId: string) => {
    const unsubscribe = deviceManagementService.subscribeToSensorReadings(
      deviceId,
      (reading) => {
        if (!isActiveRef.current) return;
        
        dataFlowLogger.log(
          DataSource.RTDB,
          FlowLayer.HOOK,
          `Device ${deviceId}: Reading update`,
          { reading: reading ? 'valid' : 'null' }
        );
        
        setDevices(prev => {
          const updated = prev.map(d => {
            if (d.device.deviceId === deviceId) {
              const now = new Date();
              
              // Update reading and timestamp, preserve Firestore device status
              return {
                ...d,
                latestReading: reading || d.latestReading,
                lastUpdateTime: reading ? now : d.lastUpdateTime,
              };
            }
            return d;
          });
          
          lastValidDevicesRef.current = updated;
          return updated;
        });
        
        setLastUpdate(new Date());
      },
      (err) => {
        console.error(`Error subscribing to device ${deviceId}:`, err);
      }
    );
    
    unsubscribersRef.current.set(deviceId, unsubscribe);
  }, []);

  // Unsubscribe from all devices
  const unsubscribeAll = useCallback(() => {
    unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribersRef.current.clear();
  }, []);

  // Manual refresh function
  const refresh = useCallback(async () => {
    try {
      await fetchDevices();
    } catch (err) {
      console.error('Refresh failed, maintaining current state:', err);
    }
  }, [fetchDevices]);

  // Initialize and setup subscriptions
  useEffect(() => {
    isActiveRef.current = true;
    
    const init = async () => {
      try {
        const devicesList = await fetchDevices();
        
        // Subscribe to all devices
        devicesList.forEach(device => {
          subscribeToDevice(device.deviceId);
        });
      } catch (err) {
        console.error('Failed to initialize real-time devices:', err);
      }
    };
    
    init();
    
    return () => {
      isActiveRef.current = false;
      unsubscribeAll();
    };
  }, [fetchDevices, subscribeToDevice, unsubscribeAll]);

  // Calculate statistics from current or cached devices
  const statsSource = devices.length > 0 ? devices : lastValidDevicesRef.current;
  
  const stats = {
    total: statsSource.length,
    online: statsSource.filter(d => d.isOnline).length,
    offline: statsSource.filter(d => !d.isOnline).length,
    withReadings: statsSource.filter(d => d.latestReading !== null).length,
  };

  // Return cached devices as fallback
  const safeDevices = devices.length > 0 ? devices : lastValidDevicesRef.current;

  return {
    devices: safeDevices,
    loading,
    error,
    lastUpdate,
    refresh,
    stats,
  };
};
