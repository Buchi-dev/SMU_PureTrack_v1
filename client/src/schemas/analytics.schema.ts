/**
 * Analytics Schema
 * TypeScript interfaces and types for analytics operations
 * 
 * @module schemas/analytics
 */

import { z } from 'zod';

// Note: Analytics uses lowercase parameter names ('ph', 'tds', 'turbidity') for aggregation
// This differs from alert schemas which use capitalized names ('pH', 'TDS', 'Turbidity')
// The difference is intentional - analytics aggregates raw sensor data

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Time period types for aggregation (analytics-specific)
 */
export const AggregationPeriodSchema = z.enum(['hour', 'day', 'week', 'month']);

/**
 * Analytics metric types
 */
export const MetricTypeSchema = z.enum(['ph', 'tds', 'turbidity', 'quality_score', 'alert_count']);

/**
 * Trend direction (analytics-specific with 'unknown' state)
 */
export const AnalyticsTrendDirectionSchema = z.enum(['increasing', 'decreasing', 'stable', 'unknown']);

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Date Range Filter Schema
 */
export const DateRangeFilterSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

/**
 * Historical Sensor Data Schema
 */
export const HistoricalSensorDataSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  location: z.string().optional(),
  readings: z.array(z.any()), // SensorReading from deviceManagement.schema
});

/**
 * Aggregated Metrics Schema
 */
export const AggregatedMetricsSchema = z.object({
  period: z.string(),
  avgPh: z.number(),
  avgTds: z.number(),
  avgTurbidity: z.number(),
  minPh: z.number(),
  maxPh: z.number(),
  minTds: z.number(),
  maxTds: z.number(),
  minTurbidity: z.number(),
  maxTurbidity: z.number(),
  readingCount: z.number(),
  devicesCount: z.number(),
});

/**
 * Time Series Data Point Schema
 */
export const TimeSeriesDataPointSchema = z.object({
  timestamp: z.number(),
  date: z.string(),
  ph: z.number(),
  tds: z.number(),
  turbidity: z.number(),
  deviceId: z.string(),
  deviceName: z.string(),
});

/**
 * Alert Statistics Schema
 */
export const AlertStatisticsSchema = z.object({
  period: z.string(),
  totalAlerts: z.number(),
  criticalAlerts: z.number(),
  warningAlerts: z.number(),
  advisoryAlerts: z.number(),
  resolvedAlerts: z.number(),
  avgResolutionTime: z.number(),
});

/**
 * Device Performance Metrics Schema
 */
export const DevicePerformanceMetricsSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  location: z.string().optional(),
  uptimePercentage: z.number(),
  totalReadings: z.number(),
  avgPh: z.number(),
  avgTds: z.number(),
  avgTurbidity: z.number(),
  alertCount: z.number(),
  lastSeen: z.number(),
  qualityScore: z.number(),
});

/**
 * Compliance Status Schema (analytics-specific)
 */
export const AnalyticsComplianceStatusSchema = z.object({
  parameter: z.enum(['ph', 'tds', 'turbidity']),
  compliant: z.boolean(),
  compliancePercentage: z.number(),
  violationCount: z.number(),
  threshold: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  currentValue: z.number().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  violationType: z.enum(['below_min', 'above_max', 'both', 'none']).optional(),
});

/**
 * Location Analytics Schema
 */
export const LocationAnalyticsSchema = z.object({
  building: z.string(),
  floor: z.string(),
  deviceCount: z.number(),
  avgWaterQualityScore: z.number(),
  activeAlertCount: z.number(),
  readings: z.object({
    avgPh: z.number(),
    avgTds: z.number(),
    avgTurbidity: z.number(),
  }),
});

/**
 * Trend Analysis Schema
 */
export const TrendAnalysisSchema = z.object({
  parameter: MetricTypeSchema,
  direction: AnalyticsTrendDirectionSchema,
  slope: z.number(), // Rate of change
  confidence: z.number(), // 0-100
  prediction: z.number(), // Predicted value for next period
  anomalyDetected: z.boolean(),
});

/**
 * Correlation Analysis Schema
 */
export const CorrelationAnalysisSchema = z.object({
  parameter1: MetricTypeSchema,
  parameter2: MetricTypeSchema,
  correlationCoefficient: z.number(), // -1 to 1
  strength: z.enum(['strong', 'moderate', 'weak', 'none']),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AggregationPeriod = z.infer<typeof AggregationPeriodSchema>;
export type MetricType = z.infer<typeof MetricTypeSchema>;
export type AnalyticsTrendDirection = z.infer<typeof AnalyticsTrendDirectionSchema>;
export type DateRangeFilter = z.infer<typeof DateRangeFilterSchema>;
export type HistoricalSensorData = z.infer<typeof HistoricalSensorDataSchema>;
export type AggregatedMetrics = z.infer<typeof AggregatedMetricsSchema>;
export type TimeSeriesDataPoint = z.infer<typeof TimeSeriesDataPointSchema>;
export type AlertStatistics = z.infer<typeof AlertStatisticsSchema>;
export type DevicePerformanceMetrics = z.infer<typeof DevicePerformanceMetricsSchema>;
export type AnalyticsComplianceStatus = z.infer<typeof AnalyticsComplianceStatusSchema>;
export type LocationAnalytics = z.infer<typeof LocationAnalyticsSchema>;
export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;
export type CorrelationAnalysis = z.infer<typeof CorrelationAnalysisSchema>;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Analytics Query Options
 */
export interface AnalyticsQueryOptions {
  dateRange: DateRangeFilter;
  deviceIds?: string[];
  aggregationInterval?: AggregationPeriod;
  includeHistory?: boolean;
  includeAlerts?: boolean;
  includeTrends?: boolean;
}

/**
 * Analytics Dashboard State
 */
export interface AnalyticsDashboardState {
  dateRange: DateRangeFilter;
  selectedDevices: string[];
  selectedMetrics: MetricType[];
  viewMode: 'realtime' | 'historical';
  refreshInterval: number; // milliseconds
}

/**
 * Chart Configuration
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'radar' | 'heatmap' | 'gauge' | 'pie';
  title: string;
  dataKey: string;
  color?: string;
  unit?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}

/**
 * Water Quality Standards (WHO Guidelines)
 */
export const WATER_QUALITY_STANDARDS = {
  ph: {
    min: 6.5,
    max: 8.5,
    unit: 'pH',
    name: 'pH Level',
    description: 'Acidity/Alkalinity of water',
  },
  tds: {
    max: 500,
    unit: 'ppm',
    name: 'Total Dissolved Solids',
    description: 'Concentration of dissolved substances',
  },
  turbidity: {
    max: 5,
    unit: 'NTU',
    name: 'Turbidity',
    description: 'Cloudiness or haziness of water',
  },
} as const;

/**
 * Quality Score Thresholds
 */
export const QUALITY_SCORE_THRESHOLDS = {
  excellent: { min: 90, max: 100, label: 'Excellent', color: '#52c41a' },
  good: { min: 75, max: 89, label: 'Good', color: '#1890ff' },
  fair: { min: 60, max: 74, label: 'Fair', color: '#faad14' },
  poor: { min: 40, max: 59, label: 'Poor', color: '#ff7a45' },
  critical: { min: 0, max: 39, label: 'Critical', color: '#ff4d4f' },
} as const;
