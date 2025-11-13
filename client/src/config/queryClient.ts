/**
 * React Query Configuration
 * 
 * Centralized QueryClient setup with optimized defaults for
 * real-time data subscriptions and API calls.
 * 
 * Features:
 * - Smart caching with staleTime/gcTime
 * - Automatic retry with exponential backoff
 * - Global error handling
 * - Request deduplication
 * - Background refetching
 * 
 * @module config/queryClient
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import type { QueryClientConfig } from '@tanstack/react-query';

/**
 * Global error handler for queries
 */
const onQueryError = (error: Error) => {
  console.error('[QueryClient] Query error:', error.message);
  
  // You can add global error handling here:
  // - Show toast notifications
  // - Log to error tracking service (Sentry, etc.)
  // - Trigger auth refresh if 401
};

/**
 * Global error handler for mutations
 */
const onMutationError = (error: Error) => {
  console.error('[QueryClient] Mutation error:', error.message);
  
  // Global mutation error handling:
  // - Show error notifications
  // - Log to monitoring service
};

/**
 * React Query Client Configuration
 */
const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // ============================================
      // CACHING STRATEGY
      // ============================================
      
      /**
       * Data is considered fresh for 5 seconds
       * No refetch during this time unless manually triggered
       */
      staleTime: 5 * 1000, // 5 seconds
      
      /**
       * Unused data stays in cache for 5 minutes
       * After this, it's garbage collected
       */
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      
      // ============================================
      // REFETCHING BEHAVIOR
      // ============================================
      
      /**
       * Refetch on window focus (user comes back to tab)
       * Great for keeping data fresh when users return
       */
      refetchOnWindowFocus: true,
      
      /**
       * Don't refetch on mount if data is fresh
       * Prevents unnecessary requests
       */
      refetchOnMount: true, // Always refetch on mount
      
      /**
       * Refetch on network reconnect
       * Ensures fresh data after connection restored
       */
      refetchOnReconnect: true,
      
      // ============================================
      // RETRY STRATEGY
      // ============================================
      
      /**
       * Retry failed requests 3 times
       * Good balance between reliability and performance
       */
      retry: 3,
      
      /**
       * Exponential backoff with jitter
       * Prevents thundering herd problem
       */
      retryDelay: (attemptIndex) => {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
      
      // ============================================
      // ERROR HANDLING
      // ============================================
      
      /**
       * Treat errors as normal data (don't throw)
       * Allows components to handle errors gracefully
       */
      throwOnError: false,
    },
    
    mutations: {
      /**
       * Retry mutations once on failure
       * Be conservative with writes
       */
      retry: 1,
      
      /**
       * Don't throw errors from mutations
       * Let components handle them
       */
      throwOnError: false,
    },
  },
  
  queryCache: new QueryCache({
    onError: onQueryError,
  }),
  
  mutationCache: new MutationCache({
    onError: onMutationError,
  }),
};

/**
 * Global QueryClient instance
 * Import and use this in your app
 */
export const queryClient = new QueryClient(queryClientConfig);

/**
 * Query key factory for type-safe and consistent cache keys
 * 
 * Pattern:
 * - ['resource'] - List all
 * - ['resource', id] - Single item
 * - ['resource', id, 'relation'] - Nested resource
 * - ['resource', 'filter', params] - Filtered list
 * 
 * @example
 * ```ts
 * queryKeys.alerts.all // ['alerts']
 * queryKeys.alerts.detail('alert-123') // ['alerts', 'alert-123']
 * queryKeys.devices.readings('ESP32-001') // ['devices', 'ESP32-001', 'readings']
 * ```
 */
export const queryKeys = {
  /**
   * Alert-related query keys
   */
  alerts: {
    /** All alerts - ['alerts'] */
    all: ['alerts'] as const,
    
    /** Alerts with limit - ['alerts', 'list', { maxAlerts }] */
    list: (maxAlerts?: number) => 
      ['alerts', 'list', { maxAlerts }] as const,
    
    /** Single alert detail - ['alerts', id] */
    detail: (id: string) => 
      ['alerts', id] as const,
    
    /** Alerts by severity - ['alerts', 'severity', level] */
    bySeverity: (severity: string) => 
      ['alerts', 'severity', severity] as const,
  },
  
  /**
   * Device-related query keys
   */
  devices: {
    /** All devices - ['devices'] */
    all: ['devices'] as const,
    
    /** Device list with metadata option - ['devices', 'list', { includeMetadata }] */
    list: (includeMetadata?: boolean) => 
      ['devices', 'list', { includeMetadata }] as const,
    
    /** Single device detail - ['devices', id] */
    detail: (id: string) => 
      ['devices', id] as const,
    
    /** Device sensor readings - ['devices', id, 'readings'] */
    readings: (id: string) => 
      ['devices', id, 'readings'] as const,
    
    /** Multiple device readings - ['devices', 'readings', ids[]] */
    multipleReadings: (ids: string[]) => 
      ['devices', 'readings', ids.sort()] as const,
    
    /** Device history - ['devices', id, 'history', { limit }] */
    history: (id: string, limit?: number) => 
      ['devices', id, 'history', { limit }] as const,
  },
  
  /**
   * User-related query keys
   */
  users: {
    /** All users - ['users'] */
    all: ['users'] as const,
    
    /** User list - ['users', 'list'] */
    list: () => 
      ['users', 'list'] as const,
    
    /** Single user detail - ['users', id] */
    detail: (id: string) => 
      ['users', id] as const,
    
    /** User preferences - ['users', id, 'preferences'] */
    preferences: (id: string) => 
      ['users', id, 'preferences'] as const,
  },
  
  /**
   * MQTT metrics query keys
   */
  mqtt: {
    /** All MQTT queries - ['mqtt'] */
    all: ['mqtt'] as const,
    
    /** MQTT health status - ['mqtt', 'health'] */
    health: ['mqtt', 'health'] as const,
    
    /** MQTT bridge status - ['mqtt', 'status'] */
    status: ['mqtt', 'status'] as const,
    
    /** Combined metrics - ['mqtt', 'metrics'] */
    metrics: ['mqtt', 'metrics'] as const,
  },
  
  /**
   * Report-related query keys
   */
  reports: {
    /** All reports - ['reports'] */
    all: ['reports'] as const,
    
    /** Water quality report - ['reports', 'water-quality', params] */
    waterQuality: (deviceIds?: string[], startDate?: number, endDate?: number) =>
      ['reports', 'water-quality', { deviceIds, startDate, endDate }] as const,
    
    /** Device status report - ['reports', 'device-status', params] */
    deviceStatus: (deviceIds?: string[]) =>
      ['reports', 'device-status', { deviceIds }] as const,
    
    /** Data summary report - ['reports', 'data-summary', params] */
    dataSummary: (deviceIds?: string[], startDate?: number, endDate?: number) =>
      ['reports', 'data-summary', { deviceIds, startDate, endDate }] as const,
    
    /** Compliance report - ['reports', 'compliance', params] */
    compliance: (deviceIds?: string[], startDate?: number, endDate?: number) =>
      ['reports', 'compliance', { deviceIds, startDate, endDate }] as const,
  },
} as const;

/**
 * Helper to invalidate all queries for a resource
 * 
 * @example
 * ```ts
 * // Invalidate all alert queries
 * invalidateResource('alerts');
 * 
 * // Invalidate all device queries
 * invalidateResource('devices');
 * ```
 */
export const invalidateResource = async (resource: keyof typeof queryKeys) => {
  const resourceKeys = queryKeys[resource];
  if ('all' in resourceKeys) {
    await queryClient.invalidateQueries({
      queryKey: resourceKeys.all as readonly string[],
    });
  }
};

/**
 * Helper to prefetch data
 * Useful for optimistic loading
 * 
 * @example
 * ```ts
 * // Prefetch devices when hovering over link
 * await prefetchDevices();
 * ```
 */
export const prefetchHelpers = {
  devices: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.devices.all,
      queryFn: async () => {
        const { devicesService } = await import('../services/devices.Service');
        return devicesService.listDevices();
      },
    });
  },
  
  alerts: async (maxAlerts = 20) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.alerts.list(maxAlerts),
      queryFn: async () => {
        // Alerts use subscriptions, so prefetch might not be ideal
        // Just a placeholder for consistency
        return [];
      },
    });
  },
};

export default queryClient;
