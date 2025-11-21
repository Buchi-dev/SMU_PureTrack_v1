/**
 * Alerts Service
 * 
 * Manages water quality alerts through Express REST API.
 * 
 * Write Operations: REST API (PATCH /api/alerts/:id/acknowledge, /resolve)
 * Read Operations: Handled by global hooks with SWR polling
 * 
 * Features:
 * - Acknowledge and resolve alerts
 * - Get alert statistics
 * - List alerts with filters
 * - Centralized error handling with user-friendly messages
 * 
 * @module services/alerts
 */

import { apiClient, getErrorMessage } from '../config/api.config';
import { 
  ALERT_ENDPOINTS, 
  buildAlertsUrl 
} from '../config/endpoints';
import type {
  WaterQualityAlert,
} from '../schemas';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AlertFilters {
  status?: 'Unacknowledged' | 'Acknowledged' | 'Resolved';
  severity?: 'Critical' | 'Warning' | 'Advisory';
  deviceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AlertStats {
  byStatus: Array<{
    _id: string;
    count: number;
  }>;
  bySeverity: Array<{
    _id: string;
    count: number;
  }>;
}

export interface AlertListResponse {
  success: boolean;
  data: WaterQualityAlert[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface AlertResponse {
  success: boolean;
  data: WaterQualityAlert;
  message?: string;
}

export interface AlertStatsResponse {
  success: boolean;
  data: AlertStats;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AlertsService {

  // ==========================================================================
  // WRITE OPERATIONS (REST API)
  // ==========================================================================

  /**
   * Acknowledge an alert
   * Marks alert as acknowledged with timestamp and user info
   * 
   * @param alertId - ID of the alert to acknowledge
   * @throws {Error} If acknowledgment fails
   * @example
   * await alertsService.acknowledgeAlert('alert-123');
   */
  async acknowledgeAlert(alertId: string): Promise<AlertResponse> {
    try {
      const response = await apiClient.patch<AlertResponse>(
        ALERT_ENDPOINTS.ACKNOWLEDGE(alertId)
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AlertsService] Acknowledge error:', message);
      throw new Error(message);
    }
  }

  /**
   * Resolve an alert with optional resolution notes
   * Marks alert as resolved with timestamp, user info, and notes
   * 
   * @param alertId - ID of the alert to resolve
   * @param notes - Optional resolution notes
   * @throws {Error} If resolution fails
   * @example
   * await alertsService.resolveAlert('alert-123', 'Water quality normalized');
   */
  async resolveAlert(alertId: string, notes?: string): Promise<AlertResponse> {
    try {
      const response = await apiClient.patch<AlertResponse>(
        ALERT_ENDPOINTS.RESOLVE(alertId),
        { notes }
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AlertsService] Resolve error:', message);
      throw new Error(message);
    }
  }

  /**
   * Delete an alert (admin only)
   * 
   * @param alertId - ID of the alert to delete
   * @throws {Error} If deletion fails
   * @example
   * await alertsService.deleteAlert('alert-123');
   */
  async deleteAlert(alertId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        ALERT_ENDPOINTS.DELETE(alertId)
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AlertsService] Delete error:', message);
      throw new Error(message);
    }
  }

  // ==========================================================================
  // READ OPERATIONS (REST API)
  // ==========================================================================

  /**
   * Get list of alerts with optional filters
   * Use global hooks for real-time polling instead of calling this directly
   * 
   * @param filters - Optional filters for status, severity, device, dates
   * @returns Promise with alert list and pagination
   * @example
   * const response = await alertsService.getAlerts({ status: 'Unacknowledged' });
   */
  async getAlerts(filters?: AlertFilters): Promise<AlertListResponse> {
    try {
      const url = buildAlertsUrl(filters);
      const response = await apiClient.get<AlertListResponse>(url);
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AlertsService] Get alerts error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get single alert by ID
   * 
   * @param alertId - Alert ID to fetch
   * @returns Promise with alert data
   * @example
   * const response = await alertsService.getAlertById('alert-123');
   */
  async getAlertById(alertId: string): Promise<AlertResponse> {
    try {
      const response = await apiClient.get<AlertResponse>(
        ALERT_ENDPOINTS.BY_ID(alertId)
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AlertsService] Get alert error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get alert statistics
   * Returns aggregate statistics including counts by severity, status, device
   * 
   * @returns Promise with alert statistics
   * @example
   * const response = await alertsService.getAlertStats();
   * console.log(response.data.total, response.data.bySeverity);
   */
  async getAlertStats(): Promise<AlertStatsResponse> {
    try {
      const response = await apiClient.get<AlertStatsResponse>(
        ALERT_ENDPOINTS.STATS
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AlertsService] Get stats error:', message);
      throw new Error(message);
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const alertsService = new AlertsService();
export default alertsService;
