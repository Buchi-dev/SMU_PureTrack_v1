import { useState, useEffect } from 'react';
import type { WaterQualityAlert, AlertFiltersExtended } from '../../../../schemas';

/**
 * ✅ UI-SPECIFIC LOCAL HOOK - Alert Filtering Logic
 * 
 * This hook is ACCEPTABLE as a local hook because it only handles
 * UI-specific filtering logic and does NOT wrap service layer calls.
 * 
 * Purpose: Manage filter state and apply client-side filtering to alerts
 * 
 * @param alerts - Array of all alerts (from global hook: useRealtime_Alerts)
 * @returns Filtered alerts, filters state, and filter management functions
 */
export const useAlertFilters = (alerts: WaterQualityAlert[]) => {
  const [filters, setFilters] = useState<AlertFiltersExtended>({});
  const [filteredAlerts, setFilteredAlerts] = useState<WaterQualityAlert[]>(alerts);

  // Auto-apply filters when alerts or filters change
  useEffect(() => {
    let filtered = [...alerts];

    if (filters.severity?.length) {
      filtered = filtered.filter((a) => filters.severity!.includes(a.severity));
    }

    if (filters.status?.length) {
      filtered = filtered.filter((a) => filters.status!.includes(a.status));
    }

    if (filters.parameter?.length) {
      filtered = filtered.filter((a) => filters.parameter!.includes(a.parameter));
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.message.toLowerCase().includes(term) ||
          a.deviceName?.toLowerCase().includes(term) ||
          a.deviceId.toLowerCase().includes(term)
      );
    }

    setFilteredAlerts(filtered);
  }, [alerts, filters]);

  const clearFilters = () => {
    setFilters({});
  };

  return {
    filteredAlerts,
    filters,
    setFilters,
    clearFilters,
  };
};
