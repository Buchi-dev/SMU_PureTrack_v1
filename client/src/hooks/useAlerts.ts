/**
 * useAlerts - Global Hook for Alert Operations
 * 
 * Provides both read and write operations for water quality alerts.
 * Uses SWR for efficient data fetching and caching.
 * 
 * Read Operations:
 * - List alerts with filtering
 * - Get alert statistics
 * - Real-time updates via polling
 * 
 * Write Operations:
 * - Acknowledge alerts
 * - Resolve alerts
 * 
 * @module hooks/useAlerts
 */

import useSWR, { mutate } from 'swr';
import { useState, useCallback, useEffect } from 'react';
import { alertsService, type AlertFilters, type AlertStats } from '../services/alerts.Service';
import type { WaterQualityAlert } from '../schemas';
import { io, Socket } from 'socket.io-client';
import { auth } from '../config/firebase.config';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseAlertsOptions {
  filters?: AlertFilters;
  enabled?: boolean;
  pollInterval?: number;
}

export interface UseAlertsReturn {
  alerts: WaterQualityAlert[];
  stats: AlertStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: () => Promise<void>;
}

export interface UseAlertMutationsReturn {
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string, notes?: string) => Promise<void>;
  resolveAllAlerts: (notes?: string, filters?: { severity?: string; parameter?: string; deviceId?: string }) => Promise<{ resolvedCount: number }>;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// READ HOOK - Fetch and subscribe to alerts
// ============================================================================

/**
 * Fetch alerts with optional filtering
 * 
 * @example
 * const { alerts, stats, isLoading, refetch } = useAlerts({
 *   filters: { status: 'Unacknowledged', severity: 'Critical' }
 * });
 */
export function useAlerts(options: UseAlertsOptions = {}): UseAlertsReturn {
  const {
    filters = {},
    enabled = true,
  } = options;

  // Generate cache key from filters
  const cacheKey = enabled
    ? ['alerts', 'list', JSON.stringify(filters)]
    : null;

  // Fetch alerts with SWR
  const {
    data: alertsData,
    error: alertsError,
    mutate,
    isLoading: alertsLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await alertsService.getAlerts(filters);
      return response.data;
    },
    {
      revalidateOnFocus: false, // Rely on manual refresh or polling
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Prevent duplicate requests for 60 seconds (increased from 10s)
      keepPreviousData: true, // Keep showing old data while fetching
    }
  );

  // Fetch stats
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR(
    enabled ? ['alerts', 'stats'] : null,
    async () => {
      const response = await alertsService.getAlertStats();
      return response.data;
    },
    {
      revalidateOnFocus: false, // Stats don't change frequently
      dedupingInterval: 60000, // Prevent duplicate requests for 60 seconds (increased from 15s)
      keepPreviousData: true, // Keep showing old data while fetching
    }
  );

  // 🔥 WebSocket: Real-time alert updates
  useEffect(() => {
    if (!enabled) return;

    let socket: Socket | null = null;

    const setupWebSocket = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('📡 [useAlerts] No authenticated user, skipping WebSocket setup');
          return;
        }

        const token = await currentUser.getIdToken();
        
        socket = io(WS_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
        });

        socket.on('connect', () => {
          console.log('✅ [useAlerts] WebSocket connected', socket?.id);
          socket?.emit('subscribe:alerts');
        });

        // Listen for new alerts
        socket.on('alert:new', (payload: { alert: WaterQualityAlert; timestamp: number }) => {
          console.log('📡 [useAlerts] New alert received via WebSocket:', payload.alert._id);
          
          mutate((currentAlerts) => {
            if (!currentAlerts || !Array.isArray(currentAlerts)) return [payload.alert];
            
            // Check if alert already exists (prevent duplicates)
            const exists = currentAlerts.some(a => a._id === payload.alert._id);
            if (exists) return currentAlerts;
            
            // Add new alert to the beginning of the list
            return [payload.alert, ...currentAlerts];
          }, false); // false = don't revalidate, just update cache
        });

        // Listen for alert resolutions
        socket.on('alert:resolved', (payload: { alertId: string; deviceId: string; timestamp: number }) => {
          console.log('📡 [useAlerts] Alert resolved via WebSocket:', payload.alertId);
          
          mutate((currentAlerts) => {
            if (!currentAlerts || !Array.isArray(currentAlerts)) return currentAlerts;
            
            // Remove resolved alert from list
            return currentAlerts.filter(a => a._id !== payload.alertId);
          }, false);
        });

        socket.on('connect_error', (error) => {
          console.error('❌ [useAlerts] WebSocket connection error:', error);
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 [useAlerts] WebSocket disconnected:', reason);
        });

      } catch (error) {
        console.error('❌ [useAlerts] WebSocket setup error:', error);
      }
    };

    setupWebSocket();

    return () => {
      if (socket) {
        console.log('🔌 [useAlerts] Disconnecting WebSocket');
        socket.emit('unsubscribe:alerts');
        socket.disconnect();
      }
    };
  }, [enabled, mutate]);

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    alerts: alertsData || [],
    stats: statsData || null,
    isLoading: alertsLoading || statsLoading,
    error: alertsError || statsError || null,
    refetch,
    mutate: async () => { await mutate(); },
  };
}

// ============================================================================
// WRITE HOOK - Alert mutations with optimistic updates
// ============================================================================

/**
 * Perform write operations on alerts (acknowledge, resolve)
 * with automatic cache updates for instant UI feedback
 * 
 * @example
 * const { acknowledgeAlert, resolveAlert, isLoading } = useAlertMutations();
 * 
 * await acknowledgeAlert('alert-123');
 * await resolveAlert('alert-456');
 */
export function useAlertMutations(): UseAlertMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Perform the API call
      const response = await alertsService.acknowledgeAlert(alertId);
      
      if (import.meta.env.DEV) {
        console.log('[useAlertMutations] Acknowledge response:', response);
      }
      
      // Update all alert list caches with server response and revalidate
      await mutate(
        (key: any) => Array.isArray(key) && key[0] === 'alerts' && key[1] === 'list',
        async (currentData: WaterQualityAlert[] | undefined) => {
          if (import.meta.env.DEV) {
            console.log('[useAlertMutations] Current cache data:', currentData);
          }
          if (!currentData) return currentData;
          
          // Update the specific alert in the list with server response
          const updated = currentData.map(alert => {
            if (alert.id === alertId) {
              if (import.meta.env.DEV) {
                console.log('[useAlertMutations] Updating alert:', alert.id, 'from', alert.status, 'to Acknowledged');
              }
              // Use the full server response to ensure consistency
              return { ...alert, ...response.data };
            }
            return alert;
          });
          if (import.meta.env.DEV) {
            console.log('[useAlertMutations] Updated cache:', updated);
          }
          return updated;
        },
        { revalidate: true } // Revalidate to ensure UI is in sync with server
      );

      // Update stats cache - trigger refetch
      await mutate(
        (key: any) => Array.isArray(key) && key[0] === 'alerts' && key[1] === 'stats',
        undefined,
        { revalidate: true } // Revalidate stats from server
      );
      
      if (import.meta.env.DEV) {
        console.log('[useAlertMutations] Cache update complete');
      }
    } catch (err) {
      console.error('[useAlertMutations] Acknowledge error:', err);
      const error = err instanceof Error ? err : new Error('Failed to acknowledge alert');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string, notes?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Perform the API call
      const response = await alertsService.resolveAlert(alertId, notes);
      
      if (import.meta.env.DEV) {
        console.log('[useAlertMutations] Resolve response:', response);
      }
      
      // Update all alert list caches with server response and revalidate
      await mutate(
        (key: any) => Array.isArray(key) && key[0] === 'alerts' && key[1] === 'list',
        async (currentData: WaterQualityAlert[] | undefined) => {
          if (import.meta.env.DEV) {
            console.log('[useAlertMutations] Current cache data:', currentData);
          }
          if (!currentData) return currentData;
          
          // Update the specific alert in the list with server response
          const updated = currentData.map(alert => {
            if (alert.id === alertId) {
              if (import.meta.env.DEV) {
                console.log('[useAlertMutations] Updating alert:', alert.id, 'from', alert.status, 'to Resolved');
              }
              // Use the full server response to ensure consistency
              return { ...alert, ...response.data };
            }
            return alert;
          });
          if (import.meta.env.DEV) {
            console.log('[useAlertMutations] Updated cache:', updated);
          }
          return updated;
        },
        { revalidate: true } // Revalidate to ensure UI is in sync with server
      );

      // Update stats cache - trigger refetch
      await mutate(
        (key: any) => Array.isArray(key) && key[0] === 'alerts' && key[1] === 'stats',
        undefined,
        { revalidate: true } // Revalidate stats from server
      );
      
      if (import.meta.env.DEV) {
        console.log('[useAlertMutations] Cache update complete');
      }
    } catch (err) {
      console.error('[useAlertMutations] Resolve error:', err);
      const error = err instanceof Error ? err : new Error('Failed to resolve alert');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveAllAlerts = useCallback(async (
    notes?: string,
    filters?: { severity?: string; parameter?: string; deviceId?: string }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      // Perform the API call
      const response = await alertsService.resolveAllAlerts(notes, filters);
      
      if (import.meta.env.DEV) {
        console.log('[useAlertMutations] Resolve all response:', response);
      }
      
      // Invalidate all alert caches to trigger full refetch
      await mutate(
        (key: any) => Array.isArray(key) && key[0] === 'alerts',
        undefined,
        { revalidate: true }
      );
      
      if (import.meta.env.DEV) {
        console.log('[useAlertMutations] Cache invalidation complete');
      }

      return { resolvedCount: response.data.resolvedCount };
    } catch (err) {
      console.error('[useAlertMutations] Resolve all error:', err);
      const error = err instanceof Error ? err : new Error('Failed to resolve all alerts');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    acknowledgeAlert,
    resolveAlert,
    resolveAllAlerts,
    isLoading,
    error,
  };
}
