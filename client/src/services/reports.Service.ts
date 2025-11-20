/**
 * Reports Service
 * 
 * Generates various types of analytical reports for water quality data through Express REST API.
 * 
 * Write Operations: REST API (POST /api/reports/water-quality, /device-status)
 * Read Operations: REST API (GET /api/reports, /api/reports/:id)
 * 
 * Features:
 * - Water quality reports
 * - Device status reports
 * - Report listing with filters
 * - Report deletion (admin only)
 * 
 * @module services/reports
 */

import { apiClient, getErrorMessage } from '../config/api.config';
import { REPORT_ENDPOINTS, buildReportsUrl } from '../config/endpoints';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WaterQualityReportRequest {
  startDate: string;
  endDate: string;
  deviceIds?: string[];
}

export interface DeviceStatusReportRequest {
  startDate: string;
  endDate: string;
  deviceIds?: string[];
}

export interface ReportFilters {
  type?: 'water-quality' | 'device-status';
  status?: 'generating' | 'completed' | 'failed';
  generatedBy?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface Report {
  id: string;
  reportId: string;
  type: string;
  title: string;
  generatedBy: string;
  startDate: string;
  endDate: string;
  status: 'generating' | 'completed' | 'failed';
  data: any;
  summary?: any;
  metadata?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListResponse {
  success: boolean;
  data: Report[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ReportResponse {
  success: boolean;
  data: Report;
  message?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ReportsService {

  // ==========================================================================
  // WRITE OPERATIONS (REST API - Report Generation)
  // ==========================================================================

  /**
   * Generate water quality report
   * 
   * @param request - Report request with date range and optional device filter
   * @returns Generated report with data and summary
   * @throws {Error} If generation fails
   * @example
   * const report = await reportsService.generateWaterQualityReport({
   *   startDate: '2025-01-01',
   *   endDate: '2025-01-31',
   *   deviceIds: ['WQ-001', 'WQ-002']
   * });
   */
  async generateWaterQualityReport(
    request: WaterQualityReportRequest
  ): Promise<ReportResponse> {
    try {
      const response = await apiClient.post<ReportResponse>(
        REPORT_ENDPOINTS.WATER_QUALITY,
        request
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[ReportsService] Water quality report error:', message);
      throw new Error(message);
    }
  }

  /**
   * Generate device status report
   * 
   * @param request - Report request with date range and optional device filter
   * @returns Generated report with device health metrics
   * @throws {Error} If generation fails
   * @example
   * const report = await reportsService.generateDeviceStatusReport({
   *   startDate: '2025-01-01',
   *   endDate: '2025-01-31'
   * });
   */
  async generateDeviceStatusReport(
    request: DeviceStatusReportRequest
  ): Promise<ReportResponse> {
    try {
      const response = await apiClient.post<ReportResponse>(
        REPORT_ENDPOINTS.DEVICE_STATUS,
        request
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[ReportsService] Device status report error:', message);
      throw new Error(message);
    }
  }

  // ==========================================================================
  // READ OPERATIONS (REST API - Report Management)
  // ==========================================================================

  /**
   * Get list of generated reports with optional filters
   * 
   * @param filters - Optional filters for type, status, date range
   * @returns Promise with report list and pagination
   * @example
   * const response = await reportsService.getReports({ 
   *   type: 'water-quality',
   *   status: 'completed' 
   * });
   */
  async getReports(filters?: ReportFilters): Promise<ReportListResponse> {
    try {
      const url = buildReportsUrl(filters);
      const response = await apiClient.get<ReportListResponse>(url);
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[ReportsService] Get reports error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get single report by ID
   * 
   * @param reportId - Report ID to fetch
   * @returns Promise with report data
   * @example
   * const response = await reportsService.getReportById('report-123');
   */
  async getReportById(reportId: string): Promise<ReportResponse> {
    try {
      const response = await apiClient.get<ReportResponse>(
        REPORT_ENDPOINTS.BY_ID(reportId)
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[ReportsService] Get report error:', message);
      throw new Error(message);
    }
  }

  /**
   * Delete a report (admin only)
   * 
   * @param reportId - Report ID to delete
   * @throws {Error} If deletion fails
   * @example
   * await reportsService.deleteReport('report-123');
   */
  async deleteReport(reportId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        REPORT_ENDPOINTS.DELETE(reportId)
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[ReportsService] Delete report error:', message);
      throw new Error(message);
    }
  }

  // ==========================================================================
  // LEGACY METHODS (DEPRECATED - For backwards compatibility)
  // ==========================================================================

  /**
   * @deprecated Use generateWaterQualityReport() with proper request format
   * Legacy method for backwards compatibility with timestamp parameters
   */
  async generateReport(request: any): Promise<any> {
    // Convert old format to new format
    if (request.reportType === 'water_quality' || !request.reportType) {
      return this.generateWaterQualityReport({
        startDate: request.startDate || new Date(request.startDate || Date.now()).toISOString(),
        endDate: request.endDate || new Date(request.endDate || Date.now()).toISOString(),
        deviceIds: request.deviceIds,
      });
    } else if (request.reportType === 'device_status') {
      return this.generateDeviceStatusReport({
        startDate: request.startDate || new Date(request.startDate || Date.now()).toISOString(),
        endDate: request.endDate || new Date(request.endDate || Date.now()).toISOString(),
        deviceIds: request.deviceIds,
      });
    }
    throw new Error(`Unsupported report type: ${request.reportType}`);
  }

  /**
   * @deprecated Use generateDataSummaryReport() - not yet implemented on server
   */
  async generateDataSummaryReport(): Promise<any> {
    throw new Error('Data summary reports not yet implemented on Express server');
  }

  /**
   * @deprecated Use generateComplianceReport() - not yet implemented on server
   */
  async generateComplianceReport(): Promise<any> {
    throw new Error('Compliance reports not yet implemented on Express server');
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const reportsService = new ReportsService();
export default reportsService;
