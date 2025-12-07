/**
 * useRealtimeSensorData - WebSocket Hook for Real-Time Sensor Updates
 * 
 * Eliminates HTTP polling by receiving instant push notifications when:
 * - Device publishes new sensor data via MQTT
 * - Device status changes (online/offline)
 * - New alerts are created
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - JWT authentication
 * - Room-based subscriptions per device
 * - TypeScript type safety
 * 
 * @module hooks/useRealtimeSensorData
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { auth } from '../config/firebase.config';
import type { SensorReading } from '../schemas';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

/**
 * WebSocket Events (must match backend)
 */
const WS_EVENTS = {
  // Client → Server
  SUBSCRIBE_DEVICES: 'subscribe:devices',
  UNSUBSCRIBE_DEVICES: 'unsubscribe:devices',
  SUBSCRIBE_ALERTS: 'subscribe:alerts',
  UNSUBSCRIBE_ALERTS: 'unsubscribe:alerts',

  // Server → Client
  SENSOR_DATA: 'sensor:data',
  DEVICE_STATUS: 'device:status',
  DEVICE_HEARTBEAT: 'device:heartbeat',
  ALERT_NEW: 'alert:new',
  ALERT_RESOLVED: 'alert:resolved',
  CONNECTION_STATUS: 'connection:status',
  ERROR: 'error',
} as const;

/**
 * Sensor data payload from WebSocket
 */
interface SensorDataPayload {
  deviceId: string;
  data: SensorReading;
  timestamp: number;
}

/**
 * Device status payload
 */
interface DeviceStatusPayload {
  deviceId: string;
  status: 'online' | 'offline';
  timestamp: number;
}

/**
 * Connection state
 */
interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

/**
 * Hook options
 */
interface UseRealtimeSensorDataOptions {
  deviceIds?: string[]; // Specific devices to subscribe to
  autoConnect?: boolean; // Auto-connect on mount
  enabled?: boolean; // Enable/disable hook
}

/**
 * Hook return value
 */
interface UseRealtimeSensorDataReturn {
  sensorData: Map<string, SensorReading>; // deviceId → latest reading
  deviceStatuses: Map<string, 'online' | 'offline'>; // deviceId → status
  connectionState: ConnectionState;
  subscribe: (deviceIds: string[]) => void;
  unsubscribe: (deviceIds: string[]) => void;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * Real-Time Sensor Data Hook
 * 
 * @example
 * ```tsx
 * const { sensorData, connectionState, subscribe } = useRealtimeSensorData({
 *   deviceIds: ['DEV-001', 'DEV-002'],
 *   autoConnect: true,
 * });
 * 
 * // Access latest sensor data
 * const device1Data = sensorData.get('DEV-001');
 * 
 * // Subscribe to more devices
 * subscribe(['DEV-003']);
 * ```
 */
export function useRealtimeSensorData(
  options: UseRealtimeSensorDataOptions = {}
): UseRealtimeSensorDataReturn {
  const {
    deviceIds = [],
    autoConnect = true,
    enabled = true,
  } = options;

  // WebSocket instance
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // State
  const [sensorData, setSensorData] = useState<Map<string, SensorReading>>(new Map());
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, 'online' | 'offline'>>(new Map());
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (!enabled) return;
    if (socketRef.current?.connected) return;

    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Get Firebase auth token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const token = await currentUser.getIdToken();

      // Create Socket.IO connection
      const socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually
      });

      socketRef.current = socket;

      // Connection success
      socket.on('connect', () => {
        console.log('✅ WebSocket: Connected', socket.id);
        setConnectionState({
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        });
        reconnectAttemptsRef.current = 0;

        // Subscribe to devices if provided
        if (deviceIds.length > 0) {
          socket.emit(WS_EVENTS.SUBSCRIBE_DEVICES, deviceIds);
        }
      });

      // Sensor data updates
      socket.on(WS_EVENTS.SENSOR_DATA, (payload: SensorDataPayload) => {
        console.log('📡 WebSocket: Sensor data received', payload.deviceId);
        setSensorData(prev => {
          const updated = new Map(prev);
          updated.set(payload.deviceId, payload.data);
          return updated;
        });
      });

      // Device status updates
      socket.on(WS_EVENTS.DEVICE_STATUS, (payload: DeviceStatusPayload) => {
        console.log('📡 WebSocket: Device status update', payload.deviceId, payload.status);
        setDeviceStatuses(prev => {
          const updated = new Map(prev);
          updated.set(payload.deviceId, payload.status);
          return updated;
        });
      });

      // Connection status
      socket.on(WS_EVENTS.CONNECTION_STATUS, (data: any) => {
        console.log('📡 WebSocket: Connection status', data);
      });

      // Error handling
      socket.on(WS_EVENTS.ERROR, (error: { message: string; code: string }) => {
        console.error('❌ WebSocket: Server error', error);
        setConnectionState(prev => ({ ...prev, error: error.message }));
      });

      // Disconnection
      socket.on('disconnect', (reason: string) => {
        console.warn('🔌 WebSocket: Disconnected', reason);
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          error: `Disconnected: ${reason}`,
        }));

        // Auto-reconnect with exponential backoff
        if (enabled && reason !== 'io client disconnect') {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;

          console.log(`🔄 WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      });

      // Connection error
      socket.on('connect_error', (error: Error) => {
        console.error('❌ WebSocket: Connection error', error.message);
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error.message,
          reconnectAttempts: reconnectAttemptsRef.current,
        }));
      });

    } catch (error: any) {
      console.error('❌ WebSocket: Failed to connect', error.message);
      setConnectionState({
        isConnected: false,
        isConnecting: false,
        error: error.message,
        reconnectAttempts: reconnectAttemptsRef.current,
      });
    }
  }, [enabled, deviceIds, WS_URL]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
    });
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Subscribe to specific devices
   */
  const subscribe = useCallback((newDeviceIds: string[]) => {
    if (!socketRef.current?.connected) {
      console.warn('⚠️ WebSocket: Not connected, cannot subscribe');
      return;
    }

    socketRef.current.emit(WS_EVENTS.SUBSCRIBE_DEVICES, newDeviceIds);
    console.log('📡 WebSocket: Subscribed to devices', newDeviceIds);
  }, []);

  /**
   * Unsubscribe from devices
   */
  const unsubscribe = useCallback((deviceIdsToRemove: string[]) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit(WS_EVENTS.UNSUBSCRIBE_DEVICES, deviceIdsToRemove);
    console.log('📡 WebSocket: Unsubscribed from devices', deviceIdsToRemove);
  }, []);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, enabled]); // Only run on mount/unmount

  // Subscribe when deviceIds change
  useEffect(() => {
    if (deviceIds.length > 0 && socketRef.current?.connected) {
      subscribe(deviceIds);
    }
  }, [deviceIds, subscribe]);

  return {
    sensorData,
    deviceStatuses,
    connectionState,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect,
  };
}

/**
 * Simplified hook for single device
 */
export function useDeviceSensorData(deviceId: string) {
  const { sensorData, deviceStatuses, connectionState } = useRealtimeSensorData({
    deviceIds: [deviceId],
    autoConnect: true,
  });

  return {
    sensorReading: sensorData.get(deviceId) || null,
    deviceStatus: deviceStatuses.get(deviceId) || 'offline',
    isConnected: connectionState.isConnected,
    error: connectionState.error,
  };
}
