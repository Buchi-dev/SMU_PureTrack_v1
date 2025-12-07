/**
 * StaffDashboard Components
 * Centralized exports for all dashboard sub-components
 */

export { default as DashboardHeader } from './DashboardHeader';
export { default as DeviceStatsCards } from './DeviceStatsCards';
export { default as CompactDeviceStats } from './CompactDeviceStats';
export { default as DeviceStatusTable } from './DeviceStatusTable';
export { default as RecentAlertsTable } from './RecentAlertsTable';
export { default as QuickActionsSidebar } from './QuickActionsSidebar';

// Re-export types for convenience
export type { DeviceStatus } from './DeviceStatusTable';
export type { RecentAlert } from './RecentAlertsTable';
