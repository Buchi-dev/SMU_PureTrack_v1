/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for Express REST API
 */

// ==================== AUTHENTICATION ====================
export const AUTH_ENDPOINTS = {
  GOOGLE_LOGIN: '/auth/google',
  GOOGLE_CALLBACK: '/auth/google/callback',
  LOGOUT: '/auth/logout',
  STATUS: '/auth/status',
} as const;

// ==================== USERS ====================
export const USER_ENDPOINTS = {
  LIST: '/api/users',
  BY_ID: (userId: string) => `/api/users/${userId}`,
  UPDATE_ROLE: (userId: string) => `/api/users/${userId}/role`,
  UPDATE_STATUS: (userId: string) => `/api/users/${userId}/status`,
  UPDATE_PROFILE: (userId: string) => `/api/users/${userId}/profile`,
  DELETE: (userId: string) => `/api/users/${userId}`,
  PREFERENCES: (userId: string) => `/api/users/${userId}/preferences`,
} as const;

// ==================== ALERTS ====================
export const ALERT_ENDPOINTS = {
  LIST: '/api/alerts',
  STATS: '/api/alerts/stats',
  BY_ID: (alertId: string) => `/api/alerts/${alertId}`,
  ACKNOWLEDGE: (alertId: string) => `/api/alerts/${alertId}/acknowledge`,
  RESOLVE: (alertId: string) => `/api/alerts/${alertId}/resolve`,
  CREATE: '/api/alerts',
  DELETE: (alertId: string) => `/api/alerts/${alertId}`,
} as const;

// ==================== DEVICES ====================
export const DEVICE_ENDPOINTS = {
  LIST: '/api/devices',
  STATS: '/api/devices/stats',
  BY_ID: (deviceId: string) => `/api/devices/${deviceId}`,
  READINGS: (deviceId: string) => `/api/devices/${deviceId}/readings`,
  UPDATE: (deviceId: string) => `/api/devices/${deviceId}`,
  DELETE: (deviceId: string) => `/api/devices/${deviceId}`,
  PROCESS_READING: '/api/devices/readings',
} as const;

// ==================== REPORTS ====================
export const REPORT_ENDPOINTS = {
  WATER_QUALITY: '/api/reports/water-quality',
  DEVICE_STATUS: '/api/reports/device-status',
  LIST: '/api/reports',
  BY_ID: (reportId: string) => `/api/reports/${reportId}`,
  DELETE: (reportId: string) => `/api/reports/${reportId}`,
} as const;

// ==================== ANALYTICS ====================
export const ANALYTICS_ENDPOINTS = {
  SUMMARY: '/api/analytics/summary',
  TRENDS: '/api/analytics/trends',
  PARAMETERS: '/api/analytics/parameters',
} as const;

// ==================== QUERY BUILDERS ====================
/**
 * Build query string from object
 */
export const buildQuery = (params: Record<string, any>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        query.append(key, value.join(','));
      } else {
        query.append(key, String(value));
      }
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Build alerts list URL with filters
 */
export const buildAlertsUrl = (filters?: {
  status?: string;
  severity?: string;
  deviceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): string => {
  return ALERT_ENDPOINTS.LIST + (filters ? buildQuery(filters) : '');
};

/**
 * Build devices list URL with filters
 */
export const buildDevicesUrl = (filters?: {
  status?: string;
  registrationStatus?: string;
  page?: number;
  limit?: number;
}): string => {
  return DEVICE_ENDPOINTS.LIST + (filters ? buildQuery(filters) : '');
};

/**
 * Build device readings URL with filters
 */
export const buildDeviceReadingsUrl = (
  deviceId: string,
  filters?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
  }
): string => {
  return DEVICE_ENDPOINTS.READINGS(deviceId) + (filters ? buildQuery(filters) : '');
};

/**
 * Build reports list URL with filters
 */
export const buildReportsUrl = (filters?: {
  type?: string;
  status?: string;
  generatedBy?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): string => {
  return REPORT_ENDPOINTS.LIST + (filters ? buildQuery(filters) : '');
};

/**
 * Build analytics trends URL with parameters
 */
export const buildAnalyticsTrendsUrl = (params?: {
  startDate?: string;
  endDate?: string;
  parameter?: string;
  granularity?: string;
  deviceIds?: string[];
}): string => {
  return ANALYTICS_ENDPOINTS.TRENDS + (params ? buildQuery(params) : '');
};

/**
 * Build analytics parameters URL
 */
export const buildAnalyticsParametersUrl = (params?: {
  parameter?: string;
  startDate?: string;
  endDate?: string;
}): string => {
  return ANALYTICS_ENDPOINTS.PARAMETERS + (params ? buildQuery(params) : '');
};

/**
 * Build users list URL with filters
 */
export const buildUsersUrl = (filters?: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): string => {
  return USER_ENDPOINTS.LIST + (filters ? buildQuery(filters) : '');
};
