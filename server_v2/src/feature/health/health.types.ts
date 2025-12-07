/**
 * Health Monitoring Types
 * 
 * Type definitions for system health monitoring
 * 
 * @module feature/health/health.types
 */

/**
 * Health status levels
 */
export enum HealthStatus {
  OK = 'ok',
  WARNING = 'warning',
  CRITICAL = 'critical',
  ERROR = 'error',
  UNKNOWN = 'unknown',
}

/**
 * CPU metrics
 */
export interface CpuMetrics {
  usagePercent: number;
  cores: number;
  status: HealthStatus;
}

/**
 * Memory metrics
 */
export interface MemoryMetrics {
  usedGB: number;
  totalGB: number;
  usagePercent: number;
  status: HealthStatus;
}

/**
 * Storage/Disk metrics
 */
export interface StorageMetrics {
  usedGB: number;
  totalGB: number;
  usagePercent: number;
  status: HealthStatus;
}

/**
 * MongoDB/Database metrics
 */
export interface DatabaseMetrics {
  connectionStatus: 'connected' | 'disconnected';
  storageSize: number; // in bytes
  indexSize: number; // in bytes
  totalSize: number; // in bytes
  responseTime: number; // in milliseconds
  status: HealthStatus;
}

/**
 * Complete system health metrics
 */
export interface SystemHealthMetrics {
  timestamp: string;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  database: DatabaseMetrics;
  overallStatus: HealthStatus;
}

/**
 * Individual metric response structure
 */
export interface HealthMetricResponse<T> {
  timestamp: string;
  metric: T;
  status: HealthStatus;
}
