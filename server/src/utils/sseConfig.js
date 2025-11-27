/**
 * Server-Sent Events (SSE) Configuration
 * 
 * Replaces Socket.IO for real-time updates
 * Better compatibility with Render.com and other cloud platforms
 * Uses standard HTTP/HTTPS - no special WebSocket support needed
 * 
 * @module utils/sseConfig
 */

const admin = require('firebase-admin');
const logger = require('./logger');

/**
 * Store active SSE connections
 * Map: userId -> array of response objects
 */
const sseConnections = new Map();

/**
 * Store subscription preferences for each connection
 * Map: connectionId -> Set of subscribed channels
 */
const subscriptions = new Map();

/**
 * Connection counter for unique IDs
 */
let connectionCounter = 0;

/**
 * SSE Middleware - Verify Firebase token and setup SSE connection
 * 
 * Usage: app.get('/sse', sseMiddleware, (req, res) => {...})
 */
async function sseMiddleware(req, res, next) {
  // Get token from Authorization header or query parameter
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Provide token in Authorization header or query parameter.',
    });
  }

  try {
    // Verify Firebase ID token (checkRevoked = true)
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    
    // Attach user info to request
    req.userId = decodedToken.uid;
    req.userEmail = decodedToken.email;
    req.userRole = decodedToken.role || 'staff';
    
    // Generate unique connection ID
    req.connectionId = `sse_${++connectionCounter}_${Date.now()}`;
    
    if (process.env.VERBOSE_LOGGING === 'true') {
      logger.info('[SSE] Client authenticated', {
        connectionId: req.connectionId,
        userId: req.userId,
        email: req.userEmail,
        role: req.userRole,
      });
    }
    
    next();
  } catch (error) {
    let errorMessage = 'Invalid authentication token';
    
    if (error.code === 'auth/id-token-expired') {
      errorMessage = 'Token expired. Please refresh your token and reconnect.';
      logger.warn('[SSE] Expired token attempt', {
        error: 'Token expired - client should refresh',
        ip: req.ip,
      });
    } else if (error.code === 'auth/id-token-revoked') {
      errorMessage = 'Token revoked. Please sign in again.';
      logger.error('[SSE] Revoked token attempt', {
        error: error.message,
        ip: req.ip,
      });
    } else {
      logger.error('[SSE] Authentication failed', {
        error: error.message,
        code: error.code,
        ip: req.ip,
      });
    }
    
    return res.status(401).json({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Setup SSE connection
 * 
 * @param {Request} req - Express request object (must have userId from middleware)
 * @param {Response} res - Express response object
 */
function setupSSEConnection(req, res) {
  const { userId, userEmail, connectionId } = req;
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx
  
  // Send initial connection success message
  sendSSEMessage(res, 'connected', {
    connectionId,
    userId,
    message: 'SSE connection established',
    timestamp: new Date().toISOString(),
  });
  
  // Add connection to active connections map
  if (!sseConnections.has(userId)) {
    sseConnections.set(userId, []);
  }
  sseConnections.get(userId).push({
    connectionId,
    response: res,
    userEmail,
    connectedAt: new Date(),
  });
  
  // Initialize empty subscription set for this connection
  subscriptions.set(connectionId, new Set(['alerts'])); // Default: subscribe to alerts
  
  const totalConnections = Array.from(sseConnections.values()).reduce((sum, arr) => sum + arr.length, 0);
  
  if (process.env.VERBOSE_LOGGING === 'true') {
    logger.info('[SSE] Client connected', {
      connectionId,
      userId,
      email: userEmail,
      totalConnections,
    });
  }
  
  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeatInterval);
      return;
    }
    sendSSEMessage(res, 'heartbeat', { timestamp: new Date().toISOString() });
  }, 30000);
  
  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    removeConnection(userId, connectionId);
    
    if (process.env.VERBOSE_LOGGING === 'true') {
      const remaining = Array.from(sseConnections.values()).reduce((sum, arr) => sum + arr.length, 0);
      logger.info('[SSE] Client disconnected', {
        connectionId,
        userId,
        remainingConnections: remaining,
      });
    }
  });
}

/**
 * Send SSE message to a specific response
 * 
 * @param {Response} res - Express response object
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
function sendSSEMessage(res, event, data) {
  if (res.writableEnded) {
    return false;
  }
  
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch (error) {
    logger.error('[SSE] Error sending message', {
      event,
      error: error.message,
    });
    return false;
  }
}

/**
 * Broadcast message to all connections subscribed to a channel
 * 
 * @param {string} channel - Channel name (e.g., 'alerts', 'devices', 'admin')
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcastToChannel(channel, event, data) {
  let successCount = 0;
  let failCount = 0;
  
  const payload = {
    ...data,
    timestamp: new Date().toISOString(),
  };
  
  // Iterate through all connections
  for (const [userId, connections] of sseConnections.entries()) {
    for (const conn of connections) {
      // Check if connection is subscribed to this channel
      const connectionSubs = subscriptions.get(conn.connectionId);
      if (connectionSubs && connectionSubs.has(channel)) {
        const sent = sendSSEMessage(conn.response, event, payload);
        if (sent) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }
  }
  
  if (process.env.VERBOSE_LOGGING === 'true') {
    logger.debug('[SSE] Broadcast to channel', {
      channel,
      event,
      successCount,
      failCount,
    });
  }
  
  return { successCount, failCount };
}

/**
 * Broadcast message to specific user (all their connections)
 * 
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
function broadcastToUser(userId, event, data) {
  const connections = sseConnections.get(userId);
  
  if (!connections || connections.length === 0) {
    return { successCount: 0, failCount: 0 };
  }
  
  const payload = {
    ...data,
    timestamp: new Date().toISOString(),
  };
  
  let successCount = 0;
  let failCount = 0;
  
  for (const conn of connections) {
    const sent = sendSSEMessage(conn.response, event, payload);
    if (sent) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  return { successCount, failCount };
}

/**
 * Broadcast message to all connected clients
 * 
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcastToAll(event, data) {
  let successCount = 0;
  let failCount = 0;
  
  const payload = {
    ...data,
    timestamp: new Date().toISOString(),
  };
  
  for (const [userId, connections] of sseConnections.entries()) {
    for (const conn of connections) {
      const sent = sendSSEMessage(conn.response, event, payload);
      if (sent) {
        successCount++;
      } else {
        failCount++;
      }
    }
  }
  
  if (process.env.VERBOSE_LOGGING === 'true') {
    logger.debug('[SSE] Broadcast to all', {
      event,
      successCount,
      failCount,
    });
  }
  
  return { successCount, failCount };
}

/**
 * Subscribe a connection to a channel
 * 
 * @param {string} connectionId - Connection ID
 * @param {string} channel - Channel name
 */
function subscribeToChannel(connectionId, channel) {
  const connectionSubs = subscriptions.get(connectionId);
  if (connectionSubs) {
    connectionSubs.add(channel);
    
    if (process.env.VERBOSE_LOGGING === 'true') {
      logger.info('[SSE] Subscribed to channel', {
        connectionId,
        channel,
        totalSubscriptions: connectionSubs.size,
      });
    }
    return true;
  }
  return false;
}

/**
 * Unsubscribe a connection from a channel
 * 
 * @param {string} connectionId - Connection ID
 * @param {string} channel - Channel name
 */
function unsubscribeFromChannel(connectionId, channel) {
  const connectionSubs = subscriptions.get(connectionId);
  if (connectionSubs) {
    connectionSubs.delete(channel);
    return true;
  }
  return false;
}

/**
 * Remove a connection from active connections
 * 
 * @param {string} userId - User ID
 * @param {string} connectionId - Connection ID
 */
function removeConnection(userId, connectionId) {
  const connections = sseConnections.get(userId);
  
  if (connections) {
    const filteredConnections = connections.filter(conn => conn.connectionId !== connectionId);
    
    if (filteredConnections.length === 0) {
      sseConnections.delete(userId);
    } else {
      sseConnections.set(userId, filteredConnections);
    }
  }
  
  // Clean up subscriptions
  subscriptions.delete(connectionId);
}

/**
 * Get SSE statistics
 * 
 * @returns {Object} SSE statistics
 */
function getSSEStats() {
  const totalConnections = Array.from(sseConnections.values()).reduce((sum, arr) => sum + arr.length, 0);
  const totalUsers = sseConnections.size;
  
  return {
    totalConnections,
    totalUsers,
    connectionsPerUser: totalUsers > 0 ? (totalConnections / totalUsers).toFixed(2) : 0,
    channels: {
      alerts: Array.from(subscriptions.values()).filter(subs => subs.has('alerts')).length,
      devices: Array.from(subscriptions.values()).filter(subs => subs.has('devices')).length,
      admin: Array.from(subscriptions.values()).filter(subs => subs.has('admin')).length,
    },
  };
}

/**
 * Clean up all connections (for graceful shutdown)
 */
function closeAllConnections() {
  logger.info('[SSE] Closing all connections...');
  
  for (const [userId, connections] of sseConnections.entries()) {
    for (const conn of connections) {
      try {
        sendSSEMessage(conn.response, 'server:shutdown', {
          message: 'Server is shutting down',
        });
        conn.response.end();
      } catch (error) {
        // Ignore errors during shutdown
      }
    }
  }
  
  sseConnections.clear();
  subscriptions.clear();
  
  logger.info('[SSE] All connections closed');
}

module.exports = {
  sseMiddleware,
  setupSSEConnection,
  broadcastToChannel,
  broadcastToUser,
  broadcastToAll,
  subscribeToChannel,
  unsubscribeFromChannel,
  getSSEStats,
  closeAllConnections,
};
