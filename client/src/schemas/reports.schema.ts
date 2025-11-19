/**
 * Reports Schemas
 * Zod schemas for report generation and data validation
 * 
 * @module schemas/reports
 */

import { z } from 'zod';
import { SensorReadingSchema } from './deviceManagement.schema';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Report Type
 */
export const ReportTypeSchema = z.enum(['water_quality', 'device_status', 'data_summary', 'compliance']);

/**
 * Report Format
 */
export const ReportFormatSchema = z.enum(['json', 'pdf', 'excel']);

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

/**
 * Time Period Schema
 */
export const TimePeriodSchema = z.object({
  start: z.number(),
  end: z.number(),
});

/**
 * Alert Data Schema
 */
export const AlertDataSchema = z.object({
  severity: z.string(),
  parameter: z.string(),
  message: z.string(),
  value: z.string(),
  timestamp: z.number(),
  location: z.string().optional(),
});

// ============================================================================
// WATER QUALITY REPORT SCHEMAS
// ============================================================================

/**
 * Device Metrics Schema
 */
export const DeviceMetricsSchema = z.object({
  avgPH: z.number(),
  minPH: z.number(),
  maxPH: z.number(),
  avgTDS: z.number(),
  minTDS: z.number(),
  maxTDS: z.number(),
  avgTurbidity: z.number(),
  minTurbidity: z.number(),
  maxTurbidity: z.number(),
  totalReadings: z.number(),
});

/**
 * Water Quality Device Data Schema
 */
export const WaterQualityDeviceDataSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  location: z.string().optional(),
  metrics: DeviceMetricsSchema,
  readings: z.array(SensorReadingSchema),
  alerts: z.array(AlertDataSchema),
});

/**
 * Water Quality Report Data Schema
 */
export const WaterQualityReportDataSchema = z.object({
  reportType: z.literal('water_quality'),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  devices: z.array(WaterQualityDeviceDataSchema),
  summary: z.object({
    totalDevices: z.number(),
    totalReadings: z.number(),
    averagePH: z.number(),
    averageTDS: z.number(),
    averageTurbidity: z.number(),
  }).optional(),
});

// ============================================================================
// DEVICE STATUS REPORT SCHEMAS
// ============================================================================

/**
 * Device Status Summary Schema
 */
export const DeviceStatusSummarySchema = z.object({
  totalDevices: z.number(),
  statusBreakdown: z.object({
    online: z.number(),
    offline: z.number(),
    error: z.number(),
    maintenance: z.number(),
  }),
  healthScore: z.string(),
});

/**
 * Device Status Info Schema
 */
export const DeviceStatusInfoSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  status: z.string(),
  lastSeen: z.string(),
  uptime: z.string().optional(),
});

/**
 * Device Status Report Data Schema
 */
export const DeviceStatusReportDataSchema = z.object({
  reportType: z.literal('device_status'),
  generatedAt: z.number(),
  summary: DeviceStatusSummarySchema,
  devices: z.array(DeviceStatusInfoSchema),
});

// ============================================================================
// DATA SUMMARY REPORT SCHEMAS
// ============================================================================

/**
 * Statistical Data Schema
 */
export const StatisticalDataSchema = z.object({
  mean: z.number(),
  median: z.number(),
  stdDev: z.number(),
  min: z.number(),
  max: z.number(),
});

/**
 * Data Summary Report Data Schema
 */
export const DataSummaryReportDataSchema = z.object({
  reportType: z.literal('data_summary'),
  period: TimePeriodSchema,
  summary: z.object({
    totalReadings: z.number(),
    totalDevices: z.number(),
    dataCompleteness: z.string(),
  }),
  statistics: z.object({
    turbidity: StatisticalDataSchema,
    tds: StatisticalDataSchema,
    ph: StatisticalDataSchema,
  }),
});

// ============================================================================
// COMPLIANCE REPORT SCHEMAS
// ============================================================================

/**
 * Compliance Status Schema
 */
export const ComplianceStatusSchema = z.object({
  parameter: z.string(),
  value: z.number(),
  standard: z.number(),
  unit: z.string(),
  status: z.enum(['compliant', 'warning', 'violation']),
  percentage: z.number(),
});

/**
 * Device Compliance Info Schema
 */
export const DeviceComplianceInfoSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  location: z.string().optional(),
  totalReadings: z.number(),
  complianceStatus: z.array(ComplianceStatusSchema),
  overallCompliance: z.boolean(),
  violations: z.object({
    turbidity: z.number(),
    tds: z.number(),
    ph: z.number(),
  }),
});

/**
 * Compliance Report Data Schema
 */
export const ComplianceReportDataSchema = z.object({
  reportType: z.literal('compliance'),
  period: TimePeriodSchema,
  devices: z.array(DeviceComplianceInfoSchema),
  summary: z.object({
    totalDevices: z.number(),
    compliantDevices: z.number(),
    complianceRate: z.string(),
  }),
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Generate Report Request Schema
 */
export const GenerateReportRequestSchema = z.object({
  reportType: ReportTypeSchema.optional(),
  action: z.string().optional(),
  deviceIds: z.array(z.string()).optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  includeCharts: z.boolean().optional(),
});

// ============================================================================
// UI/COMPONENT SCHEMAS
// ============================================================================

/**
 * Report Configuration Schema
 * Used for report generation UI
 */
export const ReportConfigSchema = z.object({
  type: ReportTypeSchema,
  title: z.string(),
  deviceIds: z.array(z.string()),
  dateRange: z.any().nullable(), // Can be Dayjs tuple or null
  includeCharts: z.boolean(),
  includeRawData: z.boolean(),
  includeStatistics: z.boolean(),
  notes: z.string(),
  generatedBy: z.string(),
});

/**
 * Report History Schema
 * Used for displaying report history
 */
export const ReportHistorySchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  generatedAt: z.date(),
  devices: z.number(),
  pages: z.number(),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Report Response Schema
 * Generic response that can contain any report type
 */
export const ReportResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any(), // Can be any of the report data types
  error: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ReportType = z.infer<typeof ReportTypeSchema>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type TimePeriod = z.infer<typeof TimePeriodSchema>;
export type AlertData = z.infer<typeof AlertDataSchema>;
export type DeviceMetrics = z.infer<typeof DeviceMetricsSchema>;
export type WaterQualityDeviceData = z.infer<typeof WaterQualityDeviceDataSchema>;
export type WaterQualityReportData = z.infer<typeof WaterQualityReportDataSchema>;
export type DeviceStatusSummary = z.infer<typeof DeviceStatusSummarySchema>;
export type DeviceStatusInfo = z.infer<typeof DeviceStatusInfoSchema>;
export type DeviceStatusReportData = z.infer<typeof DeviceStatusReportDataSchema>;
export type StatisticalData = z.infer<typeof StatisticalDataSchema>;
export type DataSummaryReportData = z.infer<typeof DataSummaryReportDataSchema>;
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;
export type DeviceComplianceInfo = z.infer<typeof DeviceComplianceInfoSchema>;
export type ComplianceReportData = z.infer<typeof ComplianceReportDataSchema>;
export type GenerateReportRequest = z.infer<typeof GenerateReportRequestSchema>;
export type ReportConfig = z.infer<typeof ReportConfigSchema>;
export type ReportHistory = z.infer<typeof ReportHistorySchema>;
export type ReportResponse<T = any> = Omit<z.infer<typeof ReportResponseSchema>, 'data'> & { data: T };
