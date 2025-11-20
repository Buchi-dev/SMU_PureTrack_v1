/**
 * SWR Configuration for Data Fetching with Polling
 * Provides real-time-like updates through HTTP polling
 */
import { type SWRConfiguration } from 'swr';
import { apiClient } from './api.config';

/**
 * Fetcher function for SWR
 * Extracts data from the response (handles both { data } and direct responses)
 */
export const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  // Extract data from standardized API response { success, data }
  return response.data.data || response.data;
};

/**
 * Base SWR configuration
 * Applied to all SWR hooks unless overridden
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,    // Refetch when window regains focus
  revalidateOnReconnect: true, // Refetch when network reconnects
  shouldRetryOnError: true,    // Retry failed requests
  errorRetryCount: 3,          // Max retry attempts
  errorRetryInterval: 5000,    // 5 seconds between retries
  dedupingInterval: 2000,      // Dedupe requests within 2 seconds
  onError: (error: Error) => {
    console.error('[SWR Error]', error);
  },
};

/**
 * Real-time polling configuration
 * For critical data that needs frequent updates (alerts, sensor readings)
 * Poll every 5 seconds
 */
export const swrRealtimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 5000, // Poll every 5 seconds
  dedupingInterval: 1000, // Reduce deduping for real-time data
};

/**
 * Important data polling configuration
 * For important but less critical data (device list, analytics)
 * Poll every 15 seconds
 */
export const swrImportantConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 15000, // Poll every 15 seconds
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
 * Poll every 30 seconds for dashboard analytics
 */
export const swrAnalyticsConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 30000, // Poll every 30 seconds
};
