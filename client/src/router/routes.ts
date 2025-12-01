/**
 * Application Routes
 * Constant route definitions
 */

export const ROUTES = {
  HOME: '/',
  ADMIN: {
    BASE: '/admin',
    DASHBOARD: '/admin/dashboard',
    DEVICES: '/admin/devices',
    READINGS: '/admin/readings',
    ANALYTICS: '/admin/analytics',
    USERS: '/admin/users',
    REPORTS: '/admin/reports',
    REPORT_HISTORY: '/admin/reports/history',
    ALERTS: '/admin/alerts',
    SETTINGS: '/admin/settings',
  },
  STAFF: {
    BASE: '/staff',
    DASHBOARD: '/staff/dashboard',
    DEVICES: '/staff/devices',
    READINGS: '/staff/readings',
    ANALYTICS: '/staff/analytics',
    ALERTS: '/staff/alerts',
    SETTINGS: '/staff/settings',
  },
  AUTH: {
    LOGIN: '/auth/login',
    COMPLETE_ACCOUNT: '/auth/complete-account',
    PENDING_APPROVAL: '/auth/pending-approval',
    ACCOUNT_SUSPENDED: '/auth/account-suspended',
  },
} as const;
