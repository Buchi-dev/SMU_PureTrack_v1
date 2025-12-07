/**
 * System Health Calculator
 * Provides dynamic system health calculation based on Express Server, Devices, and Alerts
 * 
 * @module utils/systemHealthCalculator
 */

import type { WaterQualityAlert } from '../../../../schemas';
import { ALERT_STATUS, ALERT_SEVERITY } from '../../../../constants';

// ============================================================================
// TYPES
// ============================================================================

export interface SystemHealthResult {
  /** Overall system health score (0-100) */
  overallScore: number;
  /** Categorical status: Healthy, Degraded, or Unhealthy */
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
  /** Component breakdown */
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

export interface AlertScoreBreakdown {
  totalAlerts: number;
  scores: {
    alertId: string;
    score: number;
    reason: string;
  }[];
  averageScore: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Component weights for system health calculation
 * Total must equal 1.0 (100%)
 */
export const SYSTEM_HEALTH_WEIGHTS = {
  EXPRESS_SERVER: 0.6,  // 60% - Express server health (database, redis, memory, etc.)
  DEVICES: 0.2,         // 20% - Device connectivity
  ALERTS: 0.2,          // 20% - Alert severity
} as const;

/**
 * System health status thresholds
 */
export const SYSTEM_HEALTH_THRESHOLDS = {
  HEALTHY_MIN: 90,     // 90-100 = Healthy
  DEGRADED_MIN: 60,    // 60-89 = Degraded
  // Below 60 = Unhealthy
} as const;

/**
 * Alert scoring rules
 */
export const ALERT_SCORES = {
  // Status-based scores
  RESOLVED: 100,
  ACKNOWLEDGED: 60,
  
  // Active alert scores by severity
  ACTIVE_NORMAL: 100,
  ACTIVE_WARNING: 50,
  ACTIVE_CRITICAL: 0,
} as const;

// ============================================================================
// ALERT SCORE CALCULATION
// ============================================================================

/**
 * Calculate score for a single alert based on state and severity
 * 
 * Rules:
 * - Resolved = 100 (regardless of severity)
 * - Acknowledged = 60 (regardless of severity)
 * - Active + Normal (Advisory) = 100
 * - Active + Warning = 50
 * - Active + Critical = 0
 * 
 * @param alert - The alert to score
 * @returns Score (0-100) and reason
 */
export const calculateAlertScore = (alert: WaterQualityAlert): { score: number; reason: string } => {
  // Resolved alerts are fully healthy
  if (alert.status === 'Resolved') {
    return {
      score: ALERT_SCORES.RESOLVED,
      reason: 'Resolved',
    };
  }

  // Acknowledged alerts are partially healthy
  if (alert.status === ALERT_STATUS.ACKNOWLEDGED) {
    return {
      score: ALERT_SCORES.ACKNOWLEDGED,
      reason: 'Acknowledged',
    };
  }

  // Active alerts: score based on severity
  if (alert.status === ALERT_STATUS.UNACKNOWLEDGED) {
    switch (alert.severity) {
      case ALERT_SEVERITY.ADVISORY:
        return {
          score: ALERT_SCORES.ACTIVE_NORMAL,
          reason: 'Active + Advisory (Normal)',
        };
      case ALERT_SEVERITY.WARNING:
        return {
          score: ALERT_SCORES.ACTIVE_WARNING,
          reason: 'Active + Warning',
        };
      case 'Critical':
        return {
          score: ALERT_SCORES.ACTIVE_CRITICAL,
          reason: 'Active + Critical',
        };
      default:
        return {
          score: ALERT_SCORES.ACTIVE_NORMAL,
          reason: 'Active + Unknown Severity',
        };
    }
  }

  // Fallback for unknown status
  return {
    score: ALERT_SCORES.ACTIVE_NORMAL,
    reason: 'Unknown Status',
  };
};

/**
 * Calculate overall alert health score
 * 
 * Algorithm:
 * 1. Score each alert individually (0-100)
 * 2. Calculate average across all alerts
 * 3. Default to 100 if no alerts exist
 * 
 * @param alerts - Array of alerts to score
 * @returns Average alert score (0-100) and breakdown
 */
export const calculateAlertsHealthScore = (
  alerts: WaterQualityAlert[]
): { score: number; breakdown: AlertScoreBreakdown } => {
  // No alerts = perfect health
  if (alerts.length === 0) {
    return {
      score: 100,
      breakdown: {
        totalAlerts: 0,
        scores: [],
        averageScore: 100,
      },
    };
  }

  // Score each alert
  const scoredAlerts = alerts.map(alert => ({
    alertId: alert.alertId,
    ...calculateAlertScore(alert),
  }));

  // Calculate average
  const totalScore = scoredAlerts.reduce((sum, item) => sum + item.score, 0);
  const averageScore = Math.round(totalScore / alerts.length);

  return {
    score: averageScore,
    breakdown: {
      totalAlerts: alerts.length,
      scores: scoredAlerts,
      averageScore,
    },
  };
};

// ============================================================================
// DEVICE SCORE CALCULATION
// ============================================================================

/**
 * Calculate device health score based on online percentage
 * 
 * Algorithm:
 * - Score = (online devices / total devices) × 100
 * - Automatically adapts as devices are added/removed
 * - Returns 100 if no devices exist (no data = no problem)
 * 
 * @param onlineDevices - Number of online devices
 * @param totalDevices - Total number of devices
 * @returns Device health score (0-100)
 */
export const calculateDeviceHealthScore = (
  onlineDevices: number,
  totalDevices: number
): number => {
  // No devices = perfect health (nothing to monitor)
  if (totalDevices === 0) {
    return 100;
  }

  // Ensure non-negative values
  const online = Math.max(0, onlineDevices);
  const total = Math.max(1, totalDevices);

  // Calculate percentage
  const percentage = (online / total) * 100;

  // Round to whole number
  return Math.round(percentage);
};

// ============================================================================
// OVERALL SYSTEM HEALTH CALCULATION
// ============================================================================

/**
 * Calculate overall system health score
 * 
 * Formula:
 * SystemHealthScore = (0.6 × ServerScore) + (0.2 × DeviceScore) + (0.2 × AlertScore)
 * 
 * Status Mapping:
 * - 90-100: Healthy
 * - 60-89: Degraded
 * - 0-59: Unhealthy
 * 
 * @param serverScore - Express server health score (0-100) from health endpoint
 * @param onlineDevices - Number of online devices
 * @param totalDevices - Total number of devices
 * @param alerts - Array of all alerts
 * @returns Complete system health result with breakdown
 */
export const calculateSystemHealth = (
  serverScore: number,
  onlineDevices: number,
  totalDevices: number,
  alerts: WaterQualityAlert[]
): SystemHealthResult => {
  // 1. Clamp Express server score to valid range
  const serverScoreClamped = Math.max(0, Math.min(100, serverScore));

  // 2. Calculate device and alert scores
  const deviceScore = calculateDeviceHealthScore(onlineDevices, totalDevices);
  const { score: alertScore, breakdown: alertBreakdown } = calculateAlertsHealthScore(alerts);

  const deviceScoreClamped = Math.max(0, Math.min(100, deviceScore));
  const alertScoreClamped = Math.max(0, Math.min(100, alertScore));

  // 3. Calculate weighted contributions
  const serverContribution = serverScoreClamped * SYSTEM_HEALTH_WEIGHTS.EXPRESS_SERVER;
  const deviceContribution = deviceScoreClamped * SYSTEM_HEALTH_WEIGHTS.DEVICES;
  const alertContribution = alertScoreClamped * SYSTEM_HEALTH_WEIGHTS.ALERTS;

  // 4. Calculate total score
  const overallScore = Math.round(serverContribution + deviceContribution + alertContribution);

  // 5. Determine status based on thresholds
  let status: 'Healthy' | 'Degraded' | 'Unhealthy';
  if (overallScore >= SYSTEM_HEALTH_THRESHOLDS.HEALTHY_MIN) {
    status = 'Healthy';
  } else if (overallScore >= SYSTEM_HEALTH_THRESHOLDS.DEGRADED_MIN) {
    status = 'Degraded';
  } else {
    status = 'Unhealthy';
  }

  return {
    overallScore,
    status,
    components: {
      expressServer: {
        score: serverScoreClamped,
        weight: SYSTEM_HEALTH_WEIGHTS.EXPRESS_SERVER,
        contribution: Math.round(serverContribution),
      },
      devices: {
        score: deviceScoreClamped,
        weight: SYSTEM_HEALTH_WEIGHTS.DEVICES,
        contribution: Math.round(deviceContribution),
        online: onlineDevices,
        total: totalDevices,
      },
      alerts: {
        score: alertScoreClamped,
        weight: SYSTEM_HEALTH_WEIGHTS.ALERTS,
        contribution: Math.round(alertContribution),
        breakdown: alertBreakdown,
      },
    },
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color for system health status
 */
export const getSystemHealthColor = (status: 'Healthy' | 'Degraded' | 'Unhealthy'): string => {
  switch (status) {
    case 'Healthy':
      return '#52c41a'; // Green
    case 'Degraded':
      return '#faad14'; // Orange
    case 'Unhealthy':
      return '#ff4d4f'; // Red
    default:
      return '#d9d9d9'; // Gray
  }
};

/**
 * Get system health description
 */
export const getSystemHealthDescription = (status: 'Healthy' | 'Degraded' | 'Unhealthy'): string => {
  switch (status) {
    case 'Healthy':
      return 'All systems operating normally';
    case 'Degraded':
      return 'Some systems require attention';
    case 'Unhealthy':
      return 'Critical issues detected';
    default:
      return 'Unknown status';
  }
};
