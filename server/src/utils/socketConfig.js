/**
 * Socket.IO Configuration and Setup
 * 
 * Handles WebSocket connections for real-time data updates
 * Integrates with Firebase authentication
 * Manages room-based subscriptions
 * 
 * @module utils/socketConfig
 */

const { Server } = require('socket.io');
const admin = require('firebase-admin');
const logger = require('./logger');

/**
 * Setup Socket.IO server with authentication and room management
 * 
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
function setupSocketIO(httpServer) {
  const allowedOrigins = [
    'https://smupuretrack.web.app',
    'https://smupuretrack.firebaseapp.com',
    process.env.CLIENT_URL || 'http://localhost:5173'
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    // Use polling first for better Render.com compatibility
    transports: ['polling', 'websocket'],
    // Longer timeouts for production environments with potential latency
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    upgradeTimeout: 30000, // Increased to 30 seconds for slow connections
    maxHttpBufferSize: 1e6, // 1 MB
    // Allow clients to upgrade transport
    allowUpgrades: true,
    // More permissive connection settings for cloud deployments
    connectTimeout: 45000, // 45 seconds for initial connection
    path: '/socket.io/', // Explicit path
  });

  // ========================================
  // AUTHENTICATION MIDDLEWARE
  // ========================================
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.warn('[Socket.IO] Connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Authentication required'));
    }

    try {
      // Verify Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Attach user info to socket
      socket.userId = decodedToken.uid;
      socket.userEmail = decodedToken.email;
      socket.userRole = decodedToken.role || 'staff'; // Assume role is in custom claims

      logger.info('[Socket.IO] Client authenticated', {
        socketId: socket.id,
        userId: socket.userId,
        email: socket.userEmail,
        role: socket.userRole,
      });

      next();
    } catch (error) {
      logger.error('[Socket.IO] Authentication failed', {
        socketId: socket.id,
        error: error.message,
      });
      return next(new Error('Invalid authentication token'));
    }
  });

  // ========================================
  // CONNECTION HANDLING
  // ========================================
  io.on('connection', (socket) => {
    logger.info('[Socket.IO] Client connected', {
      socketId: socket.id,
      userId: socket.userId,
      email: socket.userEmail,
      role: socket.userRole,
      connectedClients: io.engine.clientsCount,
    });

    // ========================================
    // SUBSCRIPTION HANDLERS
    // ========================================

    /**
     * Subscribe to alert updates
     */
    socket.on('subscribe:alerts', () => {
      socket.join('alerts');
      logger.info('[Socket.IO] Subscribed to alerts', {
        userId: socket.userId,
        socketId: socket.id,
      });

      socket.emit('subscription:confirmed', {
        room: 'alerts',
        message: 'Successfully subscribed to alert updates',
      });
    });

    /**
     * Unsubscribe from alert updates
     */
    socket.on('unsubscribe:alerts', () => {
      socket.leave('alerts');
      logger.info('[Socket.IO] Unsubscribed from alerts', {
        userId: socket.userId,
      });
    });

    /**
     * Subscribe to device updates
     */
    socket.on('subscribe:devices', () => {
      socket.join('devices');
      logger.info('[Socket.IO] Subscribed to devices', {
        userId: socket.userId,
      });

      socket.emit('subscription:confirmed', {
        room: 'devices',
        message: 'Successfully subscribed to device updates',
      });
    });

    /**
     * Unsubscribe from device updates
     */
    socket.on('unsubscribe:devices', () => {
      socket.leave('devices');
      logger.info('[Socket.IO] Unsubscribed from devices', {
        userId: socket.userId,
      });
    });

    /**
     * Subscribe to specific device updates
     */
    socket.on('subscribe:device', (deviceId) => {
      if (!deviceId) {
        socket.emit('error', { message: 'Device ID required' });
        return;
      }

      const roomName = `device:${deviceId}`;
      socket.join(roomName);
      logger.info('[Socket.IO] Subscribed to specific device', {
        userId: socket.userId,
        deviceId,
      });

      socket.emit('subscription:confirmed', {
        room: roomName,
        message: `Successfully subscribed to device ${deviceId}`,
      });
    });

    /**
     * Unsubscribe from specific device
     */
    socket.on('unsubscribe:device', (deviceId) => {
      if (!deviceId) return;

      const roomName = `device:${deviceId}`;
      socket.leave(roomName);
      logger.info('[Socket.IO] Unsubscribed from device', {
        userId: socket.userId,
        deviceId,
      });
    });

    /**
     * Subscribe to admin-only events (role-based)
     */
    socket.on('subscribe:admin', () => {
      if (socket.userRole === 'admin') {
        socket.join('admin');
        logger.info('[Socket.IO] Subscribed to admin room', {
          userId: socket.userId,
        });

        socket.emit('subscription:confirmed', {
          room: 'admin',
          message: 'Successfully subscribed to admin updates',
        });
      } else {
        socket.emit('error', {
          message: 'Insufficient permissions for admin subscription',
        });
        logger.warn('[Socket.IO] Unauthorized admin subscription attempt', {
          userId: socket.userId,
          role: socket.userRole,
        });
      }
    });

    // ========================================
    // PING/PONG FOR CONNECTION MONITORING
    // ========================================
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // ========================================
    // DISCONNECT HANDLING
    // ========================================
    socket.on('disconnect', (reason) => {
      logger.info('[Socket.IO] Client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason,
        connectedClients: io.engine.clientsCount,
      });
    });

    // ========================================
    // ERROR HANDLING
    // ========================================
    socket.on('error', (error) => {
      logger.error('[Socket.IO] Socket error', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message,
      });
    });
  });

  // ========================================
  // GLOBAL ERROR HANDLER
  // ========================================
  io.engine.on('connection_error', (error) => {
    logger.error('[Socket.IO] Connection error', {
      error: error.message,
      code: error.code,
    });
  });

  // Store globally for access in other modules
  global.io = io;

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    logger.info('[Socket.IO] Real-time connections active ✓');
  } else {
    logger.info('[Socket.IO] Server initialized successfully');
  }

  return io;
}

/**
 * Broadcast message to all clients in a room
 * 
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcastToRoom(room, event, data) {
  if (!global.io) {
    logger.error('[Socket.IO] Cannot broadcast: Socket.IO not initialized');
    return;
  }

  global.io.to(room).emit(event, {
    ...data,
    timestamp: new Date(),
  });

  logger.debug('[Socket.IO] Broadcast to room', {
    room,
    event,
  });
}

/**
 * Broadcast message to all connected clients
 * 
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcastToAll(event, data) {
  if (!global.io) {
    logger.error('[Socket.IO] Cannot broadcast: Socket.IO not initialized');
    return;
  }

  global.io.emit(event, {
    ...data,
    timestamp: new Date(),
  });

  logger.debug('[Socket.IO] Broadcast to all clients', {
    event,
    clientCount: global.io.engine.clientsCount,
  });
}

/**
 * Get Socket.IO server statistics
 * 
 * @returns {Object} Server statistics
 */
function getSocketIOStats() {
  if (!global.io) {
    return {
      initialized: false,
      clientCount: 0,
    };
  }

  return {
    initialized: true,
    clientCount: global.io.engine.clientsCount,
    rooms: Array.from(global.io.sockets.adapter.rooms.keys()),
  };
}

module.exports = {
  setupSocketIO,
  broadcastToRoom,
  broadcastToAll,
  getSocketIOStats,
};
