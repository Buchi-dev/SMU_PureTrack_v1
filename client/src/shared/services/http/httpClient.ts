/**
 * HTTP Client
 * Centralized Axios client with interceptors and configuration
 */

import axios from 'axios';
import type { AxiosInstance, CreateAxiosDefaults } from 'axios';
import { setupInterceptors } from './httpInterceptor';
import { API_BASE_URLS, API_TIMEOUTS, API_HEADERS } from '../../constants';

/**
 * Create a configured Axios instance
 */
const createHttpClient = (config: CreateAxiosDefaults = {}): AxiosInstance => {
  const instance = axios.create({
    headers: API_HEADERS.JSON,
    timeout: API_TIMEOUTS.DEFAULT,
    ...config,
  });

  // Setup interceptors
  setupInterceptors(instance);

  return instance;
};

/**
 * Device Management HTTP Client
 */
export const deviceHttpClient: AxiosInstance = createHttpClient({
  baseURL: API_BASE_URLS.DEVICE_MANAGEMENT,
  timeout: API_TIMEOUTS.DEFAULT,
});

/**
 * Report Generation HTTP Client
 * Uses longer timeout for report generation
 */
export const reportHttpClient: AxiosInstance = createHttpClient({
  baseURL: API_BASE_URLS.REPORT_GENERATION,
  timeout: API_TIMEOUTS.REPORT_GENERATION,
});

/**
 * Create a custom HTTP client with specific configuration
 */
export const createCustomHttpClient = (config: CreateAxiosDefaults): AxiosInstance => {
  return createHttpClient(config);
};

/**
 * Default HTTP client (can be used for generic requests)
 */
export const httpClient: AxiosInstance = createHttpClient();

// Export axios for direct use if needed
export { axios };
