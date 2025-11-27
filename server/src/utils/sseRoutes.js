/**
 * SSE (Server-Sent Events) Routes
 * 
 * Handles real-time event streaming to clients
 * Replaces Socket.IO for better Render.com compatibility
 * 
 * @module utils/sseRoutes
 */

const express = require('express');
const router = express.Router();
const {
  sseMiddleware,
  setupSSEConnection,
  subscribeToChannel,
  unsubscribeFromChannel,
  getSSEStats,
} = require('./sseConfig');
const logger = require('./logger');

/**
 * GET /sse/stream
 * Main SSE endpoint - establishes real-time connection
 * 
 * Query params:
 *   - token: Firebase ID token for authentication
 * 
 * Headers:
 *   - Authorization: Bearer <token> (alternative to query param)
 */
router.get('/stream', sseMiddleware, (req, res) => {
  setupSSEConnection(req, res);
});

/**
 * POST /sse/subscribe
 * Subscribe to a specific channel
 * 
 * Body:
 *   - connectionId: Connection ID from SSE stream
 *   - channel: Channel name (alerts, devices, admin, device:DEVICE_ID)
 */
router.post('/subscribe', sseMiddleware, (req, res) => {
  const { connectionId, channel } = req.body;
  
  if (!connectionId || !channel) {
    return res.status(400).json({
      success: false,
      error: 'connectionId and channel are required',
    });
  }
  
  const success = subscribeToChannel(connectionId, channel);
  
  if (success) {
    logger.info('[SSE] Subscription added', {
      connectionId,
      channel,
      userId: req.userId,
    });
    
    return res.json({
      success: true,
      message: `Subscribed to ${channel}`,
    });
  } else {
    return res.status(404).json({
      success: false,
      error: 'Connection not found',
    });
  }
});

/**
 * POST /sse/unsubscribe
 * Unsubscribe from a specific channel
 * 
 * Body:
 *   - connectionId: Connection ID from SSE stream
 *   - channel: Channel name
 */
router.post('/unsubscribe', sseMiddleware, (req, res) => {
  const { connectionId, channel } = req.body;
  
  if (!connectionId || !channel) {
    return res.status(400).json({
      success: false,
      error: 'connectionId and channel are required',
    });
  }
  
  const success = unsubscribeFromChannel(connectionId, channel);
  
  if (success) {
    logger.info('[SSE] Subscription removed', {
      connectionId,
      channel,
      userId: req.userId,
    });
    
    return res.json({
      success: true,
      message: `Unsubscribed from ${channel}`,
    });
  } else {
    return res.status(404).json({
      success: false,
      error: 'Connection not found',
    });
  }
});

/**
 * GET /sse/stats
 * Get SSE connection statistics
 * (Admin only in production)
 */
router.get('/stats', sseMiddleware, (req, res) => {
  // In production, restrict to admin users
  if (process.env.NODE_ENV === 'production' && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  
  const stats = getSSEStats();
  
  res.json({
    success: true,
    stats,
  });
});

module.exports = router;
