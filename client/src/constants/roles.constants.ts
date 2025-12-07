/**
 * User Roles and Permissions Constants
 * Centralized role definitions and permission checks
 * Matches V2 backend role structure
 * Source: server_v2/src/core/configs/constants.config.ts
 */

/**
 * User Roles
 * Matches backend USER_ROLES enum
 */
export const USER_ROLES = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * User Account Status
 * Matches backend USER_STATUS enum
 */
export const USER_STATUS = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  PENDING: 'Pending',
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

/**
 * Permission Categories
 */
export const PERMISSIONS = {
  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_MANAGE_ROLES: 'user:manage_roles',
  USER_MANAGE_STATUS: 'user:manage_status',
  
  // Device Management
  DEVICE_CREATE: 'device:create',
  DEVICE_READ: 'device:read',
  DEVICE_UPDATE: 'device:update',
  DEVICE_DELETE: 'device:delete',
  DEVICE_COMMAND: 'device:command',
  
  // Alert Management
  ALERT_CREATE: 'alert:create',
  ALERT_READ: 'alert:read',
  ALERT_UPDATE: 'alert:update',
  ALERT_DELETE: 'alert:delete',
  ALERT_ACKNOWLEDGE: 'alert:acknowledge',
  ALERT_RESOLVE: 'alert:resolve',
  
  // Report Management
  REPORT_CREATE: 'report:create',
  REPORT_READ: 'report:read',
  REPORT_UPDATE: 'report:update',
  REPORT_DELETE: 'report:delete',
  REPORT_DOWNLOAD: 'report:download',
  
  // Analytics
  ANALYTICS_READ: 'analytics:read',
  
  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  
  // System
  SYSTEM_MANAGE: 'system:manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role-based permission mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [USER_ROLES.ADMIN]: [
    // Full access to all permissions
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_MANAGE_ROLES,
    PERMISSIONS.USER_MANAGE_STATUS,
    PERMISSIONS.DEVICE_CREATE,
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.DEVICE_UPDATE,
    PERMISSIONS.DEVICE_DELETE,
    PERMISSIONS.DEVICE_COMMAND,
    PERMISSIONS.ALERT_CREATE,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.ALERT_UPDATE,
    PERMISSIONS.ALERT_DELETE,
    PERMISSIONS.ALERT_ACKNOWLEDGE,
    PERMISSIONS.ALERT_RESOLVE,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_UPDATE,
    PERMISSIONS.REPORT_DELETE,
    PERMISSIONS.REPORT_DOWNLOAD,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.SYSTEM_MANAGE,
  ],
  [USER_ROLES.STAFF]: [
    // Limited access
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.ALERT_ACKNOWLEDGE,
    PERMISSIONS.ALERT_RESOLVE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_DOWNLOAD,
    PERMISSIONS.ANALYTICS_READ,
  ],
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (userRole: UserRole | null, permission: Permission): boolean => {
  if (!userRole) return false;
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (
  userRole: UserRole | null,
  permissions: Permission[]
): boolean => {
  if (!userRole) return false;
  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (
  userRole: UserRole | null,
  permissions: Permission[]
): boolean => {
  if (!userRole) return false;
  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * Check if user is admin
 */
export const isAdmin = (userRole: UserRole | null): boolean => {
  return userRole === USER_ROLES.ADMIN;
};

/**
 * Check if user is staff
 */
export const isStaff = (userRole: UserRole | null): boolean => {
  return userRole === USER_ROLES.STAFF;
};

/**
 * Check if user account is active
 */
export const isActiveUser = (userStatus: UserStatus | null): boolean => {
  return userStatus === USER_STATUS.ACTIVE;
};

/**
 * Check if user account is pending approval
 */
export const isPendingUser = (userStatus: UserStatus | null): boolean => {
  return userStatus === USER_STATUS.PENDING;
};

/**
 * Check if user account is suspended
 */
export const isSuspendedUser = (userStatus: UserStatus | null): boolean => {
  return userStatus === USER_STATUS.SUSPENDED;
};

/**
 * Feature flags based on role
 */
export const FEATURE_FLAGS = {
  // Admin-only features
  USER_MANAGEMENT: (role: UserRole | null) => isAdmin(role),
  DEVICE_MANAGEMENT: (role: UserRole | null) => isAdmin(role),
  SYSTEM_SETTINGS: (role: UserRole | null) => isAdmin(role),
  ADVANCED_ANALYTICS: (role: UserRole | null) => isAdmin(role),
  
  // Staff features
  ALERT_RESPONSE: (role: UserRole | null) => 
    role === USER_ROLES.ADMIN || role === USER_ROLES.STAFF,
  VIEW_REPORTS: (role: UserRole | null) => 
    role === USER_ROLES.ADMIN || role === USER_ROLES.STAFF,
  VIEW_ANALYTICS: (role: UserRole | null) => 
    role === USER_ROLES.ADMIN || role === USER_ROLES.STAFF,
} as const;

/**
 * Check if feature is enabled for user
 */
export const isFeatureEnabled = (
  feature: keyof typeof FEATURE_FLAGS,
  userRole: UserRole | null
): boolean => {
  return FEATURE_FLAGS[feature](userRole);
};

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.STAFF]: 'Staff Member',
};

/**
 * Status display names
 */
export const STATUS_DISPLAY_NAMES: Record<UserStatus, string> = {
  [USER_STATUS.ACTIVE]: 'Active',
  [USER_STATUS.SUSPENDED]: 'Suspended',
  [USER_STATUS.PENDING]: 'Pending Approval',
};

/**
 * Status colors for UI
 */
export const STATUS_COLORS: Record<UserStatus, string> = {
  [USER_STATUS.ACTIVE]: 'success',
  [USER_STATUS.SUSPENDED]: 'error',
  [USER_STATUS.PENDING]: 'warning',
};

/**
 * Role colors for UI
 */
export const ROLE_COLORS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'blue',
  [USER_ROLES.STAFF]: 'green',
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = (role: UserRole | null): Permission[] => {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] ?? [];
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: UserRole | null): string => {
  if (!role) return 'Unknown';
  return ROLE_DISPLAY_NAMES[role] ?? role;
};

/**
 * Get status display name
 */
export const getStatusDisplayName = (status: UserStatus | null): string => {
  if (!status) return 'Unknown';
  return STATUS_DISPLAY_NAMES[status] ?? status;
};
