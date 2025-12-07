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
import { ERROR_MESSAGES, REQUEST_TIMEOUT, REPORT_TYPES, REPORT_STATUS } from '../constants';

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
  type?: typeof REPORT_TYPES[keyof typeof REPORT_TYPES];
  status?: typeof REPORT_STATUS[keyof typeof REPORT_STATUS];
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
  status: typeof REPORT_STATUS[keyof typeof REPORT_STATUS];
  data: Record<string, unknown>;
  summary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
  // GridFS file information
  gridFsFileId?: string;
  fileSize?: number;
  fileChecksum?: string;
  downloadCount?: number;
  lastDownloadedAt?: string;
}

export interface ReportResponse {
  success: boolean;
  data: Report;
  message?: string;
  // Optional PDF blob for instant download
  pdfBlob?: string;
  pdfContentType?: string;
  pdfFilename?: string;
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
  type: string;
  title: string;
  description?: string;
  status: string;
  format: string;
  parameters: {
    deviceIds?: string[];
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  };
  file?: {
    fileId: string;
    filename: string;
    format: string;
    size: number;
    mimeType: string;
  };
  generatedBy: string;
  generatedAt?: {
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
      // Transform frontend request to match backend API schema
      const backendRequest = {
        type: 'water-quality', // ReportType.WATER_QUALITY
        title: `Water Quality Report - ${request.startDate} to ${request.endDate}`,
        description: request.deviceIds?.length 
          ? `Water quality analysis for ${request.deviceIds.length} device(s)`
          : 'Water quality analysis for all devices',
        format: 'pdf', // ReportFormat.PDF
        parameters: {
          startDate: request.startDate,
          endDate: request.endDate,
          deviceIds: request.deviceIds,
          includeCharts: true,
          includeStatistics: true,
        },
      };

      if (import.meta.env.DEV) {
        // DEBUG: Log request being sent to backend
        console.log('[ReportsService] DEBUG - Sending request to backend:', {
          endpoint: REPORT_ENDPOINTS.LIST, // POST /api/v1/reports
          backendRequest,
        });
      }

      const response = await apiClient.post<any>(
        REPORT_ENDPOINTS.LIST, // Use unified endpoint: POST /api/v1/reports
        backendRequest,
        {
          timeout: REQUEST_TIMEOUT.LONG, // 60 seconds for report generation
        }
      );

      // Transform backend response to match frontend ReportResponse interface
      const transformedResponse: ReportResponse = {
        success: response.data.status === 'success',
        message: response.data.message,
        data: response.data.data,
        pdfBlob: response.data.pdfBlob,
        pdfContentType: response.data.pdfContentType,
        pdfFilename: response.data.pdfFilename,
      };

      if (import.meta.env.DEV) {
        // DEBUG: Log response from backend
        console.log('[ReportsService] DEBUG - Response from backend:', {
          success: transformedResponse.success,
          message: transformedResponse.message,
          hasPdfBlob: !!transformedResponse.pdfBlob,
          pdfBlobSize: transformedResponse.pdfBlob?.length,
          hasData: !!transformedResponse.data,
          summary: transformedResponse.data?.summary,
        });
      }

      return transformedResponse;
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
      // Transform frontend request to match backend API schema
      const backendRequest = {
        type: 'device-status', // ReportType.DEVICE_STATUS
        title: `Device Status Report - ${request.startDate} to ${request.endDate}`,
        description: request.deviceIds?.length 
          ? `Device health analysis for ${request.deviceIds.length} device(s)`
          : 'Device health analysis for all devices',
        format: 'pdf', // ReportFormat.PDF
        parameters: {
          startDate: request.startDate,
          endDate: request.endDate,
          deviceIds: request.deviceIds,
          includeCharts: true,
          includeStatistics: true,
        },
      };

      if (import.meta.env.DEV) {
        console.log('[ReportsService] DEBUG - Sending device status report request:', {
          endpoint: REPORT_ENDPOINTS.LIST,
          backendRequest,
        });
      }

      const response = await apiClient.post<any>(
        REPORT_ENDPOINTS.LIST, // Use unified endpoint: POST /api/v1/reports
        backendRequest,
        {
          timeout: REQUEST_TIMEOUT.LONG, // 60 seconds for report generation
        }
      );

      // Transform backend response to match frontend ReportResponse interface
      const transformedResponse: ReportResponse = {
        success: response.data.status === 'success',
        message: response.data.message,
        data: response.data.data,
        pdfBlob: response.data.pdfBlob,
        pdfContentType: response.data.pdfContentType,
        pdfFilename: response.data.pdfFilename,
      };

      if (import.meta.env.DEV) {
        console.log('[ReportsService] DEBUG - Device status report response:', {
          success: transformedResponse.success,
          message: transformedResponse.message,
        });
      }

      return transformedResponse;
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
      const response = await apiClient.get<any>(url);
      
      // Transform backend response to match frontend interface
      return {
        success: response.data.status === 'success',
        data: response.data.data || [],
        pagination: response.data.pagination,
      };
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
      const response = await apiClient.get<any>(
        REPORT_ENDPOINTS.BY_ID(reportId)
      );
      
      // Transform backend response to match frontend interface
      return {
        success: response.data.status === 'success',
        message: response.data.message,
        data: response.data.data,
      };
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
      const response = await apiClient.delete<any>(
        REPORT_ENDPOINTS.DELETE(reportId)
      );
      
      // Transform backend response to match frontend interface
      return {
        success: response.data.status === 'success',
        message: response.data.message || 'Report deleted successfully',
      };
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
    throw new Error(ERROR_MESSAGES.REPORT.INVALID_TYPE);
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
      const response = await apiClient.get<any>(url);

      // Transform backend response to match frontend interface
      return {
        success: response.data.status === 'success',
        data: response.data.data || [],
        pagination: response.data.pagination,
      };
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[ReportsService] Report history error:', message);
      throw new Error(message);
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
        timeout: REQUEST_TIMEOUT.DOWNLOAD,
      });

      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[ReportsService] Download error:', message);
      throw new Error(message);
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const reportsService = new ReportsService();
export default reportsService;
