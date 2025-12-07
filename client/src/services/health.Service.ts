/**
 * Health Monitoring Service
 * 
 * Manages system health metrics through Express REST API.
 * 
 * ✅ WebSocket Migration Complete:
 * - System health now broadcast via WebSocket 'system:health' event every 10s
 * - This service kept for initial page load only
 * - Individual metric endpoints removed (CPU, Memory, Storage, Database)
 * 
 * Features:
 * - Fetch complete system health metrics (initial load)
 * - Centralized error handling with user-friendly messages
 * 
 * @module services/health
 */

import { apiClient, getErrorMessage } from '../config/api.config';
import { HEALTH_ENDPOINTS } from '../config/endpoints';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type HealthStatus = 'ok' | 'warning' | 'critical' | 'error' | 'unknown';

export interface CpuMetrics {
  usagePercent: number;
  cores: number;
  status: HealthStatus;
}

export interface MemoryMetrics {
  usedGB: number;
  totalGB: number;
  usagePercent: number;
  status: HealthStatus;
}

export interface StorageMetrics {
  usedGB: number;
  totalGB: number;
  usagePercent: number;
  status: HealthStatus;
}

export interface DatabaseMetrics {
  connectionStatus: 'connected' | 'disconnected';
  storageSize: number;
  indexSize: number;
  totalSize: number;
  responseTime: number;
  status: HealthStatus;
}

export interface SystemHealthMetrics {
  timestamp: string;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  database: DatabaseMetrics;
  overallStatus: HealthStatus;
}

export interface HealthMetricResponse<T> {
  timestamp: string;
  metric: T;
  status: HealthStatus;
}

export interface HealthResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class HealthService {

  /**
   * Get all system health metrics (initial page load only)
   * Real-time updates via WebSocket 'system:health' event
   * 
   * @throws {Error} If fetching fails
   * @example
   * const health = await healthService.getSystemHealth();
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    try {
      const response = await apiClient.get<HealthResponse<SystemHealthMetrics>>(
        HEALTH_ENDPOINTS.SYSTEM
      );
      return response.data.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('Failed to fetch system health:', message);
      throw new Error(message);
    }
  }
}

// Export singleton instance
export const healthService = new HealthService();
export default healthService;
