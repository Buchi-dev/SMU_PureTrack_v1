import useSWR from 'swr';
import { useEffect, useState } from 'react';
import healthService, { type HealthStatus } from '../services/health.Service';
import { io, Socket } from 'socket.io-client';
import { auth } from '../config/firebase.config';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

interface UseHealthOptions {
  enabled?: boolean;
}

export function useHealth(options: UseHealthOptions = {}) {
  const { enabled = true } = options;
  const cacheKey = enabled ? ['health', 'system'] : null;
  const [isStale, setIsStale] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    cacheKey,
    async () => await healthService.getSystemHealth(),
    {
      refreshInterval: 0, // 🔥 DISABLED - WebSocket provides real-time updates
      revalidateOnFocus: false,
      revalidateOnReconnect: true, // Refetch when network reconnects
      dedupingInterval: 5000,
      keepPreviousData: true,
      revalidateOnMount: true, // Initial fetch on mount
    }
  );

  // 🔥 WebSocket: Real-time system health updates
  useEffect(() => {
    if (!enabled) return;

    let socket: Socket | null = null;
    let reconnectAttempts = 0;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const setupWebSocket = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('📊 [useHealth] No authenticated user, skipping WebSocket setup');
          return;
        }

        const token = await currentUser.getIdToken();

        socket = io(WS_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 30000,
          reconnectionAttempts: Infinity,
        });

        socket.on('connect', () => {
          console.log('✅ [useHealth] WebSocket connected', socket?.id);
          setIsStale(false);
          reconnectAttempts = 0;

          // Fetch fresh data on reconnection
          mutate();
        });

        // Listen for system health updates
        socket.on('system:health', (payload: { data: any; timestamp: number }) => {
          console.log('📊 [useHealth] System health update received via WebSocket');

          mutate(() => payload.data, false); // Update cache without revalidation
          setIsStale(false);
        });

        socket.on('connect_error', (error) => {
          console.error('❌ [useHealth] WebSocket connection error:', error);
          reconnectAttempts++;

          // Mark data as stale after failed connection
          setIsStale(true);

          // Exponential backoff: 1s, 2s, 4s, 8s, up to 30s
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
          console.log(`⏳ [useHealth] Reconnecting in ${delay / 1000}s...`);
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 [useHealth] WebSocket disconnected:', reason);
          setIsStale(true);

          if (reason === 'io server disconnect') {
            // Server forcibly disconnected - try to reconnect
            socket?.connect();
          }
        });
      } catch (error) {
        console.error('❌ [useHealth] WebSocket setup error:', error);
        setIsStale(true);
      }
    };

    setupWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socket) {
        console.log('🔌 [useHealth] Disconnecting WebSocket');
        socket.disconnect();
      }
    };
  }, [enabled, mutate]);

  return {
    health: data || null,
    isLoading,
    isStale, // Indicates if data might be outdated due to connection issues
  };
}

export function useHealthStatusBadge(status: HealthStatus) {
  switch (status) {
    case 'ok': return { color: 'success', text: 'OK', icon: 'check' };
    case 'warning': return { color: 'warning', text: 'Warning', icon: 'warning' };
    case 'critical': return { color: 'error', text: 'Critical', icon: 'error' };
    case 'error': return { color: 'error', text: 'Error', icon: 'error' };
    default: return { color: 'default', text: 'Unknown', icon: 'question' };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}
