/**
 * Hooks Index - Central export for all custom hooks
 * 
 * Architecture: Service Layer → Hooks → UI
 * 
 * READ HOOKS (hooks/reads/*)
 * - Subscribe to real-time data from Firestore/RTDB
 * - Return: { data, isLoading, error, refetch }
 * - NO write operations allowed
 * 
 * WRITE HOOKS (hooks/writes/*)
 * - Wrap service layer functions for CRUD operations
 * - Return: { call functions, isLoading, error, isSuccess, operationType, reset }
 * - NO real-time subscriptions
 */

// ============================================================================
// UTILITY HOOKS - Route context and helpers
// ============================================================================

export { useRouteContext } from './useRouteContext';
export type { RouteContext } from './useRouteContext';

// ============================================================================
// READ HOOKS - Real-time data subscriptions
// ============================================================================

export { useRealtime_Alerts } from './reads/useRealtime_Alerts';
export { useRealtime_Devices } from './reads/useRealtime_Devices';
export { useRealtime_MQTTMetrics } from './reads/useRealtime_MQTTMetrics';
export { useRealtime_Users } from './reads/useRealtime_Users';
export { useRealtime_AnalyticsData } from './reads/useRealtime_AnalyticsData';

// Export types from Device schema (used in pages)
export type { DeviceWithReadings as DeviceWithSensorData } from '../schemas/deviceManagement.schema';

// ============================================================================
// WRITE HOOKS - CRUD operations and mutations
// ============================================================================

export { useCall_Alerts } from './writes/useCall_Alerts';
export { useCall_Devices } from './writes/useCall_Devices';
export { useCall_Users } from './writes/useCall_Users';
export { useCall_Reports } from './writes/useCall_Reports';
export { useCall_Analytics } from './writes/useCall_Analytics';

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * READ HOOK USAGE:
 * 
 * @example
 * ```tsx
 * import { useRealtime_Alerts } from '@/hooks';
 * 
 * const AlertsComponent = () => {
 *   const { alerts, isLoading, error, refetch } = useRealtime_Alerts({ 
 *     maxAlerts: 50 
 *   });
 * 
 *   if (isLoading) return <Spin />;
 *   if (error) return <Alert message={error.message} />;
 * 
 *   return <AlertsList alerts={alerts} onRefresh={refetch} />;
 * };
 * ```
 * 
 * WRITE HOOK USAGE:
 * 
 * @example
 * ```tsx
 * import { useCall_Alerts } from '@/hooks';
 * 
 * const AlertActionsComponent = ({ alertId }: { alertId: string }) => {
 *   const { 
 *     acknowledgeAlert, 
 *     resolveAlert, 
 *     isLoading, 
 *     isSuccess, 
 *     error 
 *   } = useCall_Alerts();
 * 
 *   const handleAcknowledge = async () => {
 *     try {
 *       await acknowledgeAlert(alertId);
 *       message.success('Alert acknowledged');
 *     } catch (err) {
 *       message.error('Failed to acknowledge alert');
 *     }
 *   };
 * 
 *   return (
 *     <Button onClick={handleAcknowledge} loading={isLoading}>
 *       Acknowledge
 *     </Button>
 *   );
 * };
 * ```
 * 
 * COMBINING READ + WRITE HOOKS:
 * 
 * @example
 * ```tsx
 * import { useRealtime_Devices, useCall_Devices } from '@/hooks';
 * 
 * const DeviceManagement = () => {
 *   // READ: Real-time device data
 *   const { devices, isLoading: devicesLoading } = useRealtime_Devices();
 * 
 *   // WRITE: Device operations
 *   const { 
 *     updateDevice, 
 *     deleteDevice, 
 *     isLoading: operationLoading 
 *   } = useCall_Devices();
 * 
 *   const handleUpdateStatus = async (deviceId: string) => {
 *     await updateDevice(deviceId, { status: 'maintenance' });
 *     // Real-time hook will automatically reflect the change
 *   };
 * 
 *   return (
 *     <DeviceList 
 *       devices={devices} 
 *       onUpdate={handleUpdateStatus}
 *       loading={devicesLoading || operationLoading}
 *     />
 *   );
 * };
 * ```
 */
