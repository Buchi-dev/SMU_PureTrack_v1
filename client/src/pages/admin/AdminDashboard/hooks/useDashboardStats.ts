/**
 * useDashboardStats - Local UI Hook
 * 
 * Calculates statistics from device and alert data for dashboard display.
 * Pure UI logic - does NOT fetch data or call services.
 * 
 * ✅ LOCAL HOOK - UI-specific calculations only
 * ❌ NO service layer calls
 * ❌ NO real-time subscriptions
 * 
 * @module pages/admin/AdminDashboard/hooks
 */

import { useMemo } from 'react';
import type { DeviceWithSensorData } from '../../../../hooks';
import type { WaterQualityAlert } from '../../../../schemas';

/**
 * Device statistics
 */
export interface DeviceStats {
  /** Total number of devices */
  total: number;
  /** Number of online devices */
  online: number;
  /** Number of offline devices */
  offline: number;
  /** Number of devices with sensor readings */
  withReadings: number;
}

/**
 * Alert statistics
 */
export interface AlertStats {
  /** Total number of alerts */
  total: number;
  /** Number of active alerts */
  active: number;
  /** Number of critical alerts */
  critical: number;
  /** Number of warning alerts */
  warning: number;
  /** Number of advisory alerts */
  advisory: number;
  /** Number of acknowledged alerts */
  acknowledged: number;
  /** Number of resolved alerts */
  resolved: number;
}

/**
 * Calculate device statistics from device array
 * 
 * @param devices - Array of devices with sensor data
 * @returns Device statistics object
 * 
 * @example
 * ```tsx
 * const { deviceStats } = useDashboardStats(devices, alerts);
 * console.log(`${deviceStats.online}/${deviceStats.total} devices online`);
 * ```
 */
export const calculateDeviceStats = (devices: DeviceWithSensorData[]): DeviceStats => {
  return {
    total: devices.length,
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
    withReadings: devices.filter((d) => d.latestReading !== null).length,
  };
};

/**
 * Calculate alert statistics from alert array
 * 
 * @param alerts - Array of water quality alerts
 * @returns Alert statistics object
 * 
 * @example
 * ```tsx
 * const { alertStats } = useDashboardStats(devices, alerts);
 * console.log(`${alertStats.critical} critical alerts`);
 * ```
 */
export const calculateAlertStats = (alerts: WaterQualityAlert[]): AlertStats => {
  return {
    total: alerts.length,
    active: alerts.filter((a) => a.status === 'Active').length,
    critical: alerts.filter((a) => a.severity === 'Critical').length,
    warning: alerts.filter((a) => a.severity === 'Warning').length,
    advisory: alerts.filter((a) => a.severity === 'Advisory').length,
    acknowledged: alerts.filter((a) => a.status === 'Acknowledged').length,
    resolved: alerts.filter((a) => a.status === 'Resolved').length,
  };
};

/**
 * Calculate dashboard statistics from devices and alerts
 * 
 * Pure calculation hook - no side effects or data fetching.
 * Memoized for performance.
 * 
 * @param devices - Array of devices with sensor data
 * @param alerts - Array of water quality alerts
 * @returns Object containing device and alert statistics
 * 
 * @example
 * ```tsx
 * import { useDashboardStats } from './hooks/useDashboardStats';
 * import { useRealtime_Devices, useRealtime_Alerts } from '@/hooks';
 * 
 * const Dashboard = () => {
 *   const { devices } = useRealtime_Devices();
 *   const { alerts } = useRealtime_Alerts();
 *   const { deviceStats, alertStats } = useDashboardStats(devices, alerts);
 * 
 *   return (
 *     <div>
 *       <h2>Devices: {deviceStats.online}/{deviceStats.total} online</h2>
 *       <h2>Alerts: {alertStats.critical} critical</h2>
 *     </div>
 *   );
 * };
 * ```
 */
export const useDashboardStats = (
  devices: DeviceWithSensorData[],
  alerts: WaterQualityAlert[]
) => {
  const deviceStats = useMemo(() => calculateDeviceStats(devices), [devices]);
  const alertStats = useMemo(() => calculateAlertStats(alerts), [alerts]);

  return {
    deviceStats,
    alertStats,
  };
};
