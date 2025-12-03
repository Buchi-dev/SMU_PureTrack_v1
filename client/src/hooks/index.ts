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
 * - Health: useSystemHealth, useLiveness, useReadiness
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
  type UseDevicesOptions,
  type UseDevicesReturn,
  type UseDeviceReadingsOptions,
  type UseDeviceReadingsReturn,
  type UseDeviceMutationsReturn,
} from './useDevices';

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
  useSystemHealth,
  useLiveness,
  useReadiness,
  type UseSystemHealthOptions,
  type UseSystemHealthReturn,
  type UseLivenessOptions,
  type UseLivenessReturn,
  type UseReadinessOptions,
  type UseReadinessReturn,
} from './useHealth';
