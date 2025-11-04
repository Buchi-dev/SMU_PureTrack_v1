import { useState, useEffect } from 'react';
import { message } from 'antd';
import { deviceManagementService } from '../../../../services/deviceManagement.Service';
import type { Device } from '../../../../schemas';

export const useDeviceManagement = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await deviceManagementService.listDevices();
      setDevices(data);
    } catch (err) {
      message.error('Failed to load devices');
      console.error('Error loading devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  return {
    devices,
    loading,
    loadDevices,
  };
};
