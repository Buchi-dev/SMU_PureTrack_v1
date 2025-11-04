/**
 * Report Generation Types
 * Type definitions for report generation operations
 *
 * @module types/reportGeneration.types
 */

// ===========================
// REPORT TYPES
// ===========================

/**
 * Available report types
 */
export type ReportType = "water_quality" | "device_status" | "data_summary" | "compliance";

// ===========================
// SHARED TYPES
// ===========================

/**
 * Device metrics for water quality reports
 */
export interface DeviceMetrics {
  avgPH: number;
  minPH: number;
  maxPH: number;
  avgTDS: number;
  minTDS: number;
  maxTDS: number;
  avgTurbidity: number;
  minTurbidity: number;
  maxTurbidity: number;
  totalReadings: number;
}

/**
 * Sensor reading data
 */
export interface SensorReading {
  deviceId: string;
  ph: number;
  tds: number;
  turbidity: number;
  timestamp: number;
  receivedAt: number;
}

/**
 * Alert data in reports
 */
export interface AlertData {
  severity: string;
  parameter: string;
  message: string;
  value: string;
}

/**
 * Device data for water quality reports
 */
export interface WaterQualityDeviceData {
  deviceId: string;
  deviceName: string;
  location?: string;
  metrics: DeviceMetrics;
  readings: SensorReading[];
  alerts: AlertData[];
}

/**
 * Device status summary
 */
export interface DeviceStatusSummary {
  totalDevices: number;
  statusBreakdown: {
    online: number;
    offline: number;
    error: number;
    maintenance: number;
  };
  healthScore: string;
}

/**
 * Device status info
 */
export interface DeviceStatusInfo {
  deviceId: string;
  deviceName: string;
  status: string;
  lastSeen: string;
  uptime?: string;
}

// ===========================
// REQUEST TYPES
// ===========================

/**
 * Base request for report generation
 */
export interface GenerateReportRequest {
  reportType: ReportType;
  deviceIds?: string[];
  startDate?: number;
  endDate?: number;
  includeCharts?: boolean;
}

/**
 * Request for water quality report
 */
export interface GenerateWaterQualityReportRequest extends GenerateReportRequest {
  action: "generateWaterQualityReport";
  reportType: "water_quality";
}

/**
 * Request for device status report
 */
export interface GenerateDeviceStatusReportRequest extends GenerateReportRequest {
  action: "generateDeviceStatusReport";
  reportType: "device_status";
}

/**
 * Request for data summary report
 */
export interface GenerateDataSummaryReportRequest extends GenerateReportRequest {
  action: "generateDataSummaryReport";
  reportType: "data_summary";
}

/**
 * Request for compliance report
 */
export interface GenerateComplianceReportRequest extends GenerateReportRequest {
  action: "generateComplianceReport";
  reportType: "compliance";
}

/**
 * Union type for all report requests
 */
export type ReportGenerationRequest =
  | GenerateWaterQualityReportRequest
  | GenerateDeviceStatusReportRequest
  | GenerateDataSummaryReportRequest
  | GenerateComplianceReportRequest;

// ===========================
// RESPONSE TYPES
// ===========================

/**
 * Water quality report data
 */
export interface WaterQualityReportData {
  reportType: "water_quality";
  period?: {
    start: string;
    end: string;
  };
  devices: WaterQualityDeviceData[];
  summary?: {
    totalDevices: number;
    totalReadings: number;
    averagePH: number;
    averageTDS: number;
    averageTurbidity: number;
  };
}

/**
 * Device status report data
 */
export interface DeviceStatusReportData {
  reportType: "device_status";
  summary: DeviceStatusSummary;
  devices: DeviceStatusInfo[];
}

/**
 * Generic report response
 */
export interface ReportResponse {
  success: boolean;
  message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: WaterQualityReportData | DeviceStatusReportData | any;
  timestamp: number;
  error?: string;
}
