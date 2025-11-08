/**
 * SINGLE SOURCE OF TRUTH FOR ALL HEALTH STATUS THRESHOLDS
 * 
 * This file defines all health thresholds used across the Admin Dashboard.
 * All components MUST import and use these thresholds to ensure consistency.
 * 
 * Last Updated: 2025-11-08
 */

// ============================================================================
// COLOR DEFINITIONS
// ============================================================================

export const HEALTH_COLORS = {
  EXCELLENT: '#52c41a',  // Green - Everything is optimal
  GOOD: '#95de64',       // Light Green - Good health
  WARNING: '#faad14',    // Orange - Warning state
  CRITICAL: '#fa8c16',   // Dark Orange - Critical warning
  ERROR: '#ff4d4f',      // Red - Error/Failure state
  UNKNOWN: '#d9d9d9',    // Gray - No data or unknown
  INFO: '#1890ff',       // Blue - Informational
} as const;

// ============================================================================
// THRESHOLD RANGES (Percentages)
// ============================================================================

/**
 * Memory usage thresholds (applies to Heap and RSS)
 * - < 60% = Healthy (Green)
 * - 60-84% = Warning (Orange)
 * - ≥ 85% = Critical (Red)
 */
export const MEMORY_THRESHOLDS = {
  HEALTHY_MAX: 60,      // Below this is healthy
  WARNING_MAX: 84,      // Between HEALTHY_MAX and this is warning
  CRITICAL_MIN: 85,     // At or above this is critical
} as const;

/**
 * Buffer utilization thresholds
 * - < 50% = Healthy (Green)
 * - 50-79% = Warning (Orange)
 * - ≥ 80% = Critical (Red)
 */
export const BUFFER_THRESHOLDS = {
  HEALTHY_MAX: 50,
  WARNING_MAX: 79,
  CRITICAL_MIN: 80,
} as const;

/**
 * Device health thresholds (% of devices online)
 * - 100% = Perfect (All Online)
 * - 80-99% = Healthy (Green)
 * - 50-79% = Degraded (Orange)
 * - < 50% = Critical (Red)
 */
export const DEVICE_THRESHOLDS = {
  PERFECT: 100,
  HEALTHY_MIN: 80,
  DEGRADED_MIN: 50,
} as const;

/**
 * Overall system health score thresholds
 * - ≥ 80% = Excellent (Green)
 * - 60-79% = Good (Light Green/Orange)
 * - 40-59% = Fair (Dark Orange)
 * - < 40% = Poor (Red)
 */
export const OVERALL_HEALTH_THRESHOLDS = {
  EXCELLENT_MIN: 80,
  GOOD_MIN: 60,
  FAIR_MIN: 40,
} as const;

/**
 * Success rate thresholds (for MQTT message processing)
 * - ≥ 95% = Excellent (Green)
 * - 80-94% = Warning (Orange)
 * - < 80% = Critical (Red)
 */
export const SUCCESS_RATE_THRESHOLDS = {
  EXCELLENT_MIN: 95,
  WARNING_MIN: 80,
} as const;

// ============================================================================
// HEALTH STATUS CALCULATORS
// ============================================================================

export type HealthStatus = 'excellent' | 'good' | 'warning' | 'critical' | 'error' | 'unknown';

/**
 * Calculate memory health status based on usage percentage
 * @param usagePercent - Memory usage as percentage (0-100)
 * @returns Health status and color
 */
export const getMemoryHealth = (usagePercent: number | null | undefined): { 
  status: HealthStatus; 
  color: string;
  displayPercent: number;
} => {
  if (usagePercent === null || usagePercent === undefined) {
    return { status: 'unknown', color: HEALTH_COLORS.UNKNOWN, displayPercent: 0 };
  }

  const percent = Math.min(Math.max(usagePercent, 0), 100);
  
  if (percent < MEMORY_THRESHOLDS.HEALTHY_MAX) {
    return { status: 'excellent', color: HEALTH_COLORS.EXCELLENT, displayPercent: percent };
  }
  if (percent <= MEMORY_THRESHOLDS.WARNING_MAX) {
    return { status: 'warning', color: HEALTH_COLORS.WARNING, displayPercent: percent };
  }
  return { status: 'critical', color: HEALTH_COLORS.ERROR, displayPercent: percent };
};

/**
 * Calculate buffer health status based on utilization percentage
 * @param utilizationPercent - Buffer utilization as percentage (0-100)
 * @returns Health status and color
 */
export const getBufferHealth = (utilizationPercent: number | null | undefined): {
  status: HealthStatus;
  color: string;
  displayPercent: number;
} => {
  if (utilizationPercent === null || utilizationPercent === undefined) {
    return { status: 'unknown', color: HEALTH_COLORS.UNKNOWN, displayPercent: 0 };
  }

  const percent = Math.min(Math.max(utilizationPercent, 0), 100);
  
  if (percent < BUFFER_THRESHOLDS.HEALTHY_MAX) {
    return { status: 'excellent', color: HEALTH_COLORS.EXCELLENT, displayPercent: percent };
  }
  if (percent <= BUFFER_THRESHOLDS.WARNING_MAX) {
    return { status: 'warning', color: HEALTH_COLORS.WARNING, displayPercent: percent };
  }
  return { status: 'critical', color: HEALTH_COLORS.ERROR, displayPercent: percent };
};

/**
 * Calculate device health based on online percentage
 * @param onlinePercent - Percentage of devices online (0-100)
 * @param hasDevices - Whether there are any devices
 * @returns Health status, color, and display text
 */
export const getDeviceHealth = (
  onlinePercent: number | null | undefined,
  hasDevices: boolean = true
): {
  status: HealthStatus;
  color: string;
  displayPercent: number;
  statusText: string;
} => {
  if (!hasDevices) {
    return { 
      status: 'unknown', 
      color: HEALTH_COLORS.UNKNOWN, 
      displayPercent: 0,
      statusText: 'No Devices'
    };
  }

  if (onlinePercent === null || onlinePercent === undefined) {
    return { 
      status: 'unknown', 
      color: HEALTH_COLORS.UNKNOWN, 
      displayPercent: 0,
      statusText: 'Unknown'
    };
  }

  const percent = Math.min(Math.max(onlinePercent, 0), 100);
  
  if (percent === DEVICE_THRESHOLDS.PERFECT) {
    return { 
      status: 'excellent', 
      color: HEALTH_COLORS.EXCELLENT, 
      displayPercent: percent,
      statusText: 'All Online'
    };
  }
  if (percent >= DEVICE_THRESHOLDS.HEALTHY_MIN) {
    return { 
      status: 'good', 
      color: HEALTH_COLORS.EXCELLENT, 
      displayPercent: percent,
      statusText: 'Healthy'
    };
  }
  if (percent >= DEVICE_THRESHOLDS.DEGRADED_MIN) {
    return { 
      status: 'warning', 
      color: HEALTH_COLORS.WARNING, 
      displayPercent: percent,
      statusText: 'Degraded'
    };
  }
  return { 
    status: 'critical', 
    color: HEALTH_COLORS.ERROR, 
    displayPercent: percent,
    statusText: 'Critical'
  };
};

/**
 * Calculate overall system health score
 * @param healthPercent - Overall health percentage (0-100)
 * @returns Health status, color, and status text
 */
export const getOverallHealth = (healthPercent: number | null | undefined): {
  status: HealthStatus;
  color: string;
  displayPercent: number;
  statusText: string;
} => {
  if (healthPercent === null || healthPercent === undefined) {
    return { 
      status: 'unknown', 
      color: HEALTH_COLORS.UNKNOWN, 
      displayPercent: 0,
      statusText: 'Unknown'
    };
  }

  const percent = Math.min(Math.max(healthPercent, 0), 100);
  
  if (percent >= OVERALL_HEALTH_THRESHOLDS.EXCELLENT_MIN) {
    return { 
      status: 'excellent', 
      color: HEALTH_COLORS.EXCELLENT, 
      displayPercent: percent,
      statusText: 'Excellent'
    };
  }
  if (percent >= OVERALL_HEALTH_THRESHOLDS.GOOD_MIN) {
    return { 
      status: 'good', 
      color: HEALTH_COLORS.GOOD, 
      displayPercent: percent,
      statusText: 'Good'
    };
  }
  if (percent >= OVERALL_HEALTH_THRESHOLDS.FAIR_MIN) {
    return { 
      status: 'warning', 
      color: HEALTH_COLORS.CRITICAL, 
      displayPercent: percent,
      statusText: 'Fair'
    };
  }
  return { 
    status: 'critical', 
    color: HEALTH_COLORS.ERROR, 
    displayPercent: percent,
    statusText: 'Poor'
  };
};

/**
 * Calculate success rate health
 * @param successPercent - Success rate percentage (0-100)
 * @returns Health status and color
 */
export const getSuccessRateHealth = (successPercent: number | null | undefined): {
  status: HealthStatus;
  color: string;
  displayPercent: number;
} => {
  if (successPercent === null || successPercent === undefined) {
    return { status: 'unknown', color: HEALTH_COLORS.UNKNOWN, displayPercent: 0 };
  }

  const percent = Math.min(Math.max(successPercent, 0), 100);
  
  if (percent >= SUCCESS_RATE_THRESHOLDS.EXCELLENT_MIN) {
    return { status: 'excellent', color: HEALTH_COLORS.EXCELLENT, displayPercent: percent };
  }
  if (percent >= SUCCESS_RATE_THRESHOLDS.WARNING_MIN) {
    return { status: 'warning', color: HEALTH_COLORS.WARNING, displayPercent: percent };
  }
  return { status: 'critical', color: HEALTH_COLORS.ERROR, displayPercent: percent };
};

/**
 * Get Progress component status based on health status
 */
export const getProgressStatus = (status: HealthStatus): 'success' | 'normal' | 'exception' => {
  switch (status) {
    case 'excellent':
    case 'good':
      return 'success';
    case 'warning':
      return 'normal';
    case 'critical':
    case 'error':
      return 'exception';
    default:
      return 'normal';
  }
};

// ============================================================================
// MQTT BRIDGE SPECIFIC HEALTH
// ============================================================================

/**
 * Calculate MQTT Bridge health score based on memory usage
 * This is a composite score considering both heap and RSS memory
 * 
 * @param heapUsed - Heap memory used in bytes
 * @param heapTotal - Total heap memory in bytes
 * @param rss - Resident Set Size in bytes
 * @param connected - Whether MQTT is connected
 * @param status - MQTT health status from server
 * @returns Health score (0-100) where higher is better
 */
export const calculateMqttBridgeHealthScore = (
  heapUsed: number,
  heapTotal: number,
  rss: number,
  connected: boolean,
  status: 'healthy' | 'unhealthy'
): number => {
  // If not connected, health is 0
  if (!connected) return 0;

  const RAM_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB Cloud Run limit
  
  // Calculate usage percentages
  const heapPercent = Math.min(Math.round((heapUsed / heapTotal) * 100), 100);
  const rssPercent = Math.min(Math.round((rss / RAM_LIMIT_BYTES) * 100), 100);
  
  // Average memory usage
  const avgMemoryUsage = (heapPercent + rssPercent) / 2;
  
  // Invert to get health score (lower usage = better health)
  let memoryHealth = Math.max(0, 100 - avgMemoryUsage);
  
  // If status is unhealthy, reduce score by 50%
  if (status !== 'healthy') {
    memoryHealth = Math.round(memoryHealth * 0.5);
  }
  
  return Math.round(memoryHealth);
};

/**
 * Calculate RAM health score (inverted - lower usage is better)
 * @param usedBytes - RAM used in bytes
 * @param totalBytes - Total RAM in bytes
 * @returns Health score (0-100) where higher is better
 */
export const calculateRAMHealthScore = (usedBytes: number, totalBytes: number): number => {
  if (totalBytes === 0) return 100;
  
  const usedPercent = Math.min(Math.round((usedBytes / totalBytes) * 100), 100);
  
  // Invert the percentage - lower RAM usage = better health score
  return Math.max(0, 100 - usedPercent);
};

// ============================================================================
// ALERT HEALTH CALCULATION
// ============================================================================

/**
 * Calculate alert health based on active alerts
 * Critical alerts = 0% health
 * Otherwise, health decreases with more active alerts
 * 
 * @param total - Total number of alerts
 * @param active - Number of active alerts
 * @param critical - Number of critical alerts
 * @returns Health score (0-100)
 */
export const calculateAlertHealthScore = (
  total: number,
  active: number,
  critical: number
): number => {
  if (total === 0) return 100; // No alerts = perfect health
  if (critical > 0) return 0;  // Any critical alerts = 0% health
  
  // Health decreases proportionally to active alerts
  return Math.max(0, 100 - Math.round((active / total) * 100));
};

// ============================================================================
// COMPOSITE HEALTH CALCULATION
// ============================================================================

/**
 * Calculate overall system health with weighted components
 * 
 * Weights:
 * - Device Health: 30%
 * - Alert Health: 30%
 * - MQTT Bridge: 25%
 * - RAM Usage: 15%
 * 
 * @returns Overall health score (0-100)
 */
export const calculateOverallSystemHealth = (
  deviceHealthScore: number,
  alertHealthScore: number,
  mqttHealthScore: number,
  ramHealthScore: number
): number => {
  const weighted = (
    (deviceHealthScore * 0.30) +
    (alertHealthScore * 0.30) +
    (mqttHealthScore * 0.25) +
    (ramHealthScore * 0.15)
  );
  
  return Math.round(weighted);
};
