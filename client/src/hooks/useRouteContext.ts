/**
 * useRouteContext - Route-aware hook activation
 * 
 * Determines which data sources should be active based on the current route.
 * This prevents unnecessary API polling from hooks when their data isn't being displayed.
 * 
 * @module hooks
 */

import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Route context return type
 * Each boolean indicates if that data source should be actively polling
 */
export interface RouteContext {
  /** Should alerts be fetched and polled */
  needsAlerts: boolean;
  /** Should devices be fetched and polled */
  needsDevices: boolean;
  /** Should users be fetched and polled */
  needsUsers: boolean;
  /** Should analytics be fetched and polled */
  needsAnalytics: boolean;
  /** Should MQTT metrics be fetched and polled */
  needsMQTTMetrics: boolean;
  /** Should global alerts (header notifications) be fetched */
  needsGlobalAlerts: boolean;
  /** Current route path */
  currentPath: string;
}

/**
 * Hook to determine which data sources should be active based on current route
 * 
 * Usage Example:
 * ```tsx
 * const { needsDevices } = useRouteContext();
 * const { devices } = useRealtime_Devices({ enabled: needsDevices });
 * ```
 * 
 * @returns Route context with flags for each data source
 */
export const useRouteContext = (): RouteContext => {
  const location = useLocation();
  const currentPath = location.pathname;

  const context = useMemo(() => {
    const ctx: RouteContext = {
      needsAlerts: false,
      needsDevices: false,
      needsUsers: false,
      needsAnalytics: false,
      needsMQTTMetrics: false,
      needsGlobalAlerts: true, // Always fetch for header notifications (but less frequently)
      currentPath,
    };

    // Dashboard pages - need multiple data sources
    if (currentPath.includes('/dashboard')) {
      ctx.needsAlerts = true;
      ctx.needsDevices = true;
      ctx.needsAnalytics = true;
    }

    // Device Management pages
    if (currentPath.includes('/devices')) {
      ctx.needsDevices = true;
      // Device pages may also show alerts for devices
      ctx.needsAlerts = true;
    }

    // Readings/Sensor Data pages
    if (currentPath.includes('/readings')) {
      ctx.needsDevices = true;
    }

    // Analytics pages
    if (currentPath.includes('/analytics')) {
      ctx.needsAnalytics = true;
      ctx.needsDevices = true; // Need devices for device-specific analytics
    }

    // Alerts pages
    if (currentPath.includes('/alerts')) {
      ctx.needsAlerts = true;
    }

    // User Management pages
    if (currentPath.includes('/user-management') || currentPath.includes('/users')) {
      ctx.needsUsers = true;
    }

    // Settings pages
    if (currentPath.includes('/settings')) {
      ctx.needsUsers = true; // For user profile
      ctx.needsDevices = true; // For notification settings
    }

    // Reports pages
    if (currentPath.includes('/reports')) {
      ctx.needsDevices = true;
      ctx.needsAlerts = true;
    }

    // MQTT/System pages
    if (currentPath.includes('/mqtt') || currentPath.includes('/system')) {
      ctx.needsMQTTMetrics = true;
    }

    return ctx;
  }, [currentPath]);

  return context;
};

export default useRouteContext;
