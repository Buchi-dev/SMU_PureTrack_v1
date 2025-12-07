/**
 * Health Monitoring Service
 * 
 * Collects system and database health metrics with caching
 * 
 * @module feature/health/health.service
 */

import * as si from 'systeminformation';
import mongoose from 'mongoose';
import { dbConnection } from '@core/configs';
import {
  HealthStatus,
  CpuMetrics,
  MemoryMetrics,
  StorageMetrics,
  DatabaseMetrics,
  SystemHealthMetrics,
} from './health.types';

/**
 * Cache duration in milliseconds (5 seconds)
 */
const CACHE_DURATION = 5000;

/**
 * Cached metrics with timestamp
 */
interface CachedMetrics {
  data: SystemHealthMetrics;
  timestamp: number;
}

/**
 * Health Service Class
 */
class HealthService {
  private cache: CachedMetrics | null = null;

  /**
   * Get CPU metrics
   */
  async getCpuMetrics(): Promise<CpuMetrics> {
    try {
      const cpuData = await si.currentLoad();
      const cpuInfo = await si.cpu();
      
      const usagePercent = Math.round(cpuData.currentLoad);
      const cores = cpuInfo.cores;

      let status: HealthStatus;
      if (usagePercent > 90) {
        status = HealthStatus.CRITICAL;
      } else if (usagePercent > 80) {
        status = HealthStatus.WARNING;
      } else {
        status = HealthStatus.OK;
      }

      return {
        usagePercent,
        cores,
        status,
      };
    } catch (error) {
      console.error('Error getting CPU metrics:', error);
      return {
        usagePercent: 0,
        cores: 0,
        status: HealthStatus.UNKNOWN,
      };
    }
  }

  /**
   * Get memory metrics
   */
  async getMemoryMetrics(): Promise<MemoryMetrics> {
    try {
      const memData = await si.mem();
      
      const totalGB = parseFloat((memData.total / (1024 ** 3)).toFixed(2));
      const usedGB = parseFloat((memData.used / (1024 ** 3)).toFixed(2));
      const usagePercent = Math.round((memData.used / memData.total) * 100);

      let status: HealthStatus;
      if (usagePercent > 95) {
        status = HealthStatus.CRITICAL;
      } else if (usagePercent > 85) {
        status = HealthStatus.WARNING;
      } else {
        status = HealthStatus.OK;
      }

      return {
        usedGB,
        totalGB,
        usagePercent,
        status,
      };
    } catch (error) {
      console.error('Error getting memory metrics:', error);
      return {
        usedGB: 0,
        totalGB: 0,
        usagePercent: 0,
        status: HealthStatus.UNKNOWN,
      };
    }
  }

  /**
   * Get storage/disk metrics
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      const fsData = await si.fsSize();
      
      // Use the first filesystem or aggregate if multiple
      let totalBytes = 0;
      let usedBytes = 0;

      fsData.forEach((fs) => {
        totalBytes += fs.size;
        usedBytes += fs.used;
      });

      const totalGB = parseFloat((totalBytes / (1024 ** 3)).toFixed(2));
      const usedGB = parseFloat((usedBytes / (1024 ** 3)).toFixed(2));
      const usagePercent = Math.round((usedBytes / totalBytes) * 100);

      let status: HealthStatus;
      if (usagePercent > 90) {
        status = HealthStatus.CRITICAL;
      } else if (usagePercent > 80) {
        status = HealthStatus.WARNING;
      } else {
        status = HealthStatus.OK;
      }

      return {
        usedGB,
        totalGB,
        usagePercent,
        status,
      };
    } catch (error) {
      console.error('Error getting storage metrics:', error);
      return {
        usedGB: 0,
        totalGB: 0,
        usagePercent: 0,
        status: HealthStatus.UNKNOWN,
      };
    }
  }

  /**
   * Get MongoDB database metrics
   */
  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      const isConnected = dbConnection.getConnectionStatus();
      
      if (!isConnected) {
        return {
          connectionStatus: 'disconnected',
          storageSize: 0,
          indexSize: 0,
          totalSize: 0,
          responseTime: 0,
          status: HealthStatus.ERROR,
        };
      }

      // Time the stats query for response time
      const startTime = Date.now();
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }
      const stats = await db.stats();
      const responseTime = Date.now() - startTime;

      const storageSize = stats.dataSize || 0;
      const indexSize = stats.indexSize || 0;
      const totalSize = storageSize + indexSize;

      let status: HealthStatus;
      if (responseTime > 1000) {
        status = HealthStatus.WARNING;
      } else {
        status = HealthStatus.OK;
      }

      return {
        connectionStatus: 'connected',
        storageSize,
        indexSize,
        totalSize,
        responseTime,
        status,
      };
    } catch (error) {
      console.error('Error getting database metrics:', error);
      return {
        connectionStatus: 'disconnected',
        storageSize: 0,
        indexSize: 0,
        totalSize: 0,
        responseTime: 0,
        status: HealthStatus.ERROR,
      };
    }
  }

  /**
   * Get overall health status based on individual metrics
   */
  private getOverallStatus(
    cpu: CpuMetrics,
    memory: MemoryMetrics,
    storage: StorageMetrics,
    database: DatabaseMetrics
  ): HealthStatus {
    const statuses = [cpu.status, memory.status, storage.status, database.status];

    // If any critical, overall is critical
    if (statuses.includes(HealthStatus.CRITICAL) || statuses.includes(HealthStatus.ERROR)) {
      return HealthStatus.CRITICAL;
    }

    // If any warning, overall is warning
    if (statuses.includes(HealthStatus.WARNING)) {
      return HealthStatus.WARNING;
    }

    // If any unknown, overall is warning
    if (statuses.includes(HealthStatus.UNKNOWN)) {
      return HealthStatus.WARNING;
    }

    return HealthStatus.OK;
  }

  /**
   * Get all system health metrics (with caching)
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    const now = Date.now();

    // Return cached data if valid
    if (this.cache && (now - this.cache.timestamp) < CACHE_DURATION) {
      return this.cache.data;
    }

    // Collect all metrics in parallel
    const [cpu, memory, storage, database] = await Promise.all([
      this.getCpuMetrics(),
      this.getMemoryMetrics(),
      this.getStorageMetrics(),
      this.getDatabaseMetrics(),
    ]);

    const overallStatus = this.getOverallStatus(cpu, memory, storage, database);

    const metrics: SystemHealthMetrics = {
      timestamp: new Date().toISOString(),
      cpu,
      memory,
      storage,
      database,
      overallStatus,
    };

    // Update cache
    this.cache = {
      data: metrics,
      timestamp: now,
    };

    return metrics;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache = null;
  }
}

export default new HealthService();
