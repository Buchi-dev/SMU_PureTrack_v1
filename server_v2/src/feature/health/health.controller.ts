/**
 * Health Monitoring Controller
 * 
 * Handles HTTP requests for system health metrics
 * 
 * @module feature/health/health.controller
 */

import { Request, Response } from 'express';
import healthService from './health.service';
import { asyncHandler } from '@utils/asyncHandler.util';
import { ResponseHandler } from '@utils/response.util';

/**
 * Get all system health metrics
 * GET /api/v1/health/system
 */
export const getSystemHealth = asyncHandler(async (_req: Request, res: Response) => {
  const metrics = await healthService.getSystemHealth();
  
  ResponseHandler.success(res, metrics, 'System health metrics retrieved successfully');
});

/**
 * Get CPU metrics only
 * GET /api/v1/health/cpu
 */
export const getCpuMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const cpu = await healthService.getCpuMetrics();
  
  ResponseHandler.success(res, {
    timestamp: new Date().toISOString(),
    metric: cpu,
    status: cpu.status,
  }, 'CPU metrics retrieved successfully');
});

/**
 * Get memory metrics only
 * GET /api/v1/health/memory
 */
export const getMemoryMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const memory = await healthService.getMemoryMetrics();
  
  ResponseHandler.success(res, {
    timestamp: new Date().toISOString(),
    metric: memory,
    status: memory.status,
  }, 'Memory metrics retrieved successfully');
});

/**
 * Get storage metrics only
 * GET /api/v1/health/storage
 */
export const getStorageMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const storage = await healthService.getStorageMetrics();
  
  ResponseHandler.success(res, {
    timestamp: new Date().toISOString(),
    metric: storage,
    status: storage.status,
  }, 'Storage metrics retrieved successfully');
});

/**
 * Get database metrics only
 * GET /api/v1/health/database
 */
export const getDatabaseMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const database = await healthService.getDatabaseMetrics();
  
  ResponseHandler.success(res, {
    timestamp: new Date().toISOString(),
    metric: database,
    status: database.status,
  }, 'Database metrics retrieved successfully');
});
