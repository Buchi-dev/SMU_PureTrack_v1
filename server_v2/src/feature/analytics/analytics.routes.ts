/**
 * Analytics Routes
 * API endpoints for analytics data
 */

import { Router } from 'express';
import {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getParameterStatistics,
} from './analytics.controller';
import { requireStaff } from '@core/middlewares';

const router = Router();

/**
 * @route   GET /api/v1/analytics/summary
 * @desc    Get analytics summary
 * @access  Protected (Staff/Admin)
 */
router.get('/summary', requireStaff, getAnalyticsSummary);

/**
 * @route   GET /api/v1/analytics/trends
 * @desc    Get analytics trends
 * @access  Protected (Staff/Admin)
 */
router.get('/trends', requireStaff, getAnalyticsTrends);

/**
 * @route   GET /api/v1/analytics/parameters
 * @desc    Get parameter statistics
 * @access  Protected (Staff/Admin)
 */
router.get('/parameters', requireStaff, getParameterStatistics);

export default router;
