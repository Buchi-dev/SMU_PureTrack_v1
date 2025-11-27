/**
 * SSE (Server-Sent Events) Client Utility
 * 
 * Manages real-time connection to the backend server
 * Replaces Socket.IO with more reliable SSE for Render.com compatibility
 * Handles authentication, reconnection, and subscription management
 * 
 * @module utils/sse
 */

import { getAuth } from 'firebase/auth';
import { API_BASE_URL } from '../config/api.config';

/**
 * SSE connection instance
 */
let eventSource: EventSource | null = null;

/**
 * Connection state
 */
let isConnecting = false;
let connectionId: string | null = null;

/**
 * Token refresh timer
 */
let tokenRefreshTimer: NodeJS.Timeout | null = null;

/**
 * Reconnection settings
 */
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds

/**
 * Event listeners registry
 * Map: event name -> array of callback functions
 */
const eventListeners = new Map<string, Array<(data: any) => void>>();

/**
 * SSE event types
 */
export type SSEEvent =
  | 'connected'
  | 'heartbeat'
  | 'alert:new'
  | 'alert:updated'
  | 'device:new'
  | 'device:updated'
  | 'reading:new'
  | 'reading:anomaly'
  | 'user:updated'
  | 'server:shutdown';

/**
 * SSE channel types (for subscriptions)
 */
export type SSEChannel = 
  | 'alerts'
  | 'devices'
  | 'admin'
  | `device:${string}`;

/**
 * Initialize SSE connection with Firebase authentication
 * Includes automatic token refresh every 50 minutes
 * 
 * @returns {Promise<void>}
 * @throws {Error} If user is not authenticated
 */
export async function initializeSSE(): Promise<void> {
  // Return if already connected
  if (eventSource && eventSource.readyState === EventSource.OPEN) {
    if (import.meta.env.DEV) {
      console.log('[SSE] Already connected, reusing existing connection');
    }
    return;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    if (import.meta.env.DEV) {
      console.log('[SSE] Connection already in progress, waiting...');
    }
    return;
  }

  isConnecting = true;

  try {
    // Get Firebase auth instance
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User must be authenticated to connect to SSE');
    }

    // Get fresh Firebase ID token (force refresh to ensure it's valid)
    const token = await user.getIdToken(true);

    // Build SSE URL with token
    const sseUrl = `${API_BASE_URL}/sse/stream?token=${encodeURIComponent(token)}`;

    if (import.meta.env.DEV) {
      console.log('[SSE] Connecting to:', sseUrl.replace(token, '[TOKEN]'));
    }

    // Create EventSource connection
    eventSource = new EventSource(sseUrl);

    // Setup event listeners
    setupEventListeners(eventSource);

    // Wait for connection
    await waitForConnection(eventSource);

    // Start automatic token refresh (every 50 minutes, tokens expire after 60 minutes)
    startTokenRefresh();

    reconnectAttempts = 0; // Reset on successful connection

    if (import.meta.env.DEV) {
      console.log('[SSE] Connection established successfully with auto token refresh');
    }

    isConnecting = false;

  } catch (error) {
    isConnecting = false;
    console.error('[SSE] Failed to initialize connection:', error);
    
    // Attempt reconnection
    scheduleReconnect();
    
    throw error;
  }
}

/**
 * Setup SSE event listeners
 * 
 * @param {EventSource} es - EventSource instance
 */
function setupEventListeners(es: EventSource): void {
  // Connection opened
  es.onopen = () => {
    if (import.meta.env.DEV) {
      console.log('[SSE] ✅ Connection opened');
    }
    reconnectAttempts = 0;
  };

  // Connection error
  es.onerror = (error) => {
    console.error('[SSE] ❌ Connection error:', error);
    
    if (es.readyState === EventSource.CLOSED) {
      console.log('[SSE] Connection closed, attempting reconnection...');
      scheduleReconnect();
    }
  };

  // Handle 'connected' event
  es.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    connectionId = data.connectionId;
    
    if (import.meta.env.DEV) {
      console.log('[SSE] ✅ Connected successfully', {
        connectionId: data.connectionId,
        userId: data.userId,
      });
    }
    
    // Trigger user callbacks
    triggerEventCallbacks('connected', data);
  });

  // Handle 'heartbeat' event
  es.addEventListener('heartbeat', (event) => {
    const data = JSON.parse(event.data);
    
    if (import.meta.env.DEV) {
      console.log('[SSE] 💓 Heartbeat received');
    }
    
    triggerEventCallbacks('heartbeat', data);
  });

  // Handle alert events
  es.addEventListener('alert:new', (event) => {
    const data = JSON.parse(event.data);
    if (import.meta.env.DEV) {
      console.log('[SSE] 🚨 New alert:', data.alert?.severity);
    }
    triggerEventCallbacks('alert:new', data);
  });

  es.addEventListener('alert:updated', (event) => {
    const data = JSON.parse(event.data);
    triggerEventCallbacks('alert:updated', data);
  });

  // Handle device events
  es.addEventListener('device:new', (event) => {
    const data = JSON.parse(event.data);
    triggerEventCallbacks('device:new', data);
  });

  es.addEventListener('device:updated', (event) => {
    const data = JSON.parse(event.data);
    triggerEventCallbacks('device:updated', data);
  });

  // Handle reading events
  es.addEventListener('reading:new', (event) => {
    const data = JSON.parse(event.data);
    triggerEventCallbacks('reading:new', data);
  });

  es.addEventListener('reading:anomaly', (event) => {
    const data = JSON.parse(event.data);
    triggerEventCallbacks('reading:anomaly', data);
  });

  // Handle user events
  es.addEventListener('user:updated', (event) => {
    const data = JSON.parse(event.data);
    triggerEventCallbacks('user:updated', data);
  });

  // Handle server shutdown
  es.addEventListener('server:shutdown', (event) => {
    const data = JSON.parse(event.data);
    console.warn('[SSE] ⚠️ Server shutting down:', data.message);
    triggerEventCallbacks('server:shutdown', data);
  });
}

/**
 * Wait for SSE connection to establish
 * 
 * @param {EventSource} es - EventSource instance
 * @returns {Promise<void>}
 */
function waitForConnection(es: EventSource): Promise<void> {
  return new Promise((resolve, reject) => {
    if (es.readyState === EventSource.OPEN) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout after 10 seconds'));
    }, 10000);

    // Wait for 'connected' event
    const connectedHandler = () => {
      clearTimeout(timeout);
      es.removeEventListener('connected', connectedHandler);
      resolve();
    };

    es.addEventListener('connected', connectedHandler);

    // Handle errors
    const errorHandler = (error: Event) => {
      clearTimeout(timeout);
      es.removeEventListener('error', errorHandler);
      reject(error);
    };

    es.addEventListener('error', errorHandler, { once: true });
  });
}

/**
 * Start automatic token refresh timer
 * Refreshes Firebase token and reconnects SSE every 50 minutes
 */
function startTokenRefresh(): void {
  // Clear any existing timer
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
  }

  // Refresh token every 50 minutes (tokens expire after 60 minutes)
  const REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes in milliseconds

  tokenRefreshTimer = setInterval(async () => {
    try {
      if (!eventSource || eventSource.readyState !== EventSource.OPEN) {
        if (import.meta.env.DEV) {
          console.log('[SSE] Token refresh skipped - not connected');
        }
        return;
      }

      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.warn('[SSE] Token refresh failed - user not authenticated');
        stopTokenRefresh();
        return;
      }

      if (import.meta.env.DEV) {
        console.log('[SSE] Refreshing Firebase token and reconnecting...');
      }

      // Disconnect current connection
      disconnectSSE();

      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reconnect with fresh token
      await initializeSSE();

      if (import.meta.env.DEV) {
        console.log('[SSE] ✅ Token refreshed and reconnected');
      }
    } catch (error) {
      console.error('[SSE] Failed to refresh token:', error);
    }
  }, REFRESH_INTERVAL);

  if (import.meta.env.DEV) {
    console.log('[SSE] Token auto-refresh started (every 50 minutes)');
  }
}

/**
 * Stop automatic token refresh timer
 */
function stopTokenRefresh(): void {
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = null;
    if (import.meta.env.DEV) {
      console.log('[SSE] Token auto-refresh stopped');
    }
  }
}

/**
 * Schedule reconnection attempt with exponential backoff
 */
function scheduleReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[SSE] Max reconnection attempts reached. Giving up.');
    return;
  }

  reconnectAttempts++;
  const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1); // Exponential backoff

  if (import.meta.env.DEV) {
    console.log(`[SSE] Reconnection attempt #${reconnectAttempts} in ${delay}ms`);
  }

  setTimeout(() => {
    initializeSSE().catch(error => {
      console.error('[SSE] Reconnection failed:', error);
    });
  }, delay);
}

/**
 * Register event listener
 * 
 * @param {SSEEvent} event - Event name
 * @param {Function} callback - Callback function
 */
export function addEventListener(event: SSEEvent, callback: (data: any) => void): void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, []);
  }
  
  eventListeners.get(event)!.push(callback);
  
  if (import.meta.env.DEV) {
    console.log(`[SSE] Event listener registered: ${event}`);
  }
}

/**
 * Remove event listener
 * 
 * @param {SSEEvent} event - Event name
 * @param {Function} callback - Callback function to remove
 */
export function removeEventListener(event: SSEEvent, callback: (data: any) => void): void {
  const listeners = eventListeners.get(event);
  
  if (listeners) {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
}

/**
 * Trigger all callbacks for an event
 * 
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
function triggerEventCallbacks(event: string, data: any): void {
  const listeners = eventListeners.get(event as SSEEvent);
  
  if (listeners && listeners.length > 0) {
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[SSE] Error in event callback for ${event}:`, error);
      }
    });
  }
}

/**
 * Subscribe to a channel
 * 
 * @param {SSEChannel} channel - Channel name
 * @returns {Promise<void>}
 */
export async function subscribeToChannel(channel: SSEChannel): Promise<void> {
  if (!connectionId) {
    throw new Error('Not connected to SSE');
  }

  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}/sse/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      connectionId,
      channel,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to subscribe to ${channel}`);
  }

  if (import.meta.env.DEV) {
    console.log(`[SSE] Subscribed to channel: ${channel}`);
  }
}

/**
 * Unsubscribe from a channel
 * 
 * @param {SSEChannel} channel - Channel name
 * @returns {Promise<void>}
 */
export async function unsubscribeFromChannel(channel: SSEChannel): Promise<void> {
  if (!connectionId) {
    throw new Error('Not connected to SSE');
  }

  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}/sse/unsubscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      connectionId,
      channel,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to unsubscribe from ${channel}`);
  }

  if (import.meta.env.DEV) {
    console.log(`[SSE] Unsubscribed from channel: ${channel}`);
  }
}

/**
 * Disconnect SSE connection and stop token refresh
 */
export function disconnectSSE(): void {
  if (eventSource) {
    if (import.meta.env.DEV) {
      console.log('[SSE] Disconnecting and cleaning up...');
    }

    // Stop token refresh timer
    stopTokenRefresh();

    eventSource.close();
    eventSource = null;
    connectionId = null;
    isConnecting = false;
    reconnectAttempts = 0;

    // Clear all event listeners
    eventListeners.clear();
  }
}

/**
 * Check if SSE is connected
 * 
 * @returns {boolean} Connection status
 */
export function isConnected(): boolean {
  return eventSource?.readyState === EventSource.OPEN || false;
}

/**
 * Manually reconnect SSE
 */
export async function reconnect(): Promise<void> {
  if (eventSource?.readyState === EventSource.OPEN) {
    if (import.meta.env.DEV) {
      console.log('[SSE] Already connected');
    }
    return;
  }

  if (import.meta.env.DEV) {
    console.log('[SSE] Manual reconnection triggered');
  }

  disconnectSSE();
  await initializeSSE();
}
