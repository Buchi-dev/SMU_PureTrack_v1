import { useCallback } from 'react';
import type { Device, SensorReading, DeviceWithReadings } from '../../../../schemas/deviceManagement.schema';
import type { WaterQualityAlert } from '../../../../schemas/alerts.schema';
import { ALERT_STATUS, ALERT_SEVERITY } from '../../../../constants';

/**
 * UI-specific hook for device severity calculation and sorting
 * 
 * ✅ ACCEPTABLE: Pure UI logic - NO service layer calls
 * - Calculates severity scores based on WHO guidelines
 * - Enriches device data with severity information
 * - Provides sorting utilities
 * 
 * @example
 * ```tsx
 * const { enrichDeviceWithSeverity } = useDeviceSeverityCalculator();
 * const enrichedDevices = devices.map(device => 
 *   enrichDeviceWithSeverity(device, alerts)
 * );
 * ```
 */
export const useDeviceSeverityCalculator = () => {
  /**
   * Calculate severity score based on readings and alerts
   * 
   * Scoring system:
   * - Base score: 100 for online devices, 0 for offline
   * - Critical alerts: +1000 per alert
   * - Warning alerts: +500 per alert
   * - Advisory alerts: +100 per alert
   * - Parameter violations: Additional points based on deviation
   * 
   * @param device - Device metadata
   * @param reading - Latest sensor reading
   * @param deviceAlerts - Active alerts for this device
   * @returns Severity score and level
   */
  const calculateSeverity = useCallback(
    (device: Device, reading: SensorReading | null, deviceAlerts: WaterQualityAlert[]): {
      score: number;
      level: 'critical' | 'warning' | 'normal' | 'offline';
    } => {
      // Offline devices get lowest priority
      if (device.status === 'offline' || !reading) {
        return { score: 0, level: 'offline' };
      }

      let score = 100; // Base score for online devices

      // Filter active alerts for this device
      const criticalAlerts = deviceAlerts.filter(
        (a) => a.deviceId === device.deviceId && a.severity === ALERT_SEVERITY.CRITICAL && a.status === ALERT_STATUS.UNACKNOWLEDGED
      );
      const warningAlerts = deviceAlerts.filter(
        (a) => a.deviceId === device.deviceId && a.severity === ALERT_SEVERITY.WARNING && a.status === ALERT_STATUS.UNACKNOWLEDGED
      );
      const advisoryAlerts = deviceAlerts.filter(
        (a) => a.deviceId === device.deviceId && a.severity === ALERT_SEVERITY.ADVISORY && a.status === ALERT_STATUS.UNACKNOWLEDGED
      );

      // Add alert-based scores
      score += criticalAlerts.length * 1000;
      score += warningAlerts.length * 500;
      score += advisoryAlerts.length * 100;

      // Check parameter thresholds (WHO guidelines)
      // pH: ideal range 6.5-8.5
      const phValue = reading.ph ?? 7.0;
      if (phValue < 6.5 || phValue > 8.5) {
        score += Math.abs(phValue - 7.0) * 50;
      }

      // TDS: ideal < 500 ppm
      const tdsValue = reading.tds ?? 0;
      if (tdsValue > 500) {
        score += (tdsValue - 500) * 0.5;
      }

      // Turbidity: ideal < 5 NTU
      const turbidityValue = reading.turbidity ?? 0;
      if (turbidityValue > 5) {
        score += (turbidityValue - 5) * 20;
      }

      // Determine severity level
      let level: 'critical' | 'warning' | 'normal' | 'offline';
      if (criticalAlerts.length > 0) {
        level = 'critical';
      } else if (warningAlerts.length > 0 || score > 300) {
        level = 'warning';
      } else {
        level = 'normal';
      }

      return { score, level };
    },
    []
  );

  /**
   * Enrich device with severity information
   * 
   * Combines device metadata from Firestore with sensor readings from RTDB
   * and calculates severity based on alerts and parameter thresholds.
   * 
   * @param deviceData - Device data from useDevices
   * @param allAlerts - All alerts from useAlerts
   * @returns Enriched device with severity information
   */
  const enrichDeviceWithSeverity = useCallback(
    (deviceData: Device, allAlerts: WaterQualityAlert[]): DeviceWithReadings => {
      // Find active alerts for this device
      const deviceAlerts = allAlerts.filter(
        (a) => a.deviceId === deviceData.deviceId && a.status === ALERT_STATUS.UNACKNOWLEDGED
      );

      // Device info is just the device data itself
      const deviceInfo: Device = deviceData;

      // Extract latestReading from deviceData (server includes it via aggregation)
      // Cast to any first to access the property that exists at runtime but not in the Device type
      const latestReading: SensorReading | null = (deviceData as any).latestReading || null;

      // Calculate severity
      const { score, level } = calculateSeverity(
        deviceInfo,
        latestReading,
        allAlerts
      );

      // Return enriched device
      return {
        ...deviceInfo,
        latestReading,
        activeAlerts: deviceAlerts,
        severityScore: score,
        severityLevel: level,
      };
    },
    [calculateSeverity]
  );

  /**
   * Sort devices by severity score (highest first)
   * 
   * @param devices - Array of enriched devices
   * @returns Sorted array (does not mutate original)
   */
  const sortBySeverity = useCallback(
    (devices: DeviceWithReadings[]): DeviceWithReadings[] => {
      return [...devices].sort((a, b) => b.severityScore - a.severityScore);
    },
    []
  );

  return {
    calculateSeverity,
    enrichDeviceWithSeverity,
    sortBySeverity,
  };
};
