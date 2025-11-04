import { useMemo } from 'react';
import type { WaterQualityAlert } from '../../../../schemas';
import type { DeviceSensorData } from '../components';

/**
 * Custom hook to calculate dashboard statistics
 */
export const useDashboardStats = (
  devices: DeviceSensorData[],
  alerts: WaterQualityAlert[]
) => {
  return useMemo(() => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter((d) => d.status === 'online').length;
    const activeAlerts = alerts.filter((a) => a.status === 'Active').length;
    const criticalAlerts = alerts.filter(
      (a) => a.severity === 'Critical' && a.status === 'Active'
    ).length;

    return {
      totalDevices,
      onlineDevices,
      activeAlerts,
      criticalAlerts,
    };
  }, [devices, alerts]);
};
