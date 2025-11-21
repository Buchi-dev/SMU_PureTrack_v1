/**
 * Analytics Service
 * 
 * Provides analytics operations for water quality monitoring through Express REST API.
 * All complex analytics and aggregations are handled server-side.
 * 
 * API Endpoints:
 * - GET /api/analytics/summary - Dashboard statistics
 * - GET /api/analytics/trends - Time-series water quality trends
 * - GET /api/analytics/parameters - Parameter-specific analytics
 * 
 * @module services/analytics
 */

import { apiClient, getErrorMessage } from '../config/api.config';
import {
  ANALYTICS_ENDPOINTS,
  buildAnalyticsTrendsUrl,
  buildAnalyticsParametersUrl,
} from '../config/endpoints';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Dashboard summary statistics
 * Matches server response from /api/v1/analytics/summary
 */
export interface AnalyticsSummary {
  devices: {
    total: number;
    online: number;
    offline: number;
    registered: number;
    pending: number;
  };
  alerts: {
    last24Hours: number;
    unacknowledged: number;
    critical: number;
    warning: number;
  };
  readings: {
    lastHour: number;
  };
  waterQuality: {
    pH: number;
    turbidity: number;
    tds: number;
  } | null;
  timestamp: Date;
}

/**
 * Time-series trend data point
 * Matches server getTrends response structure
 */
export interface TrendPoint {
  period: string;
  deviceId?: string;
  parameter: string;
  avg: number;
  min: number;
  max: number;
  readingCount: number;
}

/**
 * Trends data wrapper from server
 */
export interface TrendsData {
  parameter: string;
  granularity: string;
  startDate: Date;
  endDate: Date;
  trends: TrendPoint[];
}

/**
 * Parameter-specific analytics from server
 */
export interface ParameterAnalytics {
  parameter: string;
  startDate: Date;
  endDate: Date;
  statistics: {
    avg: number;
    min: number;
    max: number;
    stdDev: number;
    totalReadings: number;
    exceedingThreshold: number;
    complianceRate: number;
  } | null;
  distribution: Array<{
    _id: number | string;
    count: number;
  }>;
  thresholds: {
    min: number;
    max: number;
    unit: string;
  };
}

/**
 * Analytics trends query parameters
 */
export interface TrendsQueryParams {
  startDate?: string;
  endDate?: string;
  parameter?: 'pH' | 'Turbidity' | 'TDS';
  granularity?: 'hour' | 'day' | 'week' | 'month';
  deviceIds?: string[];
}

/**
 * Parameter analytics query parameters
 */
export interface ParameterQueryParams {
  parameter?: 'pH' | 'Turbidity' | 'TDS';
  startDate?: string;
  endDate?: string;
}

/**
 * Analytics summary response
 */
export interface SummaryResponse {
  success: boolean;
  data: AnalyticsSummary;
}

/**
 * Analytics trends response
 * Server returns nested structure with metadata
 */
export interface TrendsResponse {
  success: boolean;
  data: TrendsData;
}

/**
 * Parameter analytics response
 */
export interface ParameterAnalyticsResponse {
  success: boolean;
  data: ParameterAnalytics;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AnalyticsService {

  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  /**
   * WHO water quality thresholds
   */
  static readonly THRESHOLDS = {
    ph: { min: 6.5, max: 8.5 },
    tds: { max: 500 }, // ppm
    turbidity: { max: 5 }, // NTU
  };

  // ==========================================================================
  // READ OPERATIONS (REST API)
  // ==========================================================================

  /**
   * Get dashboard summary statistics
   * Returns aggregated statistics for devices, alerts, and readings
   * 
   * @returns Promise with summary statistics
   * @example
   * const response = await analyticsService.getSummary();
   * console.log(response.data.devices.total, response.data.alerts.active);
   */
  async getSummary(): Promise<SummaryResponse> {
    try {
      const response = await apiClient.get<SummaryResponse>(
        ANALYTICS_ENDPOINTS.SUMMARY
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AnalyticsService] Get summary error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get water quality trends over time
   * Returns time-series data for specified parameters and date range
   * 
   * @param params - Query parameters for trends
   * @returns Promise with trend data points
   * @example
   * const response = await analyticsService.getTrends({
   *   startDate: '2025-01-01',
   *   endDate: '2025-01-31',
   *   parameter: 'pH',
   *   granularity: 'day'
   * });
   */
  async getTrends(params?: TrendsQueryParams): Promise<TrendsResponse> {
    try {
      const url = buildAnalyticsTrendsUrl(params);
      const response = await apiClient.get<TrendsResponse>(url);
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AnalyticsService] Get trends error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get parameter-specific analytics
   * Returns distribution, histogram, and compliance data for a parameter
   * 
   * @param params - Query parameters for parameter analytics
   * @returns Promise with parameter analytics
   * @example
   * const response = await analyticsService.getParameterAnalytics({
   *   parameter: 'pH',
   *   startDate: '2025-01-01',
   *   endDate: '2025-01-31'
   * });
   */
  async getParameterAnalytics(params?: ParameterQueryParams): Promise<ParameterAnalyticsResponse> {
    try {
      const url = buildAnalyticsParametersUrl(params);
      const response = await apiClient.get<ParameterAnalyticsResponse>(url);
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AnalyticsService] Get parameter analytics error:', message);
      throw new Error(message);
    }
  }
}

// Singleton export
export const analyticsService = new AnalyticsService();
