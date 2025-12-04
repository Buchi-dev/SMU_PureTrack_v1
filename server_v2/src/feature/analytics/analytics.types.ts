/**
 * Analytics Types
 * Type definitions for analytics data
 */

/**
 * Analytics summary response
 */
export interface AnalyticsSummary {
  totalReadings: number;
  devicesActive: number;
  avgPh: number;
  avgTurbidity: number;
  avgTds: number;
  recentAlerts: number;
  lastUpdated: Date;
}

/**
 * Analytics trends response
 */
export interface AnalyticsTrends {
  ph: TrendData[];
  turbidity: TrendData[];
  tds: TrendData[];
}

export interface TrendData {
  timestamp: Date;
  value: number;
  deviceId?: string;
}

/**
 * Parameter statistics
 */
export interface ParameterStats {
  parameter: string;
  min: number;
  max: number;
  avg: number;
  count: number;
  unit: string;
}
