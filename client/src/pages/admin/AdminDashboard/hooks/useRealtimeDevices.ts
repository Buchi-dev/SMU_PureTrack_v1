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

// REMOVED: READING_TIMEOUT_MS and POLL_INTERVAL
// We trust Firestore's device status as the single source of truth
// The frontend no longer overrides Firestore status based on reading delays

export const useRealtimeDevices = () => {
  const [devices, setDevices] = useState<RealtimeDeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const unsubscribersRef = useRef<Map<string, () => void>>(new Map());
  const isActiveRef = useRef(true);
  const lastValidDevicesRef = useRef<RealtimeDeviceData[]>([]); // Cache last valid state
  const isInitialLoadRef = useRef(true); // Track initial load vs refresh

  // Fetch initial devices list
  const fetchDevices = useCallback(async () => {
    try {
      // Only show loading on initial load, not on refresh
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
        lastValidDevicesRef.current = initialData; // Update cache
        setLastUpdate(new Date());
      }
      
      return devicesList;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch devices');
      if (isActiveRef.current) {
        setError(error);
        // On error, keep displaying cached data instead of clearing it
        if (lastValidDevicesRef.current.length > 0) {
          console.warn('Using cached device data due to fetch error');
        }
      }
      throw error;
    } finally {
      if (isActiveRef.current) {
        setLoading(false);
        isInitialLoadRef.current = false; // Mark initial load complete
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
              
              // FIXED: Only update reading and timestamp, NOT online status
              // Online status comes from Firestore device.status only
              return {
                ...d,
                latestReading: reading || d.latestReading, // Preserve last reading if null
                // isOnline: Keep existing status from Firestore, don't override
                lastUpdateTime: reading ? now : d.lastUpdateTime, // Only update if valid reading
              };
            }
            return d;
          });
          
          // Update cache with latest data
          lastValidDevicesRef.current = updated;
          return updated;
        });
        
        setLastUpdate(new Date());
      },
      (err) => {
        console.error(`Error subscribing to device ${deviceId}:`, err);
        // Don't clear device data on subscription errors
      }
    );
    
    unsubscribersRef.current.set(deviceId, unsubscribe);
  }, []);

  // Unsubscribe from all devices
  const unsubscribeAll = useCallback(() => {
    unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribersRef.current.clear();
  }, []);

  // Manual refresh function - doesn't clear existing data
  const refresh = useCallback(async () => {
    // Don't unsubscribe during refresh to maintain data flow
    try {
      await fetchDevices();
    } catch (err) {
      console.error('Refresh failed, maintaining current state:', err);
      // Keep current subscriptions and data on error
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
        
        // REMOVED: Stale reading checker interval
        // We no longer override Firestore's device status based on reading timeouts
        
      } catch (err) {
        console.error('Failed to initialize real-time devices:', err);
      }
    };
    
    init();
    
    return () => {
      isActiveRef.current = false;
      unsubscribeAll();
      
      // REMOVED: pollTimeoutRef cleanup - no longer needed
    };
  }, [fetchDevices, subscribeToDevice, unsubscribeAll]);

  // Statistics - ALWAYS use the most reliable data source
  // Priority: current devices > cached devices > empty array
  const statsSource = devices.length > 0 ? devices : 
                      lastValidDevicesRef.current.length > 0 ? lastValidDevicesRef.current : 
                      [];
  
  const stats = {
    total: statsSource.length,
    online: statsSource.filter(d => d.isOnline).length,
    offline: statsSource.filter(d => !d.isOnline).length,
    withReadings: statsSource.filter(d => d.latestReading !== null).length,
  };

  // DEFENSIVE: Return cached devices if current is empty (prevents UI zeros)
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
