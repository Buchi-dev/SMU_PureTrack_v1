/**
 * Server-Sent Events (SSE) Routes
 * 
 * Provides endpoints for real-time event streaming via SSE.
 * 
 * @module sse/sse.Routes
 */

const express = require('express');
const router = express.Router();
const { connectSSE, getStats } = require('./sse.Controller');
const { authenticateFirebase, ensureAdmin } = require('../auth/auth.Middleware');

/**
 * @route   GET /api/v1/sse/events
 * @desc    Establish SSE connection for real-time updates
 * @access  Private (requires authentication)
 * 
 * @example
 * const eventSource = new EventSource('/api/v1/sse/events', {
 *   withCredentials: true
 * });
 * 
 * eventSource.addEventListener('device:updated', (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Device updated:', data);
 * });
 */
router.get('/events', authenticateFirebase, connectSSE);

/**
 * @route   GET /api/v1/sse/stats
 * @desc    Get SSE connection statistics (admin only)
 * @access  Private (Admin only)
 */
router.get('/stats', authenticateFirebase, ensureAdmin, (req, res) => {
  const stats = getStats();
  res.json({
    success: true,
    data: stats,
  });
});

module.exports = router;
