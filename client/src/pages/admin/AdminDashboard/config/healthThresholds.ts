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
 * CPU usage thresholds
 * - < 50% = Healthy (Green)
 * - 50-69% = Good (Light Green)
 * - 70-84% = Warning (Orange)
 * - ≥ 85% = Critical (Red)
 */
export const CPU_THRESHOLDS = {
  HEALTHY_MAX: 50,
  GOOD_MAX: 69,
  WARNING_MAX: 84,
  CRITICAL_MIN: 85,
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
 * Calculate CPU health status based on usage percentage
 * @param cpuPercent - CPU usage as percentage (0-100)
 * @returns Health status and color
 */
export const getCpuHealth = (cpuPercent: number | null | undefined): {
  status: HealthStatus;
  color: string;
  displayPercent: number;
  statusText: string;
} => {
  if (cpuPercent === null || cpuPercent === undefined) {
    return { 
      status: 'unknown', 
      color: HEALTH_COLORS.UNKNOWN, 
      displayPercent: 0,
      statusText: 'Unknown'
    };
  }

  const percent = Math.min(Math.max(cpuPercent, 0), 100);
  
  if (percent < CPU_THRESHOLDS.HEALTHY_MAX) {
    return { 
      status: 'excellent', 
      color: HEALTH_COLORS.EXCELLENT, 
      displayPercent: percent,
      statusText: 'Excellent'
    };
  }
  if (percent <= CPU_THRESHOLDS.GOOD_MAX) {
    return { 
      status: 'good', 
      color: HEALTH_COLORS.GOOD, 
      displayPercent: percent,
      statusText: 'Good'
    };
  }
  if (percent <= CPU_THRESHOLDS.WARNING_MAX) {
    return { 
      status: 'warning', 
      color: HEALTH_COLORS.WARNING, 
      displayPercent: percent,
      statusText: 'High'
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
 * Calculate MQTT Bridge health score based on RSS memory and CPU usage
 * Uses RSS (Resident Set Size) instead of heap as it reflects actual RAM usage
 * 
 * @param rss - Resident Set Size in bytes (actual RAM used)
 * @param cpuPercent - Current CPU usage percentage
 * @param connected - Whether MQTT is connected
 * @param status - MQTT health status from server
 * @returns Health score (0-100) where higher is better
 */
export const calculateMqttBridgeHealthScore = (
  rss: number,
  cpuPercent: number,
  connected: boolean,
  status: 'healthy' | 'unhealthy' | 'degraded'
): number => {
  // If not connected, health is 0
  if (!connected) return 0;

  const RAM_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB Cloud Run limit
  
  // Calculate RSS percentage (actual memory usage)
  const rssPercent = Math.min(Math.round((rss / RAM_LIMIT_BYTES) * 100), 100);
  
  // Normalize CPU to 0-100 scale (already a percentage)
  const normalizedCpu = Math.min(Math.round(cpuPercent), 100);
  
  // Calculate composite resource usage (60% weight on memory, 40% on CPU)
  const avgResourceUsage = (rssPercent * 0.6) + (normalizedCpu * 0.4);
  
  // Invert to get health score (lower usage = better health)
  let resourceHealth = Math.max(0, 100 - avgResourceUsage);
  
  // If status is unhealthy, reduce score by 50%
  // If status is degraded, reduce score by 30%
  if (status === 'unhealthy') {
    resourceHealth = Math.round(resourceHealth * 0.5);
  } else if (status === 'degraded') {
    resourceHealth = Math.round(resourceHealth * 0.7);
  }
  
  return Math.round(resourceHealth);
};
