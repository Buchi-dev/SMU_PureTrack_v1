/**
 * Socket.IO Client Utility
 * 
 * Manages WebSocket connection to the backend server
 * Handles authentication, reconnection, and subscription management
 * 
 * @module utils/socket
 */

import { io, Socket } from 'socket.io-client';
import { getAuth } from 'firebase/auth';

// Singleton socket instance
let socket: Socket | null = null;

// Connection state
let isConnecting = false;

// Track active subscriptions to prevent duplicates
const activeSubscriptions = new Set<SocketRoom>();

/**
 * Socket event types for type safety
 */
export type SocketEvent =
  | 'alert:new'
  | 'alert:updated'
  | 'device:new'
  | 'device:updated'
  | 'reading:new'
  | 'reading:anomaly'
  | 'user:updated'
  | 'subscription:confirmed'
  | 'error'
  | 'connect'
  | 'disconnect'
  | 'connect_error';

/**
 * Socket room types
 */
export type SocketRoom = 
  | 'alerts'
  | 'devices'
  | 'admin'
  | `device:${string}`;

/**
 * Initialize Socket.IO connection with Firebase authentication
 * 
 * @returns {Promise<Socket>} Connected Socket.IO instance
 * @throws {Error} If user is not authenticated
 */
export async function initializeSocket(): Promise<Socket> {
  // Return existing connection if already connected
  if (socket?.connected) {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] Already connected, reusing existing connection');
    }
    return socket;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] Connection already in progress, waiting...');
    }
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (socket?.connected) {
          clearInterval(checkInterval);
          resolve(socket);
        } else if (!isConnecting) {
          clearInterval(checkInterval);
          reject(new Error('Connection failed'));
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Connection timeout'));
      }, 10000);
    });
  }

  isConnecting = true;

  try {
    // Get Firebase auth instance
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User must be authenticated to connect to Socket.IO');
    }

    // Get fresh Firebase ID token
    const token = await user.getIdToken();

    // Determine server URL - use relative path in development (proxied), or when served from same domain in production
    const serverUrl = import.meta.env.PROD
      ? (import.meta.env.VITE_API_BASE_URL || '')
      : '';    if (import.meta.env.DEV) {
      console.log('[Socket.IO] Initializing connection to:', serverUrl || 'relative path (proxied)');
    }

    // Create Socket.IO connection
    // Production: Use polling first due to Render.com WebSocket limitations
    // Development: Prefer WebSocket for better performance
    const isProd = import.meta.env.PROD;
    
    socket = io(serverUrl, {
      auth: { token },
      // In production, start with polling (more reliable on Render.com)
      // WebSocket upgrade will happen automatically if available
      transports: isProd ? ['polling', 'websocket'] : ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000, // Increased to 20s for slower connections
      // Add upgrade settings for production
      upgrade: isProd, // Allow transport upgrade in production
      rememberUpgrade: true, // Remember successful upgrades
    });

    // Setup event listeners
    setupEventListeners(socket);

    // Wait for connection
    await waitForConnection(socket);

    if (import.meta.env.DEV) {
      console.log('[Socket.IO] Connection established successfully');
    }
    isConnecting = false;
    return socket;

  } catch (error) {
    isConnecting = false;
    console.error('[Socket.IO] Failed to initialize connection:', error);
    throw error;
  }
}

/**
 * Setup default Socket.IO event listeners
 * 
 * @param {Socket} socketInstance - Socket.IO instance
 */
function setupEventListeners(socketInstance: Socket): void {
  socketInstance.on('connect', () => {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] ✅ Connected successfully', {
        id: socketInstance.id,
        transport: socketInstance.io.engine.transport.name,
      });
    }
  });

  socketInstance.on('disconnect', (reason) => {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] ❌ Disconnected:', reason);
    }
    
    if (reason === 'io server disconnect') {
      // Server disconnected the client, reconnect manually
      if (import.meta.env.DEV) {
        console.log('[Socket.IO] Server disconnected, attempting manual reconnect...');
      }
      socketInstance.connect();
    }
  });

  socketInstance.on('connect_error', (error) => {
    console.error('[Socket.IO] ⚠️ Connection error:', error.message);
    // Log additional details in production for debugging
    if (import.meta.env.PROD) {
      console.error('[Socket.IO] Error details:', {
        transport: socketInstance.io.engine?.transport?.name,
        serverUrl: import.meta.env.VITE_API_BASE_URL,
      });
    }
  });

  socketInstance.io.on('reconnect_attempt', (attemptNumber) => {
    if (import.meta.env.DEV) {
      console.log(`[Socket.IO] 🔄 Reconnection attempt #${attemptNumber}`);
    }
  });

  socketInstance.io.on('reconnect', (attemptNumber) => {
    if (import.meta.env.DEV) {
      console.log(`[Socket.IO] ✅ Reconnected after ${attemptNumber} attempts`);
    }
  });

  socketInstance.io.on('reconnect_failed', () => {
    console.error('[Socket.IO] ❌ Reconnection failed after all attempts');
  });

  // Handle subscription confirmations
  socketInstance.on('subscription:confirmed', (data) => {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] ✅ Subscription confirmed:', data);
    }
  });

  // Handle errors
  socketInstance.on('error', (error) => {
    console.error('[Socket.IO] ❌ Socket error:', error);
  });

  // Ping/pong for connection monitoring
  socketInstance.on('pong', (data) => {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] 🏓 Pong received:', data);
    }
  });
}

/**
 * Wait for socket connection to establish
 * 
 * @param {Socket} socketInstance - Socket.IO instance
 * @returns {Promise<void>}
 */
function waitForConnection(socketInstance: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socketInstance.connected) {
      resolve();
      return;
    }

    // Increased timeout to 20s to match socket timeout
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout after 20 seconds'));
    }, 20000);

    socketInstance.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    socketInstance.once('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Get current Socket.IO instance
 * 
 * @returns {Socket | null} Socket instance or null if not connected
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Subscribe to a Socket.IO room
 * Prevents duplicate subscriptions to the same room
 * 
 * @param {SocketRoom} room - Room name to subscribe to
 * @returns {Promise<void>}
 */
export async function subscribe(room: SocketRoom): Promise<void> {
  const socketInstance = await initializeSocket();
  
  // Check if already subscribed
  if (activeSubscriptions.has(room)) {
    if (import.meta.env.DEV) {
      console.log(`[Socket.IO] Already subscribed to room: ${room}, skipping duplicate`);
    }
    return;
  }
  
  if (import.meta.env.DEV) {
    console.log(`[Socket.IO] Subscribing to room: ${room}`);
  }
  socketInstance.emit(`subscribe:${room.split(':')[0]}`, room.includes(':') ? room.split(':')[1] : undefined);
  activeSubscriptions.add(room);
}

/**
 * Listen to a Socket.IO event
 * 
 * @param {SocketEvent} event - Event name
 * @param {Function} handler - Event handler function
 * @returns {Function} Cleanup function to remove listener
 */
export function on(event: SocketEvent, handler: (...args: unknown[]) => void): () => void {
  if (!socket) {
    console.warn('[Socket.IO] Cannot add listener: socket not initialized');
    return () => {};
  }

  socket.on(event, handler);

  // Return cleanup function
  return () => {
    if (socket) {
      socket.off(event, handler);
    }
  };
}

/**
 * Remove event listener
 * 
 * @param {SocketEvent} event - Event name
 * @param {Function} handler - Event handler function
 */
export function off(event: SocketEvent, handler: (...args: unknown[]) => void): void {
  if (!socket) return;
  socket.off(event, handler);
}

/**
 * Disconnect Socket.IO connection
 */
export function disconnectSocket(): void {
  if (socket) {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] Disconnecting and cleaning up...');
    }
    socket.disconnect();
    socket = null;
    activeSubscriptions.clear(); // Clear subscription tracking
    isConnecting = false; // Reset connection state
  }
}

/**
 * Check if socket is connected
 * 
 * @returns {boolean} Connection status
 */
export function isConnected(): boolean {
  return socket?.connected || false;
}

/**
 * Manually reconnect socket
 */
export async function reconnect(): Promise<void> {
  if (socket?.connected) {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] Already connected');
    }
    return;
  }

  if (socket && !socket.connected) {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] Attempting to reconnect...');
    }
    socket.connect();
    await waitForConnection(socket);
  } else {
    if (import.meta.env.DEV) {
      console.log('[Socket.IO] No existing socket, creating new connection...');
    }
    await initializeSocket();
  }
}
