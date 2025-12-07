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
  COMPLETE_ACCOUNT: '/auth/complete-account',
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
  PREFERENCES: (userId: string) => `${API_VERSION}/users/${userId}/preferences`,
} as const;

// ==================== ALERTS ====================
// ✅ V2 Backend Routes:
// GET /api/v1/alerts - List all alerts
// GET /api/v1/alerts/statistics - Get statistics (not /stats)
// GET /api/v1/alerts/:id - Get by ID
// PATCH /api/v1/alerts/:id/acknowledge - Acknowledge
// PATCH /api/v1/alerts/:id/resolve - Resolve
// DELETE /api/v1/alerts/:id - Delete
export const ALERT_ENDPOINTS = {
  LIST: `${API_VERSION}/alerts`,
  STATS: `${API_VERSION}/alerts/statistics`, // ✅ V2 uses /statistics
  BY_ID: (alertId: string) => `${API_VERSION}/alerts/${alertId}`,
  ACKNOWLEDGE: (alertId: string) => `${API_VERSION}/alerts/${alertId}/acknowledge`,
  RESOLVE: (alertId: string) => `${API_VERSION}/alerts/${alertId}/resolve`,
  RESOLVE_ALL: `${API_VERSION}/alerts/resolve-all`,
  CREATE: `${API_VERSION}/alerts`,
  DELETE: (alertId: string) => `${API_VERSION}/alerts/${alertId}`,
} as const;

// ==================== DEVICES ====================
// ✅ V2 Backend Routes:
// GET /api/v1/devices - List devices
// GET /api/v1/devices/deleted - Get deleted devices
// GET /api/v1/devices/:id - Get by ID
// PUT /api/v1/devices/:id - Update device
// DELETE /api/v1/devices/:id - Delete device
// POST /api/v1/devices/:id/recover - Recover deleted device
export const DEVICE_ENDPOINTS = {
  LIST: `${API_VERSION}/devices`,
  DELETED: `${API_VERSION}/devices/deleted`,
  STATS: `${API_VERSION}/devices/stats`,
  BY_ID: (deviceId: string) => `${API_VERSION}/devices/${deviceId}`,
  READINGS: (deviceId: string) => `${API_VERSION}/devices/${deviceId}/readings`,
  UPDATE: (deviceId: string) => `${API_VERSION}/devices/${deviceId}`,
  DELETE: (deviceId: string) => `${API_VERSION}/devices/${deviceId}`,
  RECOVER: (deviceId: string) => `${API_VERSION}/devices/${deviceId}/recover`,
  PROCESS_READING: `${API_VERSION}/devices/readings`,
} as const;

// ==================== SENSOR READINGS ====================
// ✅ V2 Backend Routes:
// GET /api/v1/sensor-readings - List readings
// GET /api/v1/sensor-readings/statistics - Statistics
// POST /api/v1/sensor-readings - Create reading
// ❌ REMOVED: /sensor-readings/:deviceId/latest → Use WebSocket sensor:data event
export const SENSOR_READING_ENDPOINTS = {
  LIST: `${API_VERSION}/sensor-readings`,
  STATISTICS: `${API_VERSION}/sensor-readings/statistics`,
  AGGREGATED: `${API_VERSION}/sensor-readings/aggregated`,
  COUNT: `${API_VERSION}/sensor-readings/count`,
  CREATE: `${API_VERSION}/sensor-readings`,
  BULK: `${API_VERSION}/sensor-readings/bulk`,
} as const;

// ==================== REPORTS ====================
// ✅ V2 Backend Routes:
// POST /api/v1/reports - Create report (unified endpoint for all report types)
// GET /api/v1/reports - List all reports
// GET /api/v1/reports/history - Alias for list
// GET /api/v1/reports/statistics - Get statistics
// GET /api/v1/reports/:id - Get by ID
// GET /api/v1/reports/:id/download - Download report file
// DELETE /api/v1/reports/:id - Delete report
export const REPORT_ENDPOINTS = {
  LIST: `${API_VERSION}/reports`, // Also used for POST to create reports
  HISTORY: `${API_VERSION}/reports/history`,
  STATISTICS: `${API_VERSION}/reports/statistics`,
  BY_ID: (reportId: string) => `${API_VERSION}/reports/${reportId}`,
  DOWNLOAD: (reportId: string) => `${API_VERSION}/reports/${reportId}/download`,
  DELETE: (reportId: string) => `${API_VERSION}/reports/${reportId}`,
} as const;

// ==================== ANALYTICS ====================
export const ANALYTICS_ENDPOINTS = {
  SUMMARY: `${API_VERSION}/analytics/summary`,
  TRENDS: `${API_VERSION}/analytics/trends`,
  PARAMETERS: `${API_VERSION}/analytics/parameters`,
} as const;

// ==================== HEALTH MONITORING ====================
// ✅ V2 Backend Routes:
// GET /api/v1/health/system - Full system health (initial load + load balancer check)
// ❌ REMOVED: Individual metric endpoints → Use WebSocket system:health event
//   - /health/cpu → WebSocket broadcasts every 10s
//   - /health/memory → WebSocket broadcasts every 10s
//   - /health/storage → WebSocket broadcasts every 10s
//   - /health/database → WebSocket broadcasts every 10s
export const HEALTH_ENDPOINTS = {
  SYSTEM: `${API_VERSION}/health/system`,
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
 * ✅ V2 Backend expects: status, severity, parameter, deviceId, startDate, endDate, page, limit
 */
export const buildAlertsUrl = (filters?: {
  status?: string;
  severity?: string;
  parameter?: string;
  deviceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): string => {
  // ✅ No mapping needed - V2 uses 'Unacknowledged', 'Acknowledged', 'Resolved'
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
