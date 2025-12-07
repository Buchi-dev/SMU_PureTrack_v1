/**
 * useAnalyticsStats - Local UI Hook
 * 
 * Calculates analytics statistics from real-time device, alert, and system health data.
 * Pure UI logic - does NOT fetch data or call services.
 * 
 * ✅ LOCAL HOOK - UI-specific calculations only
 * ❌ NO service layer calls
 * ❌ NO real-time subscriptions
 * 
 * @module pages/admin/AdminAnalytics/hooks
 */

import { useMemo } from 'react';
import type { DeviceWithReadings } from '../../../../schemas';
import type { WaterQualityAlert } from '../../../../schemas';
import type { SystemHealthMetrics } from '../../../../services/health.Service';
import { calculateSystemHealth, type AlertScoreBreakdown } from '../../AdminDashboard/utils';
import { HEALTH_COLORS } from '../../AdminDashboard/config';
import { ALERT_STATUS, ALERT_SEVERITY } from '../../../../constants';

/**
 * Device statistics
 */
export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  withReadings: number;
}

/**
 * Alert statistics
 */
export interface AlertStats {
  total: number;
  active: number;
  critical: number;
  warning: number;
  advisory: number;
  acknowledged: number;
  resolved: number;
}

/**
 * Water quality metrics
 */
export interface WaterQualityMetrics {
  totalReadings: number;
  averagePh: number;
  averageTds: number;
  averageTurbidity: number;
  phReadings: number[];
  tdsReadings: number[];
  turbidityReadings: number[];
  minPh: number;
  maxPh: number;
  minTds: number;
  maxTds: number;
  minTurbidity: number;
  maxTurbidity: number;
}

/**
 * System health summary for analytics
 */
export interface SystemHealthSummary {
  overallScore: number;
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
  color: string;
  components: {
    expressServer: {
      score: number;
      weight: number;
      contribution: number;
    };
    devices: {
      score: number;
      weight: number;
      contribution: number;
      online: number;
      total: number;
    };
    alerts: {
      score: number;
      weight: number;
      contribution: number;
      breakdown: AlertScoreBreakdown;
    };
  };
}

/**
 * Calculate device statistics
 */
const calculateDeviceStats = (devices: DeviceWithReadings[]): DeviceStats => {
  return {
    total: devices.length,
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
    withReadings: devices.filter((d) => d.latestReading !== null).length,
  };
};

/**
 * Calculate alert statistics
 * 
 * ⚠️ IMPORTANT: Critical/Warning/Advisory counts only include Active alerts
 * Resolved or Acknowledged alerts are NOT counted in severity stats
 */
const calculateAlertStats = (alerts: WaterQualityAlert[]): AlertStats => {
  return {
    total: alerts.length,
    active: alerts.filter((a) => a.status === ALERT_STATUS.UNACKNOWLEDGED).length,
    // Only count Active alerts by severity (exclude Resolved/Acknowledged)
    critical: alerts.filter((a) => a.status === ALERT_STATUS.UNACKNOWLEDGED && a.severity === ALERT_SEVERITY.CRITICAL).length,
    warning: alerts.filter((a) => a.status === ALERT_STATUS.UNACKNOWLEDGED && a.severity === ALERT_SEVERITY.WARNING).length,
    advisory: alerts.filter((a) => a.status === ALERT_STATUS.UNACKNOWLEDGED && a.severity === ALERT_SEVERITY.ADVISORY).length,
    acknowledged: alerts.filter((a) => a.status === ALERT_STATUS.ACKNOWLEDGED).length,
    resolved: alerts.filter((a) => a.status === ALERT_STATUS.RESOLVED).length,
  };
};

/**
 * Calculate water quality metrics from device readings
 */
const calculateWaterQualityMetrics = (devices: DeviceWithReadings[]): WaterQualityMetrics => {
  const phReadings: number[] = [];
  const tdsReadings: number[] = [];
  const turbidityReadings: number[] = [];
  let totalReadingDocuments = 0;

  devices.forEach(device => {
    if (device.latestReading) {
      // Count each device with a reading as one reading document
      totalReadingDocuments++;
      
      if (device.latestReading.ph !== undefined && device.latestReading.ph > 0) {
        phReadings.push(device.latestReading.ph);
      }
      if (device.latestReading.tds !== undefined && device.latestReading.tds > 0) {
        tdsReadings.push(device.latestReading.tds);
      }
      if (device.latestReading.turbidity !== undefined && device.latestReading.turbidity >= 0) {
        turbidityReadings.push(device.latestReading.turbidity);
      }
    }
  });

  const averagePh = phReadings.length > 0 
    ? phReadings.reduce((sum, val) => sum + val, 0) / phReadings.length 
    : 0;
  const averageTds = tdsReadings.length > 0 
    ? tdsReadings.reduce((sum, val) => sum + val, 0) / tdsReadings.length 
    : 0;
  const averageTurbidity = turbidityReadings.length > 0 
    ? turbidityReadings.reduce((sum, val) => sum + val, 0) / turbidityReadings.length 
    : 0;

  return {
    totalReadings: totalReadingDocuments, // Count of actual sensor reading documents, not individual parameters
    averagePh: parseFloat(averagePh.toFixed(2)),
    averageTds: parseFloat(averageTds.toFixed(2)),
    averageTurbidity: parseFloat(averageTurbidity.toFixed(2)),
    phReadings,
    tdsReadings,
    turbidityReadings,
    minPh: phReadings.length > 0 ? Math.min(...phReadings) : 0,
    maxPh: phReadings.length > 0 ? Math.max(...phReadings) : 0,
    minTds: tdsReadings.length > 0 ? Math.min(...tdsReadings) : 0,
    maxTds: tdsReadings.length > 0 ? Math.max(...tdsReadings) : 0,
    minTurbidity: turbidityReadings.length > 0 ? Math.min(...turbidityReadings) : 0,
    maxTurbidity: turbidityReadings.length > 0 ? Math.max(...turbidityReadings) : 0,
  };
};

/**
 * Calculate system health from Express server, devices, and alerts
 * Uses the same weighted calculation as AdminDashboard for consistency
 */
const calculateSystemHealthSummary = (
  devices: DeviceWithReadings[],
  alerts: WaterQualityAlert[],
  systemHealthData: SystemHealthMetrics | null
): SystemHealthSummary => {
  // Calculate Express server health score using weighted component scores
  // This matches the AdminDashboard OverallHealthCard calculation
  const serverScore = systemHealthData ? (() => {
    const cpuScore = systemHealthData.cpu.status === 'ok' ? 100 : 
                     systemHealthData.cpu.status === 'warning' ? 70 : 
                     systemHealthData.cpu.status === 'critical' ? 30 : 0;
    
    const memoryScore = systemHealthData.memory.status === 'ok' ? 100 : 
                        systemHealthData.memory.status === 'warning' ? 70 : 
                        systemHealthData.memory.status === 'critical' ? 30 : 0;
    
    const storageScore = systemHealthData.storage.status === 'ok' ? 100 : 
                         systemHealthData.storage.status === 'warning' ? 70 : 
                         systemHealthData.storage.status === 'critical' ? 30 : 0;
    
    const databaseScore = systemHealthData.database.connectionStatus === 'connected' ? 100 : 0;
    
    // Weighted average: CPU(30%), Memory(30%), Storage(20%), Database(20%)
    const weightedScore = (cpuScore * 0.3) + (memoryScore * 0.3) + (storageScore * 0.2) + (databaseScore * 0.2);
    
    return Math.round(weightedScore);
  })() : 0;

  // Calculate system health
  const deviceStats = calculateDeviceStats(devices);
  const healthResult = calculateSystemHealth(
    serverScore,
    deviceStats.online,
    deviceStats.total,
    alerts
  );

  // Determine color based on status
  const getHealthColor = (score: number): string => {
    if (score >= 90) return HEALTH_COLORS.EXCELLENT;
    if (score >= 60) return HEALTH_COLORS.GOOD;
    if (score >= 40) return HEALTH_COLORS.WARNING;
    return HEALTH_COLORS.CRITICAL;
  };
  
  const color = getHealthColor(healthResult.overallScore);

  return {
    ...healthResult,
    color,
  };
};

/**
 * Calculate WHO compliance status for water quality parameters
 */
const calculateComplianceStatus = (metrics: WaterQualityMetrics) => {
  const { phReadings, tdsReadings, turbidityReadings, minPh, maxPh, minTds, maxTds, minTurbidity, maxTurbidity, averagePh, averageTds, averageTurbidity } = metrics;

  const complianceStatus = [];

  // pH Compliance (WHO: 6.5-8.5)
  if (phReadings.length > 0) {
    const phCompliant = phReadings.filter(ph => ph >= 6.5 && ph <= 8.5).length;
    const phViolations = phReadings.length - phCompliant;
    const belowMin = phReadings.filter(ph => ph < 6.5).length;
    const aboveMax = phReadings.filter(ph => ph > 8.5).length;
    
    let violationType: 'below_min' | 'above_max' | 'both' | 'none' = 'none';
    if (belowMin > 0 && aboveMax > 0) violationType = 'both';
    else if (belowMin > 0) violationType = 'below_min';
    else if (aboveMax > 0) violationType = 'above_max';
    
    complianceStatus.push({
      parameter: 'ph' as const,
      compliant: phViolations === 0,
      compliancePercentage: (phCompliant / phReadings.length) * 100,
      violationCount: phViolations,
      threshold: { min: 6.5, max: 8.5 },
      currentValue: averagePh,
      minValue: minPh,
      maxValue: maxPh,
      violationType,
    });
  }

  // TDS Compliance (WHO: ≤ 500 ppm)
  if (tdsReadings.length > 0) {
    const tdsCompliant = tdsReadings.filter(tds => tds <= 500).length;
    const tdsViolations = tdsReadings.length - tdsCompliant;
    const aboveMax = tdsReadings.filter(tds => tds > 500).length;
    
    complianceStatus.push({
      parameter: 'tds' as const,
      compliant: tdsViolations === 0,
      compliancePercentage: (tdsCompliant / tdsReadings.length) * 100,
      violationCount: tdsViolations,
      threshold: { max: 500 },
      currentValue: averageTds,
      minValue: minTds,
      maxValue: maxTds,
      violationType: aboveMax > 0 ? 'above_max' as const : 'none' as const,
    });
  }

  // Turbidity Compliance (WHO: ≤ 5 NTU)
  if (turbidityReadings.length > 0) {
    const turbidityCompliant = turbidityReadings.filter(t => t <= 5).length;
    const turbidityViolations = turbidityReadings.length - turbidityCompliant;
    const aboveMax = turbidityReadings.filter(t => t > 5).length;
    
    complianceStatus.push({
      parameter: 'turbidity' as const,
      compliant: turbidityViolations === 0,
      compliancePercentage: (turbidityCompliant / turbidityReadings.length) * 100,
      violationCount: turbidityViolations,
      threshold: { max: 5 },
      currentValue: averageTurbidity,
      minValue: minTurbidity,
      maxValue: maxTurbidity,
      violationType: aboveMax > 0 ? 'above_max' as const : 'none' as const,
    });
  }

  return complianceStatus;
};

/**
 * Calculate device performance metrics
 */
const calculateDevicePerformance = (devices: DeviceWithReadings[], alerts: WaterQualityAlert[]) => {
  return devices.map(device => {
    const deviceAlerts = alerts.filter(a => a.deviceId === device.deviceId);
    
    // Calculate quality score based on readings compliance
    let qualityScore = 100;
    if (device.latestReading) {
      const { ph, tds, turbidity } = device.latestReading;
      
      // pH penalty (WHO: 6.5-8.5)
      const phValue = ph ?? 7.0;
      if (phValue < 6.5 || phValue > 8.5) {
        qualityScore -= 30;
      } else if (phValue < 6.8 || phValue > 8.2) {
        qualityScore -= 10;
      }
      
      // TDS penalty (WHO: ≤ 500 ppm)
      const tdsValue = tds ?? 0;
      if (tdsValue > 500) {
        qualityScore -= 30;
      } else if (tdsValue > 400) {
        qualityScore -= 10;
      }
      
      // Turbidity penalty (WHO: ≤ 5 NTU)
      const turbidityValue = turbidity ?? 0;
      if (turbidityValue > 5) {
        qualityScore -= 30;
      } else if (turbidityValue > 4) {
        qualityScore -= 10;
      }

      // Alert penalty
      qualityScore -= Math.min(deviceAlerts.length * 5, 20);
    } else {
      qualityScore = 0; // No readings
    }

    const uptimePercentage = device.status === 'online' ? 95 : 20; // Simplified for now
    
    // Get location string - metadata is a flexible record type
    const metadata = device.metadata as Record<string, { building?: string; floor?: string | number }> | undefined;
    const location = metadata?.location 
      ? `${metadata.location.building} - Floor ${metadata.location.floor}`
      : undefined;

    return {
      deviceId: device.deviceId,
      deviceName: device.name || `Device ${device.deviceId}`,
      location,
      uptimePercentage,
      totalReadings: 1, // Would need historical data
      avgPh: device.latestReading?.ph || 0,
      avgTds: device.latestReading?.tds || 0,
      avgTurbidity: device.latestReading?.turbidity || 0,
      alertCount: deviceAlerts.length,
      lastSeen: device.latestReading?.timestamp || Date.now(),
      qualityScore: Math.max(0, qualityScore),
    };
  });
};

/**
 * Calculate aggregated metrics for historical trends
 */
const calculateAggregatedMetrics = (devices: DeviceWithReadings[]) => {
  // For now, create a simple aggregation from current readings
  // In a real scenario, this would aggregate historical data by time periods
  if (devices.length === 0) return [];

  const metrics = calculateWaterQualityMetrics(devices);
  
  return [{
    period: new Date().toISOString().split('T')[0],
    avgPh: metrics.averagePh,
    avgTds: metrics.averageTds,
    avgTurbidity: metrics.averageTurbidity,
    minPh: metrics.minPh,
    maxPh: metrics.maxPh,
    minTds: metrics.minTds,
    maxTds: metrics.maxTds,
    minTurbidity: metrics.minTurbidity,
    maxTurbidity: metrics.maxTurbidity,
    readingCount: metrics.totalReadings,
    devicesCount: devices.length,
  }];
};

/**
 * Calculate analytics statistics from real-time data
 * 
 * Pure calculation hook - no side effects or data fetching.
 * Memoized for performance.
 * 
 * @param devices - Array of devices with sensor data (enriched with readings)
 * @param alerts - Array of water quality alerts
 * @param systemHealthData - Express server health data from /health endpoint
 * @returns Object containing all analytics statistics
 * 
 * @example
 * ```tsx
 * const { 
 *   deviceStats, 
 *   alertStats,
 *   waterQualityMetrics,
 *   systemHealth,
 *   complianceStatus,
 *   devicePerformance,
 *   aggregatedMetrics,
 * } = useAnalyticsStats(devices, alerts, systemHealthData);
 * ```
 */
export const useAnalyticsStats = (
  devices: DeviceWithReadings[],
  alerts: WaterQualityAlert[],
  systemHealthData: SystemHealthMetrics | null
) => {
  const deviceStats = useMemo(() => calculateDeviceStats(devices), [devices]);
  const alertStats = useMemo(() => calculateAlertStats(alerts), [alerts]);
  const waterQualityMetrics = useMemo(() => calculateWaterQualityMetrics(devices), [devices]);
  const systemHealth = useMemo(
    () => calculateSystemHealthSummary(devices, alerts, systemHealthData),
    [devices, alerts, systemHealthData]
  );
  const complianceStatus = useMemo(() => calculateComplianceStatus(waterQualityMetrics), [waterQualityMetrics]);
  const devicePerformance = useMemo(() => calculateDevicePerformance(devices, alerts), [devices, alerts]);
  const aggregatedMetrics = useMemo(() => calculateAggregatedMetrics(devices), [devices]);

  return {
    deviceStats,
    alertStats,
    waterQualityMetrics,
    systemHealth,
    complianceStatus,
    devicePerformance,
    aggregatedMetrics,
  };
};
