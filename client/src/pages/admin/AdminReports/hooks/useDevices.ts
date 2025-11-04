import { useState, useEffect } from 'react';
import { message } from 'antd';
import { deviceManagementService } from '../../../../services/deviceManagement.Service';
import type { Device } from '../../../../schemas';

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await deviceManagementService.listDevices();
      setDevices(data);
    } catch (error) {
      message.error('Failed to load devices');
      console.error('Error loading devices:', error);
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
