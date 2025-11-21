/**
 * Health Service
 * 
 * Provides system health monitoring through Express REST API.
 * Monitors database, Redis, email queue, memory, and system uptime.
 * 
 * API Endpoints:
 * - GET /health - Comprehensive system health check
 * - GET /health/liveness - Kubernetes liveness probe
 * - GET /health/readiness - Kubernetes readiness probe
 * 
 * @module services/health
 */

import { apiClient, getErrorMessage } from '../config/api.config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Database health check result
 */
export interface DatabaseCheck {
  status: 'OK' | 'FAILED' | 'NOT_CONFIGURED';
  message: string;
  host?: string;
  name?: string;
}

/**
 * Redis health check result
 */
export interface RedisCheck {
  status: 'OK' | 'FAILED' | 'NOT_CONFIGURED';
  message: string;
}

/**
 * Email queue health check result
 */
export interface EmailQueueCheck {
  status: 'OK' | 'WARNING' | 'ERROR' | 'NOT_CONFIGURED';
  message: string;
  stats?: {
    waiting: number;
    active: number;
    failed: number;
  };
}

/**
 * Email service configuration check
 */
export interface EmailServiceCheck {
  status: 'OK' | 'NOT_CONFIGURED';
  message: string;
}

/**
 * Memory usage metrics
 */
export interface MemoryCheck {
  status: 'OK' | 'WARNING';
  usage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  unit: 'MB';
  message?: string;
}

/**
 * Firebase Auth configuration check
 */
export interface FirebaseAuthCheck {
  status: 'OK' | 'NOT_CONFIGURED' | 'ERROR';
  message: string;
}

/**
 * API key configuration check
 */
export interface ApiKeyCheck {
  status: 'OK' | 'NOT_CONFIGURED';
  message: string;
}

/**
 * Comprehensive system health response
 */
export interface SystemHealth {
  status: 'OK' | 'DEGRADED' | 'FAILED';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: DatabaseCheck;
    redis: RedisCheck;
    emailQueue: EmailQueueCheck;
    emailService: EmailServiceCheck;
    memory: MemoryCheck;
    firebaseAuth: FirebaseAuthCheck;
    apiKey: ApiKeyCheck;
    // Optional monitoring features (not currently implemented in server)
    buffers?: Record<string, {
      messages: number;
      utilization: number;
    }>;
    cpu?: {
      current: number;
      average: number;
      peak: number;
    };
  };
  responseTime: string;
}

/**
 * Liveness probe response
 */
export interface LivenessResponse {
  status: 'OK';
  message: string;
  timestamp: string;
}

/**
 * Readiness probe response
 */
export interface ReadinessResponse {
  status: 'OK' | 'NOT_READY';
  message: string;
  timestamp: string;
}

/**
 * Health check response wrapper
 */
export interface HealthResponse {
  success: boolean;
  data: SystemHealth;
}

/**
 * Liveness check response wrapper
 */
export interface LivenessCheckResponse {
  success: boolean;
  data: LivenessResponse;
}

/**
 * Readiness check response wrapper
 */
export interface ReadinessCheckResponse {
  success: boolean;
  data: ReadinessResponse;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class HealthService {

  // ==========================================================================
  // READ OPERATIONS (REST API)
  // ==========================================================================

  /**
   * Get comprehensive system health check
   * Returns detailed health information for all system components
   * 
   * @returns Promise with system health data
   * @example
   * const response = await healthService.getSystemHealth();
   * console.log(response.data.status); // 'OK', 'DEGRADED', or 'FAILED'
   * console.log(response.data.checks.database.status);
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await apiClient.get<SystemHealth>('/health');
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[HealthService] Failed to fetch system health:', message);
      throw new Error(message);
    }
  }

  /**
   * Get liveness probe status
   * Used by Kubernetes to check if the application is running
   * 
   * @returns Promise with liveness status
   * @example
   * const response = await healthService.checkLiveness();
   * console.log(response.data.status); // 'OK'
   */
  async checkLiveness(): Promise<LivenessResponse> {
    try {
      const response = await apiClient.get<LivenessResponse>('/health/liveness');
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[HealthService] Liveness check failed:', message);
      throw new Error(message);
    }
  }

  /**
   * Get readiness probe status
   * Used by Kubernetes to check if the application can serve traffic
   * 
   * @returns Promise with readiness status
   * @example
   * const response = await healthService.checkReadiness();
   * console.log(response.data.status); // 'OK' or 'NOT_READY'
   */
  async checkReadiness(): Promise<ReadinessResponse> {
    try {
      const response = await apiClient.get<ReadinessResponse>('/health/readiness');
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[HealthService] Readiness check failed:', message);
      throw new Error(message);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Calculate overall health score (0-100)
   * Based on status of all health checks
   * 
   * @param health - System health data
   * @returns Health score percentage
   */
  calculateHealthScore(health: SystemHealth): number {
    const checks = Object.values(health.checks);
    const totalChecks = checks.length;
    
    let healthyChecks = 0;
    
    checks.forEach(check => {
      // Skip optional monitoring checks (buffers, cpu) that don't have status
      if (typeof check === 'object' && 'status' in check) {
        if (check.status === 'OK') {
          healthyChecks += 1;
        } else if (check.status === 'WARNING') {
          healthyChecks += 0.5;
        }
        // FAILED and NOT_CONFIGURED count as 0
      }
    });
    
    return Math.round((healthyChecks / totalChecks) * 100);
  }

  /**
   * Check if system is healthy
   * 
   * @param health - System health data
   * @returns True if system is OK or DEGRADED, false if FAILED
   */
  isSystemHealthy(health: SystemHealth): boolean {
    return health.status !== 'FAILED';
  }

  /**
   * Get critical failed checks
   * 
   * @param health - System health data
   * @returns Array of failed check names
   */
  getFailedChecks(health: SystemHealth): string[] {
    const failed: string[] = [];
    
    Object.entries(health.checks).forEach(([key, check]) => {
      // Skip optional monitoring checks (buffers, cpu) that don't have status
      if (typeof check === 'object' && 'status' in check) {
        if (check.status === 'FAILED' || check.status === 'ERROR') {
          failed.push(key);
        }
      }
    });
    
    return failed;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const healthService = new HealthService();
export default healthService;
