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
import { useState, useCallback } from 'react';
import { alertsService, type AlertFilters, type AlertStats } from '../services/alerts.Service';
import type { WaterQualityAlert } from '../schemas';

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
      dedupingInterval: 10000, // Prevent duplicate requests for 10 seconds
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
      dedupingInterval: 15000, // Increased deduping interval
    }
  );

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
      console.log('[useAlertMutations] Acknowledge response:', response);
      
      // Optimistically update all alert caches
      // Update all alert list caches
      await mutate(
        (key: any) => Array.isArray(key) && key[0] === 'alerts' && key[1] === 'list',
        async (currentData: WaterQualityAlert[] | undefined) => {
          console.log('[useAlertMutations] Current cache data:', currentData);
          if (!currentData) return currentData;
          
          // Update the specific alert in the list
          const updated = currentData.map(alert => {
            if (alert.id === alertId) {
              console.log('[useAlertMutations] Updating alert:', alert.id, 'from', alert.status, 'to Acknowledged');
              return { ...alert, ...response.data, status: 'Acknowledged' as const };
            }
            return alert;
          });
          console.log('[useAlertMutations] Updated cache:', updated);
          return updated;
        },
        { revalidate: false } // Don't refetch, trust the optimistic update
      );

      // Update stats cache - trigger refetch
      await mutate(
        (key: any) => Array.isArray(key) && key[0] === 'alerts' && key[1] === 'stats',
        undefined,
        { revalidate: true } // Revalidate stats from server
      );
      
      console.log('[useAlertMutations] Cache update complete');
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
      console.log('[useAlertMutations] Resolve response:', response);
      
      // Optimistically update all alert caches
      // Update all alert list caches
      await mutate(
        (key: any) => Array.isArray(key) && key[0] === 'alerts' && key[1] === 'list',
        async (currentData: WaterQualityAlert[] | undefined) => {
          console.log('[useAlertMutations] Current cache data:', currentData);
          if (!currentData) return currentData;
          
          // Update the specific alert in the list
          const updated = currentData.map(alert => {
            if (alert.id === alertId) {
              console.log('[useAlertMutations] Updating alert:', alert.id, 'from', alert.status, 'to Resolved');
              return { ...alert, ...response.data, status: 'Resolved' as const, resolutionNotes: notes };
            }
            return alert;
          });
          console.log('[useAlertMutations] Updated cache:', updated);
          return updated;
        },
        { revalidate: false } // Don't refetch, trust the optimistic update
      );

      // Update stats cache - trigger refetch
      await mutate(
        (key: any) => Array.isArray(key) && key[0] === 'alerts' && key[1] === 'stats',
        undefined,
        { revalidate: true } // Revalidate stats from server
      );
      
      console.log('[useAlertMutations] Cache update complete');
    } catch (err) {
      console.error('[useAlertMutations] Resolve error:', err);
      const error = err instanceof Error ? err : new Error('Failed to resolve alert');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    acknowledgeAlert,
    resolveAlert,
    isLoading,
    error,
  };
}
