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
  data: Record<string, unknown>;
  summary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportResponse {
  success: boolean;
  data: Report;
  message?: string;
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

export interface ReportHistoryItem {
  id: string;
  reportId: string;
  type: string;
  title: string;
  createdAt: string;
  fileSize: number;
  downloadCount: number;
  startDate: string;
  endDate: string;
  deviceCount: number;
  downloadUrl: string;
}

export interface ReportHistoryFilters {
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ReportHistoryResponse {
  success: boolean;
  data: ReportHistoryItem[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
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
        request,
        {
          timeout: 30000, // 30 seconds for report generation
        }
      );
      return response.data;
    } catch (error) {
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
        request,
        {
          timeout: 30000, // 30 seconds for report generation
        }
      );
      return response.data;
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
  async generateReport(request: Record<string, unknown>): Promise<ReportResponse> {
    // Convert old format to new format
    if (request.reportType === 'water_quality' || !request.reportType) {
      return this.generateWaterQualityReport({
        startDate: (request.startDate as string) || new Date(Date.now()).toISOString(),
        endDate: (request.endDate as string) || new Date(Date.now()).toISOString(),
        deviceIds: request.deviceIds as string[] | undefined,
      });
    } else if (request.reportType === 'device_status') {
      return this.generateDeviceStatusReport({
        startDate: (request.startDate as string) || new Date(Date.now()).toISOString(),
        endDate: (request.endDate as string) || new Date(Date.now()).toISOString(),
        deviceIds: request.deviceIds as string[] | undefined,
      });
    }
    throw new Error(`Unsupported report type: ${request.reportType as string}`);
  }

  /**
   * Get report history with stored PDFs
   * 
   * @param filters - Optional filters for report history
   * @returns List of reports with download information
   * @throws {Error} If request fails
   * @example
   * const history = await reportsService.getReportHistory({
   *   type: 'water-quality',
   *   page: 1,
   *   limit: 10
   * });
   */
  async getReportHistory(filters: ReportHistoryFilters = {}): Promise<ReportHistoryResponse> {
    try {
      const params = new URLSearchParams();

      if (filters.type) params.append('type', filters.type);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const url = `${REPORT_ENDPOINTS.HISTORY}?${params.toString()}`;
      const response = await apiClient.get(url);

      return {
        success: response.data.success,
        data: response.data.data,
        pagination: response.data.pagination,
      };
    } catch (error) {
      throw new Error(`Failed to fetch report history: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Download a report PDF
   * 
   * @param fileId - GridFS file ID
   * @returns Blob for download
   * @throws {Error} If download fails
   * @example
   * const blob = await reportsService.downloadReport('507f1f77bcf86cd799439011');
   */
  async downloadReport(fileId: string): Promise<Blob> {
    try {
      const url = REPORT_ENDPOINTS.DOWNLOAD(fileId);
      const response = await apiClient.get(url, {
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to download report: ${getErrorMessage(error)}`);
    }
  }

  /**
   * @deprecated Use generateDataSummaryReport() - not yet implemented on server
   */
  async generateDataSummaryReport(): Promise<ReportListResponse> {
    throw new Error('Data summary reports not yet implemented on Express server');
  }

  /**
   * @deprecated Use generateComplianceReport() - not yet implemented on server
   */
  async generateComplianceReport(): Promise<ReportListResponse> {
    throw new Error('Compliance reports not yet implemented on Express server');
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const reportsService = new ReportsService();
export default reportsService;
