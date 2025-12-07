/**
 * Global Hooks Index
 * 
 * Central export file for all global hooks that interact with the service layer.
 * These hooks provide standardized data fetching, caching, and mutation operations.
 * 
 * Architecture:
 * Service Layer → Global Hooks → UI Components
 * 
 * Hook Categories:
 * - Optimization: useVisibilityPolling (Phase 1 optimization)
 * - Authentication: useAuth
 * - Alerts: useAlerts, useAlertMutations
 * - Devices: useDevices, useDeviceReadings, useDeviceMutations
 * - Analytics: useAnalyticsSummary, useAnalyticsTrends, useParameterAnalytics
 * - Users: useUsers, useUser, useUserPreferences, useUserMutations
 * - Reports: useReports, useReport, useReportMutations
 * - Health: useHealth, useHealthStatusBadge, formatBytes
 * 
 * @module hooks/index
 */

// ============================================================================
// OPTIMIZATION HOOKS
// ============================================================================

export {
  useVisibilityPolling,
  useVisibilityPollingWithState,
} from './useVisibilityPolling';

// ============================================================================
// AUTHENTICATION HOOKS
// ============================================================================

export { useAuth } from './useAuth';

// ============================================================================
// ALERTS HOOKS
// ============================================================================

export {
  useAlerts,
  useAlertMutations,
  type UseAlertsOptions,
  type UseAlertsReturn,
  type UseAlertMutationsReturn,
} from './useAlerts';

// ============================================================================
// DEVICES HOOKS
// ============================================================================

export {
  useDevices,
  useDeviceReadings,
  useDeviceMutations,
  useDeletedDevices,
  type UseDevicesOptions,
  type UseDevicesReturn,
  type UseDeviceReadingsOptions,
  type UseDeviceReadingsReturn,
  type UseDeviceMutationsReturn,
} from './useDevices';

export {
  useRealtimeSensorData,
  useDeviceSensorData,
} from './useRealtimeSensorData';

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

export {
  useAnalyticsSummary,
  useAnalyticsTrends,
  useParameterAnalytics,
  type UseAnalyticsSummaryOptions,
  type UseAnalyticsSummaryReturn,
  type UseAnalyticsTrendsOptions,
  type UseAnalyticsTrendsReturn,
  type UseParameterAnalyticsOptions,
  type UseParameterAnalyticsReturn,
} from './useAnalytics';

// ============================================================================
// USERS HOOKS
// ============================================================================

export {
  useUsers,
  useUser,
  useUserPreferences,
  useUserMutations,
  type UseUsersOptions,
  type UseUsersReturn,
  type UseUserOptions,
  type UseUserReturn,
  type UseUserPreferencesOptions,
  type UseUserPreferencesReturn,
  type UseUserMutationsReturn,
} from './useUsers';

// ============================================================================
// REPORTS HOOKS
// ============================================================================

export {
  useReports,
  useReport,
  useReportMutations,
  type UseReportsOptions,
  type UseReportsReturn,
  type UseReportOptions,
  type UseReportReturn,
  type UseReportMutationsReturn,
} from './useReports';

// ============================================================================
// HEALTH HOOKS
// ============================================================================

export {
  useHealth,
  useHealthStatusBadge,
  formatBytes,
} from './useHealth';

// ============================================================================
// RESPONSIVE HOOKS
// ============================================================================

export {
  useResponsive,
  useResponsiveColumns,
  useTableScroll,
  useResponsiveGutter,
  type ResponsiveInfo,
  type DeviceType,
} from './useResponsive';
