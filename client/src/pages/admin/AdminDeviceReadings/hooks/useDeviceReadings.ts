import { useState, useEffect } from 'react';
import { message } from 'antd';
import { deviceManagementService } from '../../../../services/deviceManagement.Service';
import type { Device, SensorReading } from '../../../../schemas';

export const useDeviceReadings = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load devices on mount
  useEffect(() => {
    const loadDevices = async () => {
      setLoading(true);
      try {
        const data = await deviceManagementService.listDevices();
        setDevices(data);
        
        // Auto-select first online device
        const firstOnlineDevice = data.find(d => d.status === 'online');
        if (firstOnlineDevice) {
          setSelectedDeviceId(firstOnlineDevice.deviceId);
        }
      } catch (error) {
        message.error('Failed to load devices');
        console.error('Error loading devices:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, []);

  // Setup real-time sensor data subscriptions
  useEffect(() => {
    if (!selectedDeviceId) {
      setLatestReading(null);
      setSensorHistory([]);
      return;
    }

    // Subscribe to latest readings
    const unsubscribeReadings = deviceManagementService.subscribeToSensorReadings(
      selectedDeviceId,
      (reading) => {
        setLatestReading(reading);
        setLastUpdated(new Date());
      },
      (error) => {
        console.error('Error loading sensor readings:', error);
        message.error('Failed to load sensor readings');
      }
    );

    // Subscribe to historical data
    const unsubscribeHistory = deviceManagementService.subscribeToSensorHistory(
      selectedDeviceId,
      setSensorHistory,
      (error) => {
        console.error('Error loading sensor history:', error);
        message.error('Failed to load sensor history');
      },
      50
    );

    return () => {
      unsubscribeReadings();
      unsubscribeHistory();
    };
  }, [selectedDeviceId]);

  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);

  return {
    devices,
    selectedDeviceId,
    selectedDevice,
    latestReading,
    sensorHistory,
    loading,
    lastUpdated,
    setSelectedDeviceId,
  };
};
