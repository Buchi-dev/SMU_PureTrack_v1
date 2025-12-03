import { useMemo } from 'react';
import type { WaterQualityAlert } from '../../../../schemas';
import { ALERT_STATUS, ALERT_SEVERITY } from '../../../../constants';

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  warning: number;
  advisory: number;
}

/**
 * ✅ UI-SPECIFIC LOCAL HOOK - Alert Statistics Calculation
 * 
 * This hook is ACCEPTABLE as a local hook because it only performs
 * client-side calculations and does NOT wrap service layer calls.
 * 
 * Purpose: Calculate statistics from filtered alerts for dashboard display
 * 
 * ⚠️ IMPORTANT: Critical/Warning/Advisory counts only include Active alerts
 * Resolved or Acknowledged alerts are NOT counted in severity stats
 * 
 * @param alerts - Array of water quality alerts (from global hook or filtered)
 * @returns Statistics object with counts for different alert states
 */
export const useAlertStats = (alerts: WaterQualityAlert[]): AlertStats => {
  return useMemo(() => ({
    total: alerts.length,
    active: alerts.filter((a) => a.status === ALERT_STATUS.UNACKNOWLEDGED).length,
    acknowledged: alerts.filter((a) => a.status === ALERT_STATUS.ACKNOWLEDGED).length,
    resolved: alerts.filter((a) => a.status === ALERT_STATUS.RESOLVED).length,
    // Only count Active alerts by severity (exclude Resolved/Acknowledged)
    critical: alerts.filter((a) => a.status === ALERT_STATUS.UNACKNOWLEDGED && a.severity === ALERT_SEVERITY.CRITICAL).length,
    warning: alerts.filter((a) => a.status === ALERT_STATUS.UNACKNOWLEDGED && a.severity === ALERT_SEVERITY.WARNING).length,
    advisory: alerts.filter((a) => a.status === ALERT_STATUS.UNACKNOWLEDGED && a.severity === ALERT_SEVERITY.ADVISORY).length,
  }), [alerts]);
};
