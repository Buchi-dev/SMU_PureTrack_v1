/**
 * Threshold Helper Utilities
 * Functions for checking sensor thresholds and analyzing trends
 *
 * @module utils/thresholdHelpers
 *
 * Purpose: Centralize threshold checking logic for sensor data analysis
 * Used by: processSensorData, alertManagement
 */

import { logger } from "firebase-functions/v2";

import { rtdb, db } from "../config/firebase";
import type { WaterParameter, AlertSeverity, TrendDirection } from "../types/alertManagement.types";

/**
 * Parameter threshold configuration
 */
export interface ParameterThreshold {
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  unit: string;
}

/**
 * Alert threshold configuration
 */
export interface AlertThresholds {
  tds: ParameterThreshold;
  ph: ParameterThreshold;
  turbidity: ParameterThreshold;
  trendDetection: {
    enabled: boolean;
    thresholdPercentage: number;
    timeWindowMinutes: number;
  };
}

/**
 * Sensor reading interface
 */
export interface SensorReading {
  deviceId: string;
  turbidity: number;
  tds: number;
  ph: number;
  timestamp: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  receivedAt?: any;
}

/**
 * Default threshold configuration
 */
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  tds: {
    warningMin: 0,
    warningMax: 500,
    criticalMin: 0,
    criticalMax: 1000,
    unit: "ppm",
  },
  ph: {
    warningMin: 6.0,
    warningMax: 8.5,
    criticalMin: 5.5,
    criticalMax: 9.0,
    unit: "",
  },
  turbidity: {
    warningMin: 0,
    warningMax: 5,
    criticalMin: 0,
    criticalMax: 10,
    unit: "NTU",
  },
  trendDetection: {
    enabled: true,
    thresholdPercentage: 15,
    timeWindowMinutes: 30,
  },
};

/**
 * Get current threshold configuration from Firestore
 * Falls back to default thresholds if database query fails
 *
 * @example
 * const thresholds = await getThresholdConfig();
 * @return {Promise<ThresholdConfig>} Promise resolving to current threshold configuration
 * const tdsCritical = thresholds.tds.criticalMax; // 1000
 */
export async function getThresholdConfig(): Promise<AlertThresholds> {
  try {
    const configDoc = await db.collection("alertSettings").doc("thresholds").get();

    if (configDoc.exists) {
      const data = configDoc.data() as AlertThresholds;
      logger.info("Loaded threshold config from Firestore");
      return data;
    }
  } catch (error) {
    logger.warn("Failed to load threshold config, using defaults:", error);
  }

  return DEFAULT_THRESHOLDS;
}

/**
 * Threshold check result
 */
export interface ThresholdCheckResult {
  exceeded: boolean;
  severity: AlertSeverity | null;
  threshold: number | null;
}

/**
 * Check if sensor value exceeds configured thresholds
 *
 * Priority order:
 * 1. Critical max/min (highest priority)
 * 2. Warning max/min
 * 3. No violation
 *
 * @param {*} parameter - Water parameter to check
 * @param {*} value - Current sensor reading value
 * @param {*} thresholds - Threshold configuration
 * @return {ThresholdViolation} Threshold check result with severity and violated threshold
 *
 * @example
 * const result = checkThreshold('tds', 1200, thresholds);
 * if (result.exceeded) {
 *   console.log(`TDS exceeded ${result.severity} threshold: ${result.threshold}`);
 * }
 */
export function checkThreshold(
  parameter: WaterParameter,
  value: number,
  thresholds: AlertThresholds
): ThresholdCheckResult {
  const config = thresholds[parameter];

  // Check critical thresholds first (highest priority)
  if (config.criticalMax !== undefined && value > config.criticalMax) {
    return {
      exceeded: true,
      severity: "Critical",
      threshold: config.criticalMax,
    };
  }
  if (config.criticalMin !== undefined && value < config.criticalMin) {
    return {
      exceeded: true,
      severity: "Critical",
      threshold: config.criticalMin,
    };
  }

  // Check warning thresholds (medium priority)
  if (config.warningMax !== undefined && value > config.warningMax) {
    return {
      exceeded: true,
      severity: "Warning",
      threshold: config.warningMax,
    };
  }
  if (config.warningMin !== undefined && value < config.warningMin) {
    return {
      exceeded: true,
      severity: "Warning",
      threshold: config.warningMin,
    };
  }

  // No threshold violation
  return { exceeded: false, severity: null, threshold: null };
}

/**
 * Trend analysis result
 */
export interface TrendAnalysisResult {
  hasTrend: boolean;
  direction: TrendDirection;
  changeRate: number;
  previousValue: number;
}

/**
 * Analyze parameter trend over time window
 *
 * Algorithm:
 * 1. Query historical readings within time window
 * 2. Compare current value to oldest reading
 * 3. Calculate percentage change rate
 * 4. Determine if change exceeds threshold
 *
 * Requires:
 * - At least 2 historical readings
 * - Trend detection enabled in config
 *
 * @param {*} deviceId - Device ID to analyze
 * @param {*} parameter - Water parameter to check
 * @param {*} currentValue - Current sensor reading
 * @param {*} thresholds - Threshold configuration
 * @return {Promise<TrendAnalysisResult | null>} Promise resolving to trend analysis or null if insufficient data
 *
 * @example
 * const trend = await analyzeTrend('device123', 'ph', 8.5, thresholds);
 * if (trend?.hasTrend) {
 *   console.log(`pH ${trend.direction} by ${trend.changeRate}%`);
 * }
 */
export async function analyzeTrend(
  deviceId: string,
  parameter: WaterParameter,
  currentValue: number,
  thresholds: AlertThresholds
): Promise<TrendAnalysisResult | null> {
  // Check if trend detection is enabled
  if (!thresholds.trendDetection.enabled) {
    return null;
  }

  const timeWindow = thresholds.trendDetection.timeWindowMinutes;
  const thresholdPercentage = thresholds.trendDetection.thresholdPercentage;
  const windowStart = Date.now() - timeWindow * 60 * 1000;

  try {
    // Query historical readings from Realtime Database
    const snapshot = await rtdb
      .ref(`sensorReadings/${deviceId}/history`)
      .orderByChild("timestamp")
      .startAt(windowStart)
      .limitToLast(10)
      .once("value");

    if (!snapshot.exists()) {
      return null;
    }

    // Extract readings from snapshot
    const readings: SensorReading[] = [];
    snapshot.forEach((childSnapshot) => {
      readings.push(childSnapshot.val() as SensorReading);
    });

    // Need at least 2 readings for trend analysis
    if (readings.length < 2) {
      return null;
    }

    // Compare current value to first reading in window
    const firstReading = readings[0];
    const previousValue = firstReading[parameter];
    const changeRate = ((currentValue - previousValue) / previousValue) * 100;

    // Check if change rate exceeds threshold
    if (Math.abs(changeRate) >= thresholdPercentage) {
      return {
        hasTrend: true,
        direction: changeRate > 0 ? "increasing" : "decreasing",
        changeRate: Math.abs(changeRate),
        previousValue,
      };
    }
  } catch (error) {
    logger.error("Error analyzing trend:", error);
  }

  return null;
}

/**
 * Get unit string for water parameter
 *
 * @param {*} parameter - Water parameter
 * @example
 * getParameterUnit('tds')       // "ppm"
 * @return {string} Unit string (e.g., "ppm", "NTU", "")
 * getParameterUnit('turbidity') // "NTU"
 * getParameterUnit('ph')        // ""
 */
export function getParameterUnit(parameter: WaterParameter): string {
  switch (parameter) {
    case "tds":
      return "ppm";
    case "ph":
      return "";
    case "turbidity":
      return "NTU";
    default:
      return "";
  }
}

/**
 * Get display name for water parameter
 *
 * @param {*} parameter - Water parameter
 * @example
 * getParameterName('tds')       // "TDS (Total Dissolved Solids)"
 * @return {string} Human-readable parameter name
 * getParameterName('ph')        // "pH Level"
 * getParameterName('turbidity') // "Turbidity"
 */
export function getParameterName(parameter: WaterParameter): string {
  switch (parameter) {
    case "tds":
      return "TDS (Total Dissolved Solids)";
    case "ph":
      return "pH Level";
    case "turbidity":
      return "Turbidity";
    default:
      return parameter;
  }
}
