/**
 * Report Types
 * 
 * TypeScript interfaces and enums for reports
 * 
 * @module feature/reports/report.types
 */

import { Document, Types } from 'mongoose';

/**
 * Report type enum
 */
export enum ReportType {
  WATER_QUALITY = 'water-quality',
  DEVICE_STATUS = 'device-status',
  COMPLIANCE = 'compliance',
  ALERT_SUMMARY = 'alert-summary',
  CUSTOM = 'custom',
}

/**
 * Report status enum
 */
export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Report format enum
 */
export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
}

/**
 * Report parameters interface
 */
export interface IReportParameters {
  deviceIds?: string[];
  startDate?: Date;
  endDate?: Date;
  includeCharts?: boolean;
  includeStatistics?: boolean;
  parameters?: string[];
  [key: string]: any;
}

/**
 * Report file reference
 */
export interface IReportFile {
  fileId: Types.ObjectId;
  filename: string;
  format: ReportFormat;
  size: number;
  mimeType: string;
}

/**
 * Report document interface
 */
export interface IReportDocument extends Document {
  _id: Types.ObjectId;
  type: ReportType;
  title: string;
  description?: string;
  status: ReportStatus;
  format: ReportFormat;
  parameters: IReportParameters;
  file?: IReportFile;
  generatedBy: Types.ObjectId;
  generatedAt?: Date;
  errorMessage?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Public report interface (for API responses)
 */
export interface IReportPublic {
  id: string;
  type: ReportType;
  title: string;
  description?: string;
  status: ReportStatus;
  format: ReportFormat;
  parameters: IReportParameters;
  file?: {
    fileId: string;
    filename: string;
    format: ReportFormat;
    size: number;
    mimeType: string;
  };
  generatedBy: string;
  generatedAt?: {
    seconds: number;
    nanoseconds: number;
  };
  errorMessage?: string;
  expiresAt?: {
    seconds: number;
    nanoseconds: number;
  };
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  };
}

/**
 * Create report data interface
 */
export interface ICreateReportData {
  type: ReportType;
  title: string;
  description?: string;
  format: ReportFormat;
  parameters: IReportParameters;
  generatedBy: Types.ObjectId;
  expiresAt?: Date;
}

/**
 * Report filters interface
 */
export interface IReportFilters {
  type?: ReportType;
  status?: ReportStatus;
  format?: ReportFormat;
  generatedBy?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Report statistics interface
 */
export interface IReportStatistics {
  total: number;
  byType: Record<ReportType, number>;
  byStatus: Record<ReportStatus, number>;
  byFormat: Record<ReportFormat, number>;
}
