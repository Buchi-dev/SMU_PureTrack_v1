/**
 * Health Monitoring Routes
 * 
 * Protected routes for system health metrics (Admin/Staff only)
 * 
 * ✅ WebSocket Migration Complete:
 * - All health metrics now broadcast via WebSocket 'system:health' event every 10s
 * - This endpoint kept for initial page load and load balancer health checks
 * 
 * @module feature/health/health.routes
 */

import { Router } from 'express';
import { requireStaff } from '@core/middlewares/auth.middleware';
import { getSystemHealth } from './health.controller';

const router = Router();

/**
 * @route   GET /api/v1/health/system
 * @desc    Get all system health metrics (CPU, Memory, Storage, Database)
 * @access  Staff/Admin
 * @note    Initial page load only - real-time updates via WebSocket 'system:health' event
 */
router.get('/system', requireStaff, getSystemHealth);

export default router;
