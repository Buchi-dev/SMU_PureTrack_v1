/**
 * Device Status Utility
 * 
 * Single source of truth for device status calculation.
 * Centralizes heartbeat monitoring and offline detection logic.
 * 
 * Eliminates duplication across:
 * - waterQualityUtils.calculateDeviceStatus()
 * - Component-level status checks
 * - Page-level lastSeen/timestamp computations
 * 
 * @module utils/deviceStatus
 */

import type { Device, SensorReading } from '../schemas';
import { SENSOR_THRESHOLDS } from '../constants/waterQuality.constants';

/**
 * Device Offline Threshold
 * Time in milliseconds before device is considered offline
 * Matches V2 backend threshold (10 minutes)
 */
export const DEVICE_OFFLINE_THRESHOLD = 10 * 60 * 1000; // 10 minutes

/**
 * Warning threshold for lastSeen
 * Time in milliseconds before device shows warning status
 */
export const DEVICE_WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Device UI Status Type
 * Extended status for UI display including warning state
 */
export type DeviceUIStatus = 'online' | 'offline' | 'warning';

/**
 * Device Status Result
 * Computed status with metadata for UI display
 */
export interface DeviceStatusResult {
  /** UI display status */
  uiStatus: DeviceUIStatus;
  /** Human-readable status reason */
  statusReason: string;
  /** Whether device has recent data */
  hasRecentData: boolean;
  /** Whether sensor readings indicate quality issues */
  hasQualityWarnings: boolean;
  /** Milliseconds since last activity */
  lastSeenMs: number | null;
}

/**
 * Calculate comprehensive device status
 * 
 * Logic priority:
 * 1. Backend device.status === 'offline' → offline
 * 2. No recent activity (lastSeen or reading timestamp > threshold) → offline/warning
 * 3. Recent activity + quality issues → warning
 * 4. Recent activity + no issues → online
 * 
 * @param device - Device object with status, lastSeen, latestReading
 * @returns Computed device status with metadata
 * 
 * @example
 * ```ts
 * const statusResult = calculateDeviceUIStatus(device);
 * if (statusResult.uiStatus === 'offline') {
 *   showOfflineAlert(statusResult.statusReason);
 * }
 * ```
 */
export function calculateDeviceUIStatus(
  device: Pick<Device, 'status' | 'lastSeen' | 'deviceId'> & { latestReading?: SensorReading | null }
): DeviceStatusResult {
  const now = Date.now();
  
  // Default result structure
  const result: DeviceStatusResult = {
    uiStatus: 'offline',
    statusReason: 'Unknown',
    hasRecentData: false,
    hasQualityWarnings: false,
    lastSeenMs: null,
  };

  // Priority 1: Backend reports offline
  if (device.status === 'offline') {
    result.uiStatus = 'offline';
    result.statusReason = 'Device reported as offline by backend';
    return result;
  }

  // Determine last activity timestamp
  let lastActivityTimestamp: number | null = null;
  
  // Check latestReading timestamp
  if (device.latestReading?.timestamp) {
    const readingTime = typeof device.latestReading.timestamp === 'number'
      ? device.latestReading.timestamp
      : device.latestReading.timestamp instanceof Date
      ? device.latestReading.timestamp.getTime()
      : typeof (device.latestReading.timestamp as any).seconds === 'number'
      ? (device.latestReading.timestamp as any).seconds * 1000
      : null;
    
    if (readingTime) {
      lastActivityTimestamp = readingTime;
    }
  }
  
  // Check lastSeen timestamp (fallback if no reading timestamp)
  if (!lastActivityTimestamp && device.lastSeen) {
    const lastSeenTime = typeof device.lastSeen === 'number'
      ? device.lastSeen
      : device.lastSeen instanceof Date
      ? device.lastSeen.getTime()
      : typeof (device.lastSeen as any).seconds === 'number'
      ? (device.lastSeen as any).seconds * 1000
      : null;
    
    if (lastSeenTime) {
      lastActivityTimestamp = lastSeenTime;
    }
  }

  // Priority 2: Check activity freshness
  if (!lastActivityTimestamp) {
    result.uiStatus = 'offline';
    result.statusReason = 'No activity timestamp available';
    result.lastSeenMs = null;
    return result;
  }

  const timeSinceActivity = now - lastActivityTimestamp;
  result.lastSeenMs = timeSinceActivity;

  // Offline if no activity beyond threshold
  if (timeSinceActivity > DEVICE_OFFLINE_THRESHOLD) {
    result.uiStatus = 'offline';
    result.statusReason = `No activity for ${Math.round(timeSinceActivity / 60000)} minutes`;
    result.hasRecentData = false;
    return result;
  }

  // Warning if approaching offline threshold
  if (timeSinceActivity > DEVICE_WARNING_THRESHOLD) {
    result.uiStatus = 'warning';
    result.statusReason = `Last activity ${Math.round(timeSinceActivity / 60000)} minutes ago`;
    result.hasRecentData = true;
  } else {
    // Recent activity - device is online
    result.uiStatus = 'online';
    result.statusReason = 'Device active';
    result.hasRecentData = true;
  }

  // Priority 3: Check for water quality warnings
  if (device.latestReading && result.hasRecentData) {
    const reading = device.latestReading;
    const hasQualityIssues = checkWaterQualityWarnings(reading);
    
    if (hasQualityIssues) {
      result.hasQualityWarnings = true;
      // Upgrade to warning if currently online
      if (result.uiStatus === 'online') {
        result.uiStatus = 'warning';
        result.statusReason = 'Water quality parameters out of range';
      }
    }
  }

  return result;
}

/**
 * Check if sensor readings indicate water quality warnings
 * 
 * @param reading - Sensor reading to check
 * @returns true if any parameters exceed warning thresholds
 */
function checkWaterQualityWarnings(reading: SensorReading): boolean {
  // Check pH levels (min/max are the warning thresholds)
  if (reading.pH !== undefined && reading.pH > 0) {
    if (
      reading.pH < SENSOR_THRESHOLDS.pH.min ||
      reading.pH > SENSOR_THRESHOLDS.pH.max
    ) {
      return true;
    }
  }

  // Fallback to lowercase ph if pH not present
  if (reading.ph !== undefined && reading.ph > 0) {
    if (
      reading.ph < SENSOR_THRESHOLDS.pH.min ||
      reading.ph > SENSOR_THRESHOLDS.pH.max
    ) {
      return true;
    }
  }

  // Check turbidity
  if (
    reading.turbidity !== undefined &&
    reading.turbidity > SENSOR_THRESHOLDS.turbidity.warning
  ) {
    return true;
  }

  // Check TDS
  if (
    reading.tds !== undefined &&
    reading.tds > SENSOR_THRESHOLDS.tds.warning
  ) {
    return true;
  }

  return false;
}

/**
 * Get a simple UI status string (for compatibility)
 * 
 * @param device - Device object
 * @returns 'online', 'offline', or 'warning'
 */
export function getDeviceUIStatus(
  device: Pick<Device, 'status' | 'lastSeen' | 'deviceId'> & { latestReading?: SensorReading | null }
): DeviceUIStatus {
  return calculateDeviceUIStatus(device).uiStatus;
}

/**
 * Format last seen time for display
 * 
 * @param lastSeenMs - Milliseconds since last activity
 * @returns Human-readable string
 */
export function formatLastSeen(lastSeenMs: number | null): string {
  if (lastSeenMs === null) return 'Never';
  
  const minutes = Math.floor(lastSeenMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}
