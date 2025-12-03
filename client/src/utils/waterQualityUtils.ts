/**
 * Water Quality Utility Functions
 * Centralized logic for water quality calculations and status determination
 */

import type { SensorReading } from '../schemas';

/**
 * Water quality thresholds based on WHO guidelines
 */
export const WATER_QUALITY_THRESHOLDS = {
  pH: {
    min: 6.5,
    max: 8.5,
    critical_min: 6.0,
    critical_max: 9.0,
  },
  turbidity: {
    warning: 5,
    critical: 10,
  },
  tds: {
    warning: 500,
    critical: 1000,
  },
} as const;

/**
 * Device status type
 */
export type DeviceStatusType = 'online' | 'offline' | 'warning';

/**
 * Reading status type
 */
export type ReadingStatusType = 'normal' | 'warning' | 'critical';

/**
 * Calculate device status based on sensor readings
 * @param deviceStatus - Device connection status
 * @param reading - Latest sensor reading
 * @returns Device status ('online', 'offline', or 'warning')
 */
export function calculateDeviceStatus(
  deviceStatus: string,
  reading: SensorReading | null | undefined
): DeviceStatusType {
  // Debug logging
  if (import.meta.env.DEV) {
    console.log('[calculateDeviceStatus] Input:', {
      deviceStatus,
      hasReading: !!reading,
      reading: reading ? {
        ph: reading.ph,
        turbidity: reading.turbidity,
        tds: reading.tds,
        timestamp: reading.timestamp,
      } : null,
    });
  }

  // Check if device is actually online (case-insensitive)
  const isOnline = deviceStatus?.toLowerCase() === 'online';
  
  if (!isOnline || !reading) {
    if (import.meta.env.DEV) {
      console.log('[calculateDeviceStatus] Device offline:', {
        isOnline,
        hasReading: !!reading,
        deviceStatus,
      });
    }
    return 'offline';
  }

  const hasPhWarning =
    reading.ph &&
    (reading.ph < WATER_QUALITY_THRESHOLDS.pH.min ||
      reading.ph > WATER_QUALITY_THRESHOLDS.pH.max);

  const hasTurbidityWarning =
    reading.turbidity &&
    reading.turbidity > WATER_QUALITY_THRESHOLDS.turbidity.warning;

  const hasTdsWarning =
    reading.tds && reading.tds > WATER_QUALITY_THRESHOLDS.tds.warning;

  if (hasPhWarning || hasTurbidityWarning || hasTdsWarning) {
    if (import.meta.env.DEV) {
      console.log('[calculateDeviceStatus] Device has warnings:', {
        hasPhWarning,
        hasTurbidityWarning,
        hasTdsWarning,
      });
    }
    return 'warning';
  }

  if (import.meta.env.DEV) {
    console.log('[calculateDeviceStatus] Device online and normal');
  }
  return 'online';
}

/**
 * Calculate reading status based on water quality parameters
 * @param reading - Sensor reading
 * @returns Reading status ('normal', 'warning', or 'critical')
 */
export function calculateReadingStatus(
  reading: SensorReading | null | undefined
): ReadingStatusType {
  if (!reading) return 'normal';

  let status: ReadingStatusType = 'normal';

  // Check pH levels
  if (reading.ph) {
    if (
      reading.ph < WATER_QUALITY_THRESHOLDS.pH.critical_min ||
      reading.ph > WATER_QUALITY_THRESHOLDS.pH.critical_max
    ) {
      status = 'critical';
    } else if (
      reading.ph < WATER_QUALITY_THRESHOLDS.pH.min ||
      reading.ph > WATER_QUALITY_THRESHOLDS.pH.max
    ) {
      if (status === 'normal') status = 'warning';
    }
  }

  // Check turbidity
  if (reading.turbidity) {
    if (reading.turbidity > WATER_QUALITY_THRESHOLDS.turbidity.critical) {
      status = 'critical';
    } else if (
      reading.turbidity > WATER_QUALITY_THRESHOLDS.turbidity.warning &&
      status === 'normal'
    ) {
      status = 'warning';
    }
  }

  // Check TDS
  if (reading.tds) {
    if (reading.tds > WATER_QUALITY_THRESHOLDS.tds.critical) {
      status = 'critical';
    } else if (
      reading.tds > WATER_QUALITY_THRESHOLDS.tds.warning &&
      status === 'normal'
    ) {
      status = 'warning';
    }
  }

  return status;
}

/**
 * Check if a reading parameter is within normal range
 * @param parameter - Parameter name
 * @param value - Parameter value
 * @returns True if within normal range
 */
export function isParameterNormal(
  parameter: 'ph' | 'turbidity' | 'tds',
  value: number
): boolean {
  switch (parameter) {
    case 'ph':
      return (
        value >= WATER_QUALITY_THRESHOLDS.pH.min &&
        value <= WATER_QUALITY_THRESHOLDS.pH.max
      );
    case 'turbidity':
      return value <= WATER_QUALITY_THRESHOLDS.turbidity.warning;
    case 'tds':
      return value <= WATER_QUALITY_THRESHOLDS.tds.warning;
    default:
      return true;
  }
}
