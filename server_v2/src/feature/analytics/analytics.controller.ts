/**
 * Analytics Controller
 * Request handlers for analytics endpoints
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '@core/middlewares/auth.middleware';
import analyticsService from './analytics.service';
import ResponseHandler from '@utils/response.util';
import { asyncHandler } from '@utils/asyncHandler.util';

/**
 * Get analytics summary
 * GET /api/v1/analytics/summary
 */
export const getAnalyticsSummary = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { deviceId, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const summary = await analyticsService.getAnalyticsSummary(
      deviceId as string,
      start,
      end
    );

    ResponseHandler.success(res, summary, 'Analytics summary retrieved successfully');
  }
);

/**
 * Get analytics trends
 * GET /api/v1/analytics/trends
 */
export const getAnalyticsTrends = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { deviceId, startDate, endDate, interval } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const trends = await analyticsService.getAnalyticsTrends(
      deviceId as string,
      start,
      end,
      (interval as string) || 'hour'
    );

    ResponseHandler.success(res, trends, 'Analytics trends retrieved successfully');
  }
);

/**
 * Get parameter statistics
 * GET /api/v1/analytics/parameters
 */
export const getParameterStatistics = asyncHandler(
  async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { deviceId, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const stats = await analyticsService.getParameterStatistics(
      deviceId as string,
      start,
      end
    );

    ResponseHandler.success(res, stats, 'Parameter statistics retrieved successfully');
  }
);
