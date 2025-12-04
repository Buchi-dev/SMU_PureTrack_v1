/**
 * Alert Routes
 * API endpoints for alert management
 */

import { Router } from 'express';
import {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  resolveAllAlerts,
  getAlertStatistics,
  deleteAlert,
  getAlertsByDevice,
  getUnacknowledgedCount,
} from './alert.controller';
import { requireStaff, requireAdmin } from '@core/middlewares';
import { validateRequest } from '@core/middlewares/validation.middleware';
import {
  getAlertByIdSchema,
  acknowledgeAlertSchema,
  resolveAlertSchema,
  resolveAllAlertsSchema,
  deleteAlertSchema,
} from './alert.schema';

const router = Router();

/**
 * @route   GET /api/v1/alerts
 * @desc    Get all alerts with filters and pagination
 * @access  Protected (Staff/Admin)
 */
router.get('/', requireStaff, getAllAlerts);

/**
 * @route   GET /api/v1/alerts/statistics
 * @desc    Get alert statistics (must be before /:id to avoid conflict)
 * @access  Protected (Staff/Admin)
 */
router.get('/statistics', requireStaff, getAlertStatistics);

/**
 * @route   GET /api/v1/alerts/unacknowledged/count
 * @desc    Get count of unacknowledged alerts
 * @access  Protected (Staff/Admin)
 */
router.get('/unacknowledged/count', requireStaff, getUnacknowledgedCount);

/**
 * @route   GET /api/v1/alerts/device/:deviceId
 * @desc    Get alerts for specific device
 * @access  Protected (Staff/Admin)
 */
router.get('/device/:deviceId', requireStaff, getAlertsByDevice);

/**
 * @route   PATCH /api/v1/alerts/resolve-all
 * @desc    Resolve all alerts (with optional filters)
 * @access  Protected (Staff/Admin)
 */
router.patch('/resolve-all', requireStaff, validateRequest(resolveAllAlertsSchema), resolveAllAlerts);

/**
 * @route   GET /api/v1/alerts/:id
 * @desc    Get alert by ID
 * @access  Protected (Staff/Admin)
 */
router.get('/:id', requireStaff, validateRequest(getAlertByIdSchema), getAlertById);

/**
 * @route   PATCH /api/v1/alerts/:id/acknowledge
 * @desc    Acknowledge alert
 * @access  Protected (Staff/Admin)
 */
router.patch('/:id/acknowledge', requireStaff, validateRequest(acknowledgeAlertSchema), acknowledgeAlert);

/**
 * @route   PATCH /api/v1/alerts/:id/resolve
 * @desc    Resolve alert
 * @access  Protected (Staff/Admin)
 */
router.patch('/:id/resolve', requireStaff, validateRequest(resolveAlertSchema), resolveAlert);

/**
 * @route   DELETE /api/v1/alerts/:id
 * @desc    Delete alert
 * @access  Protected (Admin only)
 */
router.delete('/:id', requireAdmin, validateRequest(deleteAlertSchema), deleteAlert);

export default router;
