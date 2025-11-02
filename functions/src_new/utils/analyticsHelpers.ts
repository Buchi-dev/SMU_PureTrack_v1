/**
 * Analytics Helpers
 * Utility functions for generating analytics reports
 * 
 * @module utils/analyticsHelpers
 */

import {db, rtdb} from "../config/firebase";
import {COLLECTIONS} from "../constants";
import type {Device, SensorReading, WaterQualityAlert} from "../types";

/**
 * Calculate device uptime percentage
 * 
 * @param lastSeenTimestamp - Last seen timestamp in milliseconds
 * @param periodMs - Time period to calculate uptime for (in milliseconds)
 * @returns Uptime percentage (0-100)
 */
export function calculateUptime(lastSeenTimestamp: number, periodMs: number = 24 * 60 * 60 * 1000): number {
  if (!lastSeenTimestamp || lastSeenTimestamp === 0) {
    return 0;
  }

  const now = Date.now();
  const timeSinceLastSeen = now - lastSeenTimestamp;

  // If device was seen within the period, calculate uptime
  if (timeSinceLastSeen < periodMs) {
    return Math.min(100, Math.round(((periodMs - timeSinceLastSeen) / periodMs) * 100));
  }

  // Device hasn't been seen in the entire period
  return 0;
}

/**
 * Format uptime as human-readable string
 * 
 * @param lastSeenTimestamp - Last seen timestamp in milliseconds
 * @returns Formatted uptime string
 */
export function formatUptime(lastSeenTimestamp: number): string {
  if (!lastSeenTimestamp || lastSeenTimestamp === 0) {
    return "Never seen";
  }

  const now = Date.now();
  const diff = now - lastSeenTimestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ago`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return "Just now";
  }
}

/**
 * Device summary for analytics reports
 */
export interface DeviceSummary {
  deviceId: string;
  name: string;
  type?: string;
  location?: {
    building?: string;
    floor?: string;
    notes?: string;
  };
  status: string;
  lastSeen: number;
  connectivity: string;
  uptime: number;
  latestReading?: {
    ph?: number;
    tds?: number;
    turbidity?: number;
    timestamp: number;
  };
}

/**
 * Device status report
 */
export interface DeviceStatusReport {
  summary: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    healthScore: number;
  };
  devices: DeviceSummary[];
}

/**
 * Alert counts by severity
 */
export interface AlertCounts {
  Critical: number;
  Warning: number;
  Advisory: number;
  total: number;
}

/**
 * Generate device status report
 * 
 * @returns Promise<DeviceStatusReport>
 */
export async function generateDeviceStatusReport(): Promise<DeviceStatusReport> {
  const devicesSnapshot = await db.collection(COLLECTIONS.DEVICES).get();

  const statusSummary: Record<string, number> = {
    online: 0,
    offline: 0,
    error: 0,
    maintenance: 0,
  };

  const devices: DeviceSummary[] = [];

  for (const doc of devicesSnapshot.docs) {
    const data = doc.data() as Device;
    const status = data.status || "offline";
    
    const lastSeenTimestamp = data.lastSeen?.toMillis?.() || 0;
    const isActive = Date.now() - lastSeenTimestamp < 5 * 60 * 1000; // 5 minutes

    // Update status based on activity
    const actualStatus = isActive ? status : "offline";
    statusSummary[actualStatus]++;

    // Get latest sensor reading
    let latestReading: DeviceSummary["latestReading"] | undefined;
    try {
      const readingSnapshot = await rtdb
        .ref(`sensorReadings/${data.deviceId}/latestReading`)
        .once("value");

      if (readingSnapshot.exists()) {
        const reading = readingSnapshot.val();
        latestReading = {
          ph: reading.ph,
          tds: reading.tds,
          turbidity: reading.turbidity,
          timestamp: reading.timestamp || Date.now(),
        };
      }
    } catch (error) {
      // Skip if reading fails
    }

    devices.push({
      deviceId: data.deviceId,
      name: data.name,
      type: data.type,
      location: data.metadata?.location,
      status: actualStatus,
      lastSeen: lastSeenTimestamp,
      connectivity: isActive ? "active" : "inactive",
      uptime: calculateUptime(lastSeenTimestamp),
      latestReading,
    });
  }

  const healthScore =
    devices.length > 0 ? Math.round((statusSummary.online / devices.length) * 100) : 0;

  return {
    summary: {
      totalDevices: devices.length,
      onlineDevices: statusSummary.online,
      offlineDevices: statusSummary.offline,
      healthScore,
    },
    devices,
  };
}

/**
 * Get alert counts for a time period
 * 
 * @param startTime - Start timestamp in milliseconds
 * @param endTime - End timestamp in milliseconds
 * @returns Promise<AlertCounts>
 */
export async function getAlertCounts(startTime: number, endTime: number): Promise<AlertCounts> {
  const alertsSnapshot = await db
    .collection(COLLECTIONS.ALERTS)
    .where("createdAt", ">=", new Date(startTime))
    .where("createdAt", "<=", new Date(endTime))
    .get();

  const counts: AlertCounts = {
    Critical: 0,
    Warning: 0,
    Advisory: 0,
    total: 0,
  };

  alertsSnapshot.docs.forEach((doc) => {
    const alert = doc.data() as WaterQualityAlert;
    const severity = alert.severity;

    if (severity === "Critical" || severity === "Warning" || severity === "Advisory") {
      counts[severity]++;
      counts.total++;
    }
  });

  return counts;
}

/**
 * Get recent alerts for a time period
 * 
 * @param startTime - Start timestamp in milliseconds
 * @param limit - Maximum number of alerts to return
 * @returns Promise<WaterQualityAlert[]>
 */
export async function getRecentAlerts(startTime: number, limit: number = 20): Promise<WaterQualityAlert[]> {
  const alertsSnapshot = await db
    .collection(COLLECTIONS.ALERTS)
    .where("createdAt", ">=", new Date(startTime))
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return alertsSnapshot.docs.map((doc) => ({
    ...doc.data(),
    alertId: doc.id, // Ensure alertId is set from document ID
  } as WaterQualityAlert));
}

/**
 * Calculate parameter statistics
 * 
 * @param readings - Array of sensor readings
 * @param parameter - Parameter to calculate stats for ('ph', 'tds', 'turbidity')
 * @returns Statistics object
 */
export function calculateParameterStats(
  readings: SensorReading[],
  parameter: "ph" | "tds" | "turbidity"
): {
  min: number;
  max: number;
  avg: number;
  count: number;
} {
  if (readings.length === 0) {
    return {min: 0, max: 0, avg: 0, count: 0};
  }

  const values = readings
    .map((r) => r[parameter])
    .filter((v): v is number => v !== undefined && v !== null && !isNaN(v));

  if (values.length === 0) {
    return {min: 0, max: 0, avg: 0, count: 0};
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const avg = sum / values.length;

  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    avg: Number(avg.toFixed(2)),
    count: values.length,
  };
}

/**
 * Get device readings for a time period
 * 
 * @param deviceId - Device ID
 * @param startTime - Start timestamp in milliseconds
 * @param endTime - End timestamp in milliseconds
 * @returns Promise<SensorReading[]>
 */
export async function getDeviceReadings(
  deviceId: string,
  startTime: number,
  endTime: number
): Promise<SensorReading[]> {
  try {
    const snapshot = await rtdb
      .ref(`sensorReadings/${deviceId}/history`)
      .orderByChild("timestamp")
      .startAt(startTime)
      .endAt(endTime)
      .once("value");

    if (!snapshot.exists()) {
      return [];
    }

    const readings: SensorReading[] = [];
    snapshot.forEach((childSnapshot) => {
      readings.push(childSnapshot.val() as SensorReading);
    });

    return readings;
  } catch (error) {
    console.error(`Error fetching readings for device ${deviceId}:`, error);
    return [];
  }
}
