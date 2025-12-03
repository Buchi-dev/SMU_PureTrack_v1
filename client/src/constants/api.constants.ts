/**
 * API Configuration Constants
 * HTTP status codes, timeouts, retry logic, and API-related configuration
 * Matches V2 backend configuration where applicable
 * Source: server_v2/src/core/configs/constants.config.ts
 */

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Request Timeout Configuration (milliseconds)
 * Matches backend timeout settings
 */
export const REQUEST_TIMEOUT = {
  DEFAULT: 30000, // 30 seconds - standard API requests
  LONG: 60000, // 60 seconds - report generation, large data
  SHORT: 10000, // 10 seconds - quick checks, health endpoints
  UPLOAD: 120000, // 2 minutes - file uploads
  DOWNLOAD: 180000, // 3 minutes - file downloads
} as const;

/**
 * Retry Configuration
 * Exponential backoff for failed requests
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3, // Maximum number of retry attempts
  INITIAL_DELAY: 1000, // 1 second initial delay
  MAX_DELAY: 30000, // 30 seconds maximum delay
  BACKOFF_FACTOR: 2, // Exponential backoff multiplier
  RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504], // Status codes to retry
} as const;

/**
 * SWR Configuration
 * Data fetching and caching behavior
 */
export const SWR_CONFIG = {
  // Revalidation intervals (milliseconds)
  REFRESH_INTERVAL: {
    REALTIME: 5000, // 5 seconds - real-time data (sensor readings)
    FREQUENT: 30000, // 30 seconds - frequently updated data (device status, active alerts)
    MODERATE: 60000, // 60 seconds - moderately updated data (alert statistics)
    INFREQUENT: 300000, // 5 minutes - infrequently updated data (reports, user lists)
  },
  
  // Revalidation triggers
  REVALIDATE_ON_FOCUS: true, // Revalidate when window regains focus
  REVALIDATE_ON_RECONNECT: true, // Revalidate when network reconnects
  REVALIDATE_IF_STALE: true, // Revalidate if data is stale
  
  // Cache settings
  DEDUPE_INTERVAL: 2000, // 2 seconds - prevent duplicate requests
  CACHE_TIME: 300000, // 5 minutes - cache lifetime
  
  // Error handling
  ERROR_RETRY_COUNT: 3, // Max retries on error
  ERROR_RETRY_INTERVAL: 5000, // 5 seconds between retries
  SHOULD_RETRY_ON_ERROR: true, // Enable automatic error retry
} as const;

/**
 * Pagination Configuration
 * Matches backend pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1, // Default page number
  DEFAULT_PAGE_SIZE: 10, // Default items per page
  MAX_PAGE_SIZE: 100, // Maximum items per page
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100], // Available page size options
} as const;

/**
 * Rate Limiting (Client-side)
 * Matches backend rate limit settings
 */
export const RATE_LIMIT = {
  MAX_REQUESTS_PER_WINDOW: 100, // Max requests per time window
  WINDOW_MS: 60000, // 1 minute time window
  DELAY_AFTER: 80, // Start delaying after this many requests
  DELAY_MS: 500, // Delay to add per request
} as const;

/**
 * File Upload Configuration
 */
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10, // Maximum file size in MB
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // Maximum file size in bytes
  ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'text/csv'],
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks for large uploads
} as const;

/**
 * WebSocket Configuration
 * For real-time updates
 */
export const WEBSOCKET = {
  RECONNECT_INTERVAL: 5000, // 5 seconds between reconnection attempts
  MAX_RECONNECT_ATTEMPTS: 10, // Maximum reconnection attempts
  PING_INTERVAL: 30000, // 30 seconds ping interval
  PING_TIMEOUT: 5000, // 5 seconds ping timeout
} as const;

/**
 * API Headers
 */
export const API_HEADERS = {
  CONTENT_TYPE_JSON: { 'Content-Type': 'application/json' },
  CONTENT_TYPE_FORM: { 'Content-Type': 'multipart/form-data' },
  ACCEPT_JSON: { Accept: 'application/json' },
} as const;

/**
 * Cache Keys
 * Standardized keys for SWR and local storage
 */
export const CACHE_KEYS = {
  // Authentication
  AUTH_TOKEN: 'auth_token',
  USER_SESSION: 'user_session',
  
  // User data
  CURRENT_USER: '/api/v1/users/me',
  USER_LIST: '/api/v1/users',
  
  // Devices
  DEVICE_LIST: '/api/v1/devices',
  DEVICE_DETAIL: (id: string) => `/api/v1/devices/${id}`,
  
  // Alerts
  ALERT_LIST: '/api/v1/alerts',
  ALERT_STATS: '/api/v1/alerts/statistics',
  ALERT_DETAIL: (id: string) => `/api/v1/alerts/${id}`,
  
  // Sensor Readings
  SENSOR_READINGS: '/api/v1/sensor-readings',
  SENSOR_LATEST: '/api/v1/sensor-readings/latest',
  
  // Reports
  REPORT_LIST: '/api/v1/reports',
  REPORT_DETAIL: (id: string) => `/api/v1/reports/${id}`,
  
  // Analytics
  ANALYTICS_OVERVIEW: '/api/v1/analytics/overview',
  ANALYTICS_TRENDS: '/api/v1/analytics/trends',
  
  // Health
  HEALTH_STATUS: '/api/v1/health',
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  THEME_MODE: 'theme_mode',
  USER_PREFERENCES: 'user_preferences',
  AUTH_TOKEN: 'auth_token',
  LAST_ACTIVE: 'last_active',
  NOTIFICATION_SETTINGS: 'notification_settings',
} as const;

/**
 * API Response Structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    totalPages?: number;
    totalItems?: number;
  };
}

/**
 * Pagination Parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Helper function to build cache key with params
 */
export const buildCacheKey = (
  endpoint: string,
  params?: Record<string, any>
): string => {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }
  
  const queryString = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  ).toString();
  
  return `${endpoint}?${queryString}`;
};

/**
 * Helper function to check if response is successful
 */
export const isSuccessStatus = (status: number): boolean => {
  return status >= 200 && status < 300;
};

/**
 * Helper function to check if status code should trigger retry
 */
export const shouldRetry = (status: number): boolean => {
  return (RETRY_CONFIG.RETRY_STATUS_CODES as readonly number[]).includes(status);
};

/**
 * Calculate exponential backoff delay
 */
export const getBackoffDelay = (attempt: number): number => {
  const delay = RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, attempt);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY);
};
