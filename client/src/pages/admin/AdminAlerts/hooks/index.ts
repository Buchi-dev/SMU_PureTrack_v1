/**
 * AdminAlerts Local Hooks
 * 
 * ✅ UI-SPECIFIC LOCAL HOOKS ONLY
 * These hooks handle UI logic like filtering and statistics calculation.
 * 
 * ❌ DO NOT wrap service layer calls here - use global hooks instead:
 * - For real-time data: import { useRealtime_Alerts } from '@/hooks'
 * - For CRUD operations: import { useCall_Alerts } from '@/hooks'
 */

export { useAlertStats } from './useAlertStats';
export { useAlertFilters } from './useAlertFilters';
export type { AlertStats } from './useAlertStats';
