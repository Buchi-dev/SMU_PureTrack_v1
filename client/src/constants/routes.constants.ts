/**
 * Route Path Constants
 * Centralized route definitions for React Router
 * Prevents hardcoded paths and typos across components
 */

/**
 * Public Routes (No Authentication Required)
 */
export const PUBLIC_ROUTES = {
  // Root
  ROOT: '/',
  
  // Authentication
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Error Pages
  NOT_FOUND: '/404',
  UNAUTHORIZED: '/401',
  FORBIDDEN: '/403',
  SERVER_ERROR: '/500',
} as const;

/**
 * Admin Routes (Admin Role Only)
 */
export const ADMIN_ROUTES = {
  // Dashboard
  DASHBOARD: '/admin/dashboard',
  
  // User Management
  USERS: '/admin/users',
  USER_DETAIL: (id: string) => `/admin/users/${id}`,
  USER_CREATE: '/admin/users/new',
  USER_EDIT: (id: string) => `/admin/users/${id}/edit`,
  
  // Device Management
  DEVICES: '/admin/devices',
  DEVICE_DETAIL: (id: string) => `/admin/devices/${id}`,
  DEVICE_CREATE: '/admin/devices/new',
  DEVICE_EDIT: (id: string) => `/admin/devices/${id}/edit`,
  
  // Alert Management
  ALERTS: '/admin/alerts',
  ALERT_DETAIL: (id: string) => `/admin/alerts/${id}`,
  
  // Reports
  REPORTS: '/admin/reports',
  REPORT_DETAIL: (id: string) => `/admin/reports/${id}`,
  REPORT_CREATE: '/admin/reports/new',
  
  // Analytics
  ANALYTICS: '/admin/analytics',
  ANALYTICS_OVERVIEW: '/admin/analytics/overview',
  ANALYTICS_TRENDS: '/admin/analytics/trends',
  ANALYTICS_DEVICE_PERFORMANCE: '/admin/analytics/device-performance',
  ANALYTICS_WATER_QUALITY: '/admin/analytics/water-quality',
  
  // System Settings
  SETTINGS: '/admin/settings',
  SETTINGS_GENERAL: '/admin/settings/general',
  SETTINGS_NOTIFICATIONS: '/admin/settings/notifications',
  SETTINGS_THRESHOLDS: '/admin/settings/thresholds',
  SETTINGS_SYSTEM: '/admin/settings/system',
  
  // System Health
  HEALTH: '/admin/health',
} as const;

/**
 * Staff Routes (Staff Role)
 */
export const STAFF_ROUTES = {
  // Dashboard
  DASHBOARD: '/staff/dashboard',
  
  // Device Monitoring
  DEVICES: '/staff/devices',
  DEVICE_DETAIL: (id: string) => `/staff/devices/${id}`,
  
  // Alert Monitoring
  ALERTS: '/staff/alerts',
  ALERT_DETAIL: (id: string) => `/staff/alerts/${id}`,
  
  // Reports (View Only)
  REPORTS: '/staff/reports',
  REPORT_DETAIL: (id: string) => `/staff/reports/${id}`,
  
  // Analytics (View Only)
  ANALYTICS: '/staff/analytics',
  ANALYTICS_OVERVIEW: '/staff/analytics/overview',
  ANALYTICS_TRENDS: '/staff/analytics/trends',
} as const;

/**
 * Common Protected Routes (All Authenticated Users)
 */
export const PROTECTED_ROUTES = {
  // Profile
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  PROFILE_SETTINGS: '/profile/settings',
  
  // Notifications
  NOTIFICATIONS: '/notifications',
} as const;

/**
 * All route paths combined by role
 */
export const ROUTES = {
  PUBLIC: PUBLIC_ROUTES,
  ADMIN: ADMIN_ROUTES,
  STAFF: STAFF_ROUTES,
  PROTECTED: PROTECTED_ROUTES,
} as const;

/**
 * Route patterns for React Router path matching
 */
export const ROUTE_PATTERNS = {
  // Admin patterns
  ADMIN_BASE: '/admin/*',
  ADMIN_USERS_BASE: '/admin/users/*',
  ADMIN_DEVICES_BASE: '/admin/devices/*',
  ADMIN_ALERTS_BASE: '/admin/alerts/*',
  ADMIN_REPORTS_BASE: '/admin/reports/*',
  ADMIN_ANALYTICS_BASE: '/admin/analytics/*',
  ADMIN_SETTINGS_BASE: '/admin/settings/*',
  
  // Staff patterns
  STAFF_BASE: '/staff/*',
  STAFF_DEVICES_BASE: '/staff/devices/*',
  STAFF_ALERTS_BASE: '/staff/alerts/*',
  STAFF_REPORTS_BASE: '/staff/reports/*',
  STAFF_ANALYTICS_BASE: '/staff/analytics/*',
  
  // Dynamic ID patterns
  USER_ID: '/admin/users/:id',
  DEVICE_ID: '/admin/devices/:id',
  ALERT_ID: '/admin/alerts/:id',
  REPORT_ID: '/admin/reports/:id',
} as const;

/**
 * Default redirect routes by role
 */
export const DEFAULT_REDIRECT = {
  ADMIN: ADMIN_ROUTES.DASHBOARD,
  STAFF: STAFF_ROUTES.DASHBOARD,
  GUEST: PUBLIC_ROUTES.LOGIN,
} as const;

/**
 * Breadcrumb labels for navigation
 */
export const BREADCRUMB_LABELS = {
  // Admin
  admin: 'Admin',
  dashboard: 'Dashboard',
  users: 'User Management',
  devices: 'Device Management',
  alerts: 'Alert Management',
  reports: 'Reports',
  analytics: 'Analytics',
  settings: 'Settings',
  
  // Staff
  staff: 'Staff',
  
  // Common
  profile: 'Profile',
  notifications: 'Notifications',
  overview: 'Overview',
  trends: 'Trends',
  'device-performance': 'Device Performance',
  'water-quality': 'Water Quality',
  general: 'General',
  thresholds: 'Thresholds',
  system: 'System',
  new: 'New',
  edit: 'Edit',
} as const;

/**
 * Get breadcrumb trail from pathname
 */
export const getBreadcrumbs = (pathname: string): Array<{ label: string; path: string }> => {
  const segments = pathname.split('/').filter(Boolean);
  
  return segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const label = BREADCRUMB_LABELS[segment as keyof typeof BREADCRUMB_LABELS] || segment;
    
    return { label, path };
  });
};

/**
 * Check if route requires authentication
 */
export const isProtectedRoute = (pathname: string): boolean => {
  return !pathname.startsWith('/login') && 
         !pathname.startsWith('/register') && 
         !pathname.startsWith('/forgot-password') &&
         pathname !== '/';
};

/**
 * Check if route requires admin role
 */
export const isAdminRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin');
};

/**
 * Check if route requires staff role
 */
export const isStaffRoute = (pathname: string): boolean => {
  return pathname.startsWith('/staff');
};

/**
 * Get redirect path based on user role
 */
export const getRedirectPath = (role: 'Admin' | 'Staff' | null): string => {
  if (!role) return DEFAULT_REDIRECT.GUEST;
  return role === 'Admin' ? DEFAULT_REDIRECT.ADMIN : DEFAULT_REDIRECT.STAFF;
};
