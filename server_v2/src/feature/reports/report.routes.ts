/**
 * Report Routes
 * 
 * @module feature/reports/report.routes
 */

import { Router } from 'express';
import {
  createReport,
  getAllReports,
  getMyReports,
  getReportById,
  downloadReport,
  deleteReport,
  getReportStatistics,
  deleteExpiredReports,
} from './report.controller';
import { requireAuth, requireStaff, requireAdmin } from '@core/middlewares';
import { validateRequest } from '@core/middlewares/validation.middleware';
import {
  createReportSchema,
  reportFiltersSchema,
  getReportByIdSchema,
  deleteReportSchema,
} from './report.schema';

const router = Router();

/**
 * GET /api/v1/reports
 * Get all reports with filters
 */
router.get('/', requireStaff, validateRequest(reportFiltersSchema), getAllReports);

/**
 * GET /api/v1/reports/history
 * Get all reports with filters (alias for /)
 */
router.get('/history', requireStaff, validateRequest(reportFiltersSchema), getAllReports);

/**
 * GET /api/v1/reports/my-reports
 * Get current user's reports
 */
router.get('/my-reports', requireAuth, getMyReports);

/**
 * GET /api/v1/reports/statistics
 * Get report statistics
 */
router.get('/statistics', requireStaff, getReportStatistics);

/**
 * POST /api/v1/reports
 * Create report request
 */
router.post('/', requireStaff, validateRequest(createReportSchema), createReport);

/**
 * DELETE /api/v1/reports/expired
 * Delete expired reports (Admin only)
 */
router.delete('/expired', requireAdmin, deleteExpiredReports);

/**
 * GET /api/v1/reports/:id
 * Get report by ID
 */
router.get('/:id', requireAuth, validateRequest(getReportByIdSchema), getReportById);

/**
 * GET /api/v1/reports/:id/download
 * Download report file
 */
router.get('/:id/download', requireAuth, validateRequest(getReportByIdSchema), downloadReport);

/**
 * DELETE /api/v1/reports/:id
 * Delete report
 */
router.delete('/:id', requireAdmin, validateRequest(deleteReportSchema), deleteReport);

export default router;
