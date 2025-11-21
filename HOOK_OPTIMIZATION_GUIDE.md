/**
 * HOOK OPTIMIZATION GUIDE
 * ======================
 * 
 * This guide explains how to optimize data fetching in the application
 * to prevent unnecessary API calls from pages that aren't being displayed.
 * 
 * ## Problem
 * ----------
 * Before optimization, all hooks were polling data continuously regardless
 * of which page was active. This caused:
 * - Unnecessary network requests
 * - Increased server load
 * - Wasted bandwidth
 * - Poor performance
 * 
 * Example: Even when viewing the Device Management page, the Alerts hook
 * was still polling every 5 seconds.
 * 
 * ## Solution
 * -----------
 * Use the `useRouteContext` hook to determine which data sources should
 * be active based on the current route, then conditionally enable hooks.
 * 
 * ## Implementation Pattern
 * ------------------------
 * 
 * ### Step 1: Import useRouteContext
 * 
 * ```tsx
 * import { useRouteContext } from '@/hooks';
 * ```
 * 
 * ### Step 2: Get route context in your component
 * 
 * ```tsx
 * const { needsDevices, needsAlerts, needsUsers, needsAnalytics } = useRouteContext();
 * ```
 * 
 * ### Step 3: Pass `enabled` prop to hooks
 * 
 * ```tsx
 * // BEFORE (always fetching)
 * const { devices, isLoading } = useRealtime_Devices();
 * const { alerts, isLoading } = useRealtime_Alerts({ limit: 20 });
 * 
 * // AFTER (conditional fetching)
 * const { devices, isLoading } = useRealtime_Devices({ enabled: needsDevices });
 * const { alerts, isLoading } = useRealtime_Alerts({ limit: 20, enabled: needsAlerts });
 * ```
 * 
 * ## Complete Examples
 * -------------------
 * 
 * ### Example 1: Staff Dashboard
 * Dashboard needs both devices and alerts:
 * 
 * ```tsx
 * import { useRouteContext, useRealtime_Devices, useRealtime_Alerts } from '@/hooks';
 * 
 * export const StaffDashboard = () => {
 *   const { needsDevices, needsAlerts } = useRouteContext();
 *   
 *   // Only fetch when dashboard is active
 *   const { devices, isLoading: devicesLoading } = useRealtime_Devices({ 
 *     enabled: needsDevices 
 *   });
 *   
 *   const { alerts, isLoading: alertsLoading } = useRealtime_Alerts({ 
 *     limit: 20, 
 *     enabled: needsAlerts 
 *   });
 *   
 *   // ... rest of component
 * };
 * ```
 * 
 * ### Example 2: Device Management Page
 * Only needs devices:
 * 
 * ```tsx
 * import { useRouteContext, useRealtime_Devices } from '@/hooks';
 * 
 * export const StaffDevices = () => {
 *   const { needsDevices } = useRouteContext();
 *   
 *   // Only fetch devices when on devices page
 *   const { devices, isLoading } = useRealtime_Devices({ 
 *     enabled: needsDevices 
 *   });
 *   
 *   // Alerts hook is NOT used here, so no alert data is fetched
 *   
 *   // ... rest of component
 * };
 * ```
 * 
 * ### Example 3: User Management Page
 * Only needs users:
 * 
 * ```tsx
 * import { useRouteContext, useRealtime_Users } from '@/hooks';
 * 
 * export const AdminUserManagement = () => {
 *   const { needsUsers } = useRouteContext();
 *   
 *   // Only fetch users when on user management page
 *   const { users, isLoading } = useRealtime_Users({ 
 *     enabled: needsUsers 
 *   });
 *   
 *   // ... rest of component
 * };
 * ```
 * 
 * ### Example 4: Analytics Page
 * Needs both devices and analytics:
 * 
 * ```tsx
 * import { useRouteContext, useRealtime_Devices, useRealtime_AnalyticsData } from '@/hooks';
 * 
 * export const StaffAnalytics = () => {
 *   const { needsDevices, needsAnalytics } = useRouteContext();
 *   
 *   const { devices } = useRealtime_Devices({ enabled: needsDevices });
 *   const { summary } = useRealtime_AnalyticsData({ enabled: needsAnalytics });
 *   
 *   // ... rest of component
 * };
 * ```
 * 
 * ## Available Route Context Flags
 * --------------------------------
 * 
 * ```typescript
 * interface RouteContext {
 *   needsAlerts: boolean;        // Should fetch alerts
 *   needsDevices: boolean;       // Should fetch devices
 *   needsUsers: boolean;         // Should fetch users
 *   needsAnalytics: boolean;     // Should fetch analytics
 *   needsMQTTMetrics: boolean;   // Should fetch MQTT metrics
 *   needsGlobalAlerts: boolean;  // Should fetch global alerts (always true)
 *   currentPath: string;         // Current route path
 * }
 * ```
 * 
 * ## Route Activation Rules
 * -------------------------
 * 
 * The `useRouteContext` hook automatically determines which data to fetch based on the current route:
 * 
 * | Route Pattern | needsDevices | needsAlerts | needsUsers | needsAnalytics | needsMQTTMetrics |
 * |--------------|--------------|-------------|------------|----------------|------------------|
 * | /dashboard   | ✅           | ✅          | ❌         | ✅             | ❌               |
 * | /devices     | ✅           | ✅          | ❌         | ❌             | ❌               |
 * | /readings    | ✅           | ❌          | ❌         | ❌             | ❌               |
 * | /analytics   | ✅           | ❌          | ❌         | ✅             | ❌               |
 * | /alerts      | ❌           | ✅          | ❌         | ❌             | ❌               |
 * | /users       | ❌           | ❌          | ✅         | ❌             | ❌               |
 * | /settings    | ✅           | ❌          | ✅         | ❌             | ❌               |
 * | /reports     | ✅           | ✅          | ❌         | ❌             | ❌               |
 * | /mqtt        | ❌           | ❌          | ❌         | ❌             | ✅               |
 * 
 * ## Polling Intervals
 * -------------------
 * 
 * Different hooks have different default polling intervals:
 * 
 * - **useRealtime_Alerts**: 5 seconds (critical data)
 * - **useRealtime_Devices**: 15 seconds (important data)
 * - **useRealtime_Users**: 15 seconds (important data)
 * - **useRealtime_AnalyticsData**: 30 seconds (less critical)
 * - **useRealtime_MQTTMetrics**: 5 seconds (critical system data)
 * 
 * ### Custom Polling Intervals
 * 
 * For global components like AlertNotificationCenter, you can use a custom interval:
 * 
 * ```tsx
 * // Poll every 30 seconds for background notifications (less aggressive)
 * const { alerts } = useRealtime_Alerts({ 
 *   limit: 50,
 *   refreshInterval: 30000  // 30 seconds
 * });
 * ```
 * 
 * ## Benefits
 * ----------
 * 
 * ✅ **Reduced Network Traffic**: Only fetch data when it's actually needed
 * ✅ **Better Performance**: Less CPU and memory usage
 * ✅ **Lower Server Load**: Fewer unnecessary API requests
 * ✅ **Improved UX**: Faster page loads and transitions
 * ✅ **Battery Savings**: Less network activity on mobile devices
 * 
 * ## Migration Checklist
 * ---------------------
 * 
 * For each page component:
 * 
 * - [ ] Import `useRouteContext` from '@/hooks'
 * - [ ] Call `useRouteContext()` to get route flags
 * - [ ] Add `enabled` prop to all `useRealtime_*` hooks
 * - [ ] Test that data still loads correctly on the page
 * - [ ] Test that data stops loading when navigating away
 * 
 * ## Testing
 * ---------
 * 
 * To verify optimization is working:
 * 
 * 1. Open Browser DevTools → Network tab
 * 2. Navigate to Device Management page
 * 3. Observe only `/api/devices` requests (no `/api/alerts`)
 * 4. Navigate to Dashboard
 * 5. Observe both `/api/devices` and `/api/alerts` requests
 * 6. Navigate to User Management
 * 7. Observe only `/api/users` requests (no devices or alerts)
 * 
 * ## Troubleshooting
 * -----------------
 * 
 * **Problem**: Data not loading on page
 * **Solution**: Check that the correct route context flag is being used
 * 
 * **Problem**: Data still fetching on wrong pages
 * **Solution**: Verify `enabled` prop is being passed to the hook
 * 
 * **Problem**: Stale data when returning to a page
 * **Solution**: SWR handles cache revalidation automatically. If needed, use the `refetch()` function.
 * 
 * ## Advanced: Manual Control
 * ---------------------------
 * 
 * If you need more control, you can bypass route context:
 * 
 * ```tsx
 * const [shouldFetch, setShouldFetch] = useState(false);
 * 
 * const { devices } = useRealtime_Devices({ enabled: shouldFetch });
 * 
 * // Manually control when to fetch
 * <Button onClick={() => setShouldFetch(true)}>Load Devices</Button>
 * ```
 * 
 * ## Global Components
 * -------------------
 * 
 * For components in layouts (like AlertNotificationCenter), use longer polling intervals:
 * 
 * ```tsx
 * // In AlertNotificationCenter.tsx
 * const { alerts } = useRealtime_Alerts({ 
 *   limit: 50,
 *   refreshInterval: 30000  // 30s instead of 5s
 * });
 * ```
 * 
 * This ensures global notifications are still updated, but less aggressively.
 */

export {}; // Make this a module
