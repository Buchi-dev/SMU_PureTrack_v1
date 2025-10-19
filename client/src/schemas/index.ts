// Zod schemas for runtime validation
import { z } from 'zod';

// Device Status Schema
export const DeviceStatusSchema = z.enum(['online', 'offline', 'error', 'maintenance']);

// Device Schema
export const DeviceSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  name: z.string(),
  type: z.string(),
  firmwareVersion: z.string(),
  macAddress: z.string(),
  ipAddress: z.string(),
  sensors: z.array(z.string()),
  status: DeviceStatusSchema,
  registeredAt: z.any(), // Firebase Timestamp
  lastSeen: z.any(), // Firebase Timestamp
  metadata: z.record(z.string(), z.any()).optional(),
});

// Sensor Reading Schema
export const SensorReadingSchema = z.object({
  deviceId: z.string(),
  turbidity: z.number().min(0),
  tds: z.number().min(0),
  ph: z.number().min(0).max(14),
  timestamp: z.number(),
  receivedAt: z.number(),
});

// Report Type Schema
export const ReportTypeSchema = z.enum(['water_quality', 'device_status', 'data_summary', 'compliance']);

// Report Format Schema
export const ReportFormatSchema = z.enum(['json', 'pdf', 'excel']);

// Water Quality Metrics Schema
export const WaterQualityMetricsSchema = z.object({
  avgTurbidity: z.number(),
  maxTurbidity: z.number(),
  minTurbidity: z.number(),
  avgTDS: z.number(),
  maxTDS: z.number(),
  minTDS: z.number(),
  avgPH: z.number(),
  maxPH: z.number(),
  minPH: z.number(),
  totalReadings: z.number(),
  timeRange: z.object({ 
    start: z.number(), 
    end: z.number() 
  }),
});

// Device Report Schema
export const DeviceReportSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string(),
  location: z.string().optional(),
  metrics: WaterQualityMetricsSchema,
  readings: z.array(SensorReadingSchema),
  trends: z.object({
    turbidity: z.string(),
    tds: z.string(),
    ph: z.string(),
  }),
  alerts: z.array(z.object({
    severity: z.string(),
    parameter: z.string(),
    message: z.string(),
    value: z.string(),
  })),
});

// Water Quality Report Schema
export const WaterQualityReportSchema = z.object({
  title: z.string(),
  period: z.object({ start: z.number(), end: z.number() }),
  devices: z.array(DeviceReportSchema),
});

// Device Status Summary Schema
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

// Device Status Info Schema
export const DeviceStatusInfoSchema = z.object({
  deviceId: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  lastSeen: z.number(),
  firmwareVersion: z.string(),
  sensors: z.array(z.string()),
  location: z.string().optional(),
  connectivity: z.string(),
  uptime: z.string(),
});

// Device Status Report Schema
export const DeviceStatusReportSchema = z.object({
  title: z.string(),
  generatedAt: z.number(),
  summary: DeviceStatusSummarySchema,
  devices: z.array(DeviceStatusInfoSchema),
  recommendations: z.array(z.string()),
});

// Statistical Data Schema
export const StatisticalDataSchema = z.object({
  mean: z.number(),
  median: z.number(),
  stdDev: z.number(),
  min: z.number(),
  max: z.number(),
});

// Data Summary Report Schema
export const DataSummaryReportSchema = z.object({
  title: z.string(),
  period: z.object({ start: z.number(), end: z.number() }),
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
  dataQuality: z.record(z.string(), z.string()),
});

// Compliance Status Schema
export const ComplianceStatusSchema = z.object({
  parameter: z.string(),
  value: z.number(),
  standard: z.number(),
  unit: z.string(),
  status: z.enum(['compliant', 'warning', 'violation']),
  percentage: z.number(),
});

// Device Compliance Info Schema
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
  recommendations: z.array(z.string()),
});

// Compliance Report Schema
export const ComplianceReportSchema = z.object({
  title: z.string(),
  period: z.object({ start: z.number(), end: z.number() }),
  standards: z.object({
    turbidity: z.string(),
    tds: z.string(),
    ph: z.string(),
    reference: z.string(),
  }),
  devices: z.array(DeviceComplianceInfoSchema),
  summary: z.object({
    totalDevices: z.number(),
    compliantDevices: z.number(),
    complianceRate: z.string(),
  }),
});

// Report Request Schema
export const ReportRequestSchema = z.object({
  reportType: ReportTypeSchema,
  deviceId: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  format: ReportFormatSchema.optional(),
  includeCharts: z.boolean().optional(),
});

// Report Response Schema
export const ReportResponseSchema = z.object({
  success: z.boolean(),
  reportType: ReportTypeSchema,
  generatedAt: z.number(),
  data: z.any(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Report Configuration Schema
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

// Report History Schema
export const ReportHistorySchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  generatedAt: z.date(),
  devices: z.number(),
  pages: z.number(),
});

// API Response Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  data: z.any().optional(),
  count: z.number().optional(),
  devices: z.array(DeviceSchema).optional(),
  device: DeviceSchema.optional(),
  sensorData: SensorReadingSchema.optional(),
  history: z.array(SensorReadingSchema).optional(),
});

// Export inferred types from schemas
export type Device = z.infer<typeof DeviceSchema>;
export type SensorReading = z.infer<typeof SensorReadingSchema>;
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type ReportConfig = z.infer<typeof ReportConfigSchema>;
export type ReportHistory = z.infer<typeof ReportHistorySchema>;

// Report-related types
export type WaterQualityMetrics = z.infer<typeof WaterQualityMetricsSchema>;
export type DeviceReport = z.infer<typeof DeviceReportSchema>;
export type WaterQualityReport = z.infer<typeof WaterQualityReportSchema>;
export type DeviceStatusSummary = z.infer<typeof DeviceStatusSummarySchema>;
export type DeviceStatusInfo = z.infer<typeof DeviceStatusInfoSchema>;
export type DeviceStatusReport = z.infer<typeof DeviceStatusReportSchema>;
export type StatisticalData = z.infer<typeof StatisticalDataSchema>;
export type DataSummaryReport = z.infer<typeof DataSummaryReportSchema>;
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;
export type DeviceComplianceInfo = z.infer<typeof DeviceComplianceInfoSchema>;
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;
export type ReportRequest = z.infer<typeof ReportRequestSchema>;
export type ReportResponse<T = any> = Omit<z.infer<typeof ReportResponseSchema>, 'data'> & { data: T };

// Safe parsing (returns success/error instead of throwing) 
// Only include functions that are actually used in the codebase
export const safeParseApiResponse = (data: unknown) => {
  return ApiResponseSchema.safeParse(data);
};
