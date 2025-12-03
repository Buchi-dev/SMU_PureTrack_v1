/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for Express REST API
 * 
 * Server API Structure:
 * - Authentication: /auth/*
 * - Versioned API: /api/v1/*
 * - Health Check: /health
 */

// ==================== API VERSION ====================
// Always use /api/v1 since we're not using proxy anymore
const API_VERSION = '/api/v1';

// ==================== AUTHENTICATION ====================
export const AUTH_ENDPOINTS = {
  VERIFY_TOKEN: '/auth/verify-token',
  CURRENT_USER: '/auth/current-user',
  STATUS: '/auth/status',
  LOGOUT: '/auth/logout',
} as const;

// ==================== USERS ====================
export const USER_ENDPOINTS = {
  LIST: `${API_VERSION}/users`,
  BY_ID: (userId: string) => `${API_VERSION}/users/${userId}`,
  UPDATE_ROLE: (userId: string) => `${API_VERSION}/users/${userId}/role`,
  UPDATE_STATUS: (userId: string) => `${API_VERSION}/users/${userId}/status`,
  UPDATE_PROFILE: (userId: string) => `${API_VERSION}/users/${userId}/profile`,
  COMPLETE_PROFILE: (userId: string) => `${API_VERSION}/users/${userId}/complete-profile`,
  DELETE: (userId: string) => `${API_VERSION}/users/${userId}`,
  PREFERENCES: (userId: string) => `${API_VERSION}/users/${userId}/preferences`,
} as const;

// ==================== ALERTS ====================
export const ALERT_ENDPOINTS = {
  LIST: `${API_VERSION}/alerts`,
  STATS: `${API_VERSION}/alerts/stats`,
  BY_ID: (alertId: string) => `${API_VERSION}/alerts/${alertId}`,
  ACKNOWLEDGE: (alertId: string) => `${API_VERSION}/alerts/${alertId}/acknowledge`,
  RESOLVE: (alertId: string) => `${API_VERSION}/alerts/${alertId}/resolve`,
  CREATE: `${API_VERSION}/alerts`,
  DELETE: (alertId: string) => `${API_VERSION}/alerts/${alertId}`,
} as const;

// ==================== DEVICES ====================
export const DEVICE_ENDPOINTS = {
  LIST: `${API_VERSION}/devices`,
  STATS: `${API_VERSION}/devices/stats`,
  BY_ID: (deviceId: string) => `${API_VERSION}/devices/${deviceId}`,
  READINGS: (deviceId: string) => `${API_VERSION}/devices/${deviceId}/readings`,
  UPDATE: (deviceId: string) => `${API_VERSION}/devices/${deviceId}`,
  DELETE: (deviceId: string) => `${API_VERSION}/devices/${deviceId}`,
  PROCESS_READING: `${API_VERSION}/devices/readings`,
} as const;

// ==================== REPORTS ====================
export const REPORT_ENDPOINTS = {
  WATER_QUALITY: `${API_VERSION}/reports/water-quality`,
  DEVICE_STATUS: `${API_VERSION}/reports/device-status`,
  LIST: `${API_VERSION}/reports`,
  HISTORY: `${API_VERSION}/reports/history`,
  DOWNLOAD: (fileId: string) => `${API_VERSION}/reports/download/${fileId}`,
  BY_ID: (reportId: string) => `${API_VERSION}/reports/${reportId}`,
  DELETE: (reportId: string) => `${API_VERSION}/reports/${reportId}`,
} as const;

// ==================== ANALYTICS ====================
export const ANALYTICS_ENDPOINTS = {
  SUMMARY: `${API_VERSION}/analytics/summary`,
  TRENDS: `${API_VERSION}/analytics/trends`,
  PARAMETERS: `${API_VERSION}/analytics/parameters`,
} as const;

// ==================== QUERY BUILDERS ====================
/**
 * Build query string from object
 */
export const buildQuery = (params: Record<string, string | number | boolean | string[] | undefined | null>): string => {
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
  // Map client 'Active' status to server 'Unacknowledged' status
  const mappedFilters = filters ? {
    ...filters,
    status: filters.status === 'Active' ? 'Unacknowledged' : filters.status,
  } : undefined;
  
  return ALERT_ENDPOINTS.LIST + (mappedFilters ? buildQuery(mappedFilters) : '');
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
