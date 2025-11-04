import { useMemo } from 'react';
import type { WaterQualityAlert, WaterQualityAlertSeverity } from '../../../../schemas';

/**
 * Custom hook to filter alerts based on search text and severity
 */
export const useFilteredAlerts = (
  alerts: WaterQualityAlert[],
  alertFilter: WaterQualityAlertSeverity | 'all',
  searchText: string
) => {
  return useMemo(() => {
    return alerts.filter((alert) => {
      const matchesFilter = alertFilter === 'all' || alert.severity === alertFilter;
      const matchesSearch =
        searchText === '' ||
        alert.deviceName?.toLowerCase().includes(searchText.toLowerCase()) ||
        alert.deviceId.toLowerCase().includes(searchText.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchText.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [alerts, alertFilter, searchText]);
};
