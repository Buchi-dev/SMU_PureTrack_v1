/**
 * SWR Configuration for Data Fetching with Polling
 * Provides real-time-like updates through HTTP polling with aggressive deduplication
 */
import { type SWRConfiguration } from 'swr';
import { apiClient } from './api.config';
import { isEqual } from 'lodash-es';

/**
 * Request queue for managing burst scenarios
 * Prevents overwhelming the server with simultaneous requests
 */
class RequestQueue {
  private queue: Array<{ url: string; resolver: (value: any) => void; rejecter: (error: any) => void }> = [];
  private processing = false;
  private readonly maxConcurrent = 3; // Max concurrent requests
  private activeRequests = 0;

  async add<T>(url: string, requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolver: resolve, rejecter: reject });
      this.process(requestFn);
    });
  }

  private async process<T>(requestFn: () => Promise<T>) {
    if (this.processing || this.activeRequests >= this.maxConcurrent) return;
    
    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const item = this.queue.shift();
      if (!item) break;

      this.activeRequests++;

      requestFn()
        .then((result) => item.resolver(result))
        .catch((error) => item.rejecter(error))
        .finally(() => {
          this.activeRequests--;
          this.processing = false;
          if (this.queue.length > 0) {
            this.process(requestFn);
          }
        });
    }

    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

/**
 * Active request cancellation tracking
 * Allows cancellation of stale requests when newer ones are made
 */
const activeRequests = new Map<string, AbortController>();

/**
 * Fetcher function for SWR with request cancellation support
 * Extracts data from the response (handles both { data } and direct responses)
 */
export const fetcher = async (url: string) => {
  // Cancel any existing request for this URL
  const existingController = activeRequests.get(url);
  if (existingController) {
    existingController.abort();
    activeRequests.delete(url);
  }

  // Create new AbortController for this request
  const controller = new AbortController();
  activeRequests.set(url, controller);

  try {
    // Use request queue to manage burst scenarios
    const response = await requestQueue.add(url, () =>
      apiClient.get(url, { signal: controller.signal })
    );
    
    // Clean up controller after successful request
    activeRequests.delete(url);
    
    // Extract data from standardized API response { success, data }
    // Backend returns: { success: true, data: [...], pagination?: {...} }
    // We return the full response to preserve pagination info
    return response.data;
  } catch (error: any) {
    // Clean up controller
    activeRequests.delete(url);
    
    // Don't throw error for cancelled requests
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      console.debug(`[SWR] Request cancelled: ${url}`);
      throw error; // Let SWR handle it
    }
    
    throw error;
  }
};

/**
 * Deep equality comparison for SWR data
 * Prevents unnecessary re-renders when data is structurally the same
 */
export const compareData = (a: any, b: any): boolean => {
  return isEqual(a, b);
};

/**
 * Base SWR configuration
 * Applied to all SWR hooks unless overridden
 * 
 * OPTIMIZED FOR FRESH DATA (NO AGGRESSIVE CACHING):
 * - Minimal deduping for fresh data on every request
 * - No stale data shown to users
 * - Always revalidate on mount
 * - Deep equality checks prevent unnecessary re-renders
 * - Request cancellation for stale requests
 * - Request queueing for burst scenarios
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  compare: compareData,         // Deep equality check to prevent unnecessary updates
  revalidateOnFocus: false,     // Disabled to prevent refetch on tab switch
  revalidateOnReconnect: true,  // Refetch when network reconnects
  shouldRetryOnError: true,     // Retry failed requests
  errorRetryCount: 3,           // Max retry attempts
  errorRetryInterval: 10000,    // 10 seconds between retries
  dedupingInterval: 0,          // DISABLED: No deduplication - always fetch fresh data
  focusThrottleInterval: 60000, // Throttle focus revalidation to max once per minute
  keepPreviousData: false,      // DISABLED: Don't show stale data
  revalidateIfStale: true,      // Always revalidate stale data
  revalidateOnMount: true,      // Always fetch on mount
  provider: () => new Map(),    // Use global cache provider
  onError: (error: Error) => {
    // Don't log cancelled request errors
    if (error.name !== 'CanceledError' && error.message !== 'canceled') {
      console.error('[SWR Error]', error);
    }
  },
};

/**
 * Real-time polling configuration
 * For critical data that needs frequent updates (alerts, sensor readings)
 * NOTE: Should rely on WebSocket for real-time updates, HTTP polling is fallback only
 */
export const swrRealtimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 60000, // 1 minute fallback polling (WebSocket is primary)
  dedupingInterval: 30000, // 30 second deduplication
};

/**
 * Important data polling configuration
 * For important but less critical data (device list, analytics)
 */
export const swrImportantConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 120000, // 2 minutes
  dedupingInterval: 60000, // 1 minute deduplication
};

/**
 * Static data configuration
 * For data that rarely changes (reports, user profiles)
 * No automatic polling - manual refresh only
 */
export const swrStaticConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 0, // No polling
  revalidateOnFocus: false, // Don't refetch on focus
};

/**
 * Analytics polling configuration
 * Poll every 2 minutes for dashboard analytics
 */
export const swrAnalyticsConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 120000, // Poll every 2 minutes (was 30s)
};
