/**
 * Server-Sent Events (SSE) Controller
 * 
 * Provides real-time push updates to connected clients using SSE.
 * Streams MongoDB Change Stream events directly to browser clients.
 * 
 * Features:
 * - Automatic client connection management
 * - Heartbeat to keep connections alive
 * - Graceful disconnect handling
 * - Event filtering by user role/permissions
 * - Memory-efficient connection tracking
 * 
 * @module sse/sse.Controller
 */

const logger = require('../utils/logger');

// Store active SSE connections
// Map<clientId, { res, user, channels, lastHeartbeat }>
const clients = new Map();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Connection timeout (5 minutes of no heartbeat = dead connection)
const CONNECTION_TIMEOUT = 300000;

/**
 * Initialize SSE connection for a client
 * 
 * @route GET /api/v1/sse/events
 * @access Private (requires authentication)
 */
const connectSSE = (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx
  
  // Generate unique client ID
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Get user info from auth middleware
  const user = req.user || { uid: 'anonymous', role: 'guest' };
  
  // Store client connection
  clients.set(clientId, {
    res,
    user,
    channels: new Set(['devices', 'alerts', 'readings']), // Default channels
    lastHeartbeat: Date.now(),
    connectedAt: new Date(),
  });
  
  logger.info('[SSE] Client connected', {
    clientId,
    userId: user.uid,
    role: user.role,
    totalClients: clients.size,
  });
  
  // Send initial connection message
  sendEvent(clientId, 'connected', {
    clientId,
    timestamp: new Date().toISOString(),
    message: 'SSE connection established',
  });
  
  // Handle client disconnect
  req.on('close', () => {
    clients.delete(clientId);
    logger.info('[SSE] Client disconnected', {
      clientId,
      userId: user.uid,
      totalClients: clients.size,
    });
  });
  
  // Handle errors
  req.on('error', (error) => {
    logger.error('[SSE] Connection error', {
      clientId,
      error: error.message,
    });
    clients.delete(clientId);
  });
};

/**
 * Send event to a specific client
 * 
 * @param {string} clientId - Client identifier
 * @param {string} event - Event type
 * @param {Object} data - Event data
 * @returns {boolean} - Success status
 */
const sendEvent = (clientId, event, data) => {
  const client = clients.get(clientId);
  
  if (!client) {
    return false;
  }
  
  try {
    // SSE format: event: eventName\ndata: jsonData\n\n
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    client.res.write(message);
    client.lastHeartbeat = Date.now();
    return true;
  } catch (error) {
    logger.error('[SSE] Error sending event', {
      clientId,
      event,
      error: error.message,
    });
    clients.delete(clientId);
    return false;
  }
};

/**
 * Broadcast event to all connected clients
 * 
 * @param {string} event - Event type
 * @param {Object} data - Event data
 * @param {Object} options - Broadcast options
 * @param {string[]} options.channels - Only send to clients subscribed to these channels
 * @param {string[]} options.roles - Only send to users with these roles
 */
const broadcast = (event, data, options = {}) => {
  const { channels = [], roles = [] } = options;
  
  let sentCount = 0;
  const deadClients = [];
  
  for (const [clientId, client] of clients.entries()) {
    // Check if client connection is still alive
    if (Date.now() - client.lastHeartbeat > CONNECTION_TIMEOUT) {
      deadClients.push(clientId);
      continue;
    }
    
    // Filter by channels
    if (channels.length > 0) {
      const hasChannel = channels.some(ch => client.channels.has(ch));
      if (!hasChannel) continue;
    }
    
    // Filter by roles
    if (roles.length > 0 && !roles.includes(client.user.role)) {
      continue;
    }
    
    // Send event
    if (sendEvent(clientId, event, data)) {
      sentCount++;
    }
  }
  
  // Clean up dead connections
  deadClients.forEach(clientId => {
    logger.warn('[SSE] Removing dead connection', { clientId });
    clients.delete(clientId);
  });
  
  if (sentCount > 0) {
    logger.debug('[SSE] Broadcast event', {
      event,
      recipients: sentCount,
      channels,
      roles,
    });
  }
  
  return sentCount;
};

/**
 * Heartbeat function to keep connections alive
 * Runs periodically to send ping events
 */
const heartbeat = () => {
  const deadClients = [];
  
  for (const [clientId, client] of clients.entries()) {
    // Check if connection is dead
    if (Date.now() - client.lastHeartbeat > CONNECTION_TIMEOUT) {
      deadClients.push(clientId);
      continue;
    }
    
    // Send heartbeat ping
    sendEvent(clientId, 'ping', { timestamp: Date.now() });
  }
  
  // Clean up dead connections
  deadClients.forEach(clientId => {
    logger.warn('[SSE] Removing stale connection', { clientId });
    clients.delete(clientId);
  });
};

// Start heartbeat interval
const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL);

/**
 * Get SSE connection statistics
 * 
 * @returns {Object} - Connection stats
 */
const getStats = () => {
  const stats = {
    totalConnections: clients.size,
    connectionsByRole: {},
    oldestConnection: null,
    newestConnection: null,
  };
  
  let oldestTime = Date.now();
  let newestTime = 0;
  
  for (const [clientId, client] of clients.entries()) {
    const role = client.user.role || 'guest';
    stats.connectionsByRole[role] = (stats.connectionsByRole[role] || 0) + 1;
    
    const connectedTime = client.connectedAt.getTime();
    if (connectedTime < oldestTime) {
      oldestTime = connectedTime;
      stats.oldestConnection = {
        clientId,
        connectedAt: client.connectedAt,
        userId: client.user.uid,
      };
    }
    if (connectedTime > newestTime) {
      newestTime = connectedTime;
      stats.newestConnection = {
        clientId,
        connectedAt: client.connectedAt,
        userId: client.user.uid,
      };
    }
  }
  
  return stats;
};

/**
 * Close all SSE connections (for graceful shutdown)
 */
const closeAllConnections = () => {
  logger.info('[SSE] Closing all connections', { total: clients.size });
  
  // Send shutdown message
  broadcast('shutdown', { 
    message: 'Server is shutting down',
    timestamp: new Date().toISOString(),
  });
  
  // Close all connections
  for (const [clientId, client] of clients.entries()) {
    try {
      client.res.end();
    } catch (error) {
      logger.error('[SSE] Error closing connection', {
        clientId,
        error: error.message,
      });
    }
  }
  
  clients.clear();
  clearInterval(heartbeatInterval);
  
  logger.info('[SSE] All connections closed');
};

module.exports = {
  connectSSE,
  sendEvent,
  broadcast,
  getStats,
  closeAllConnections,
};
