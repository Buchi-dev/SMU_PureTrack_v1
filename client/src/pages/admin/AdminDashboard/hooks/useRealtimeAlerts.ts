import { useState, useEffect, useCallback, useRef } from 'react';
import { alertsService } from '../../../../services/alerts.Service';
import type { WaterQualityAlert } from '../../../../schemas';
import { dataFlowLogger, DataSource, FlowLayer } from '../../../../utils/dataFlowLogger';

export interface AlertStats {
  total: number;
  active: number;
  critical: number;
  warning: number;
  advisory: number;
  acknowledged: number;
  resolved: number;
}

export const useRealtimeAlerts = (maxAlerts: number = 50) => {
  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const isActiveRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastValidAlertsRef = useRef<WaterQualityAlert[]>([]);
  const lastValidStatsRef = useRef<AlertStats>({
    total: 0,
    active: 0,
    critical: 0,
    warning: 0,
    advisory: 0,
    acknowledged: 0,
    resolved: 0,
  });

  // Calculate statistics from alerts
  const calculateStats = useCallback((alertsList: WaterQualityAlert[]): AlertStats => {
    return {
      total: alertsList.length,
      active: alertsList.filter(a => a.status === 'Active').length,
      critical: alertsList.filter(a => a.severity === 'Critical').length,
      warning: alertsList.filter(a => a.severity === 'Warning').length,
      advisory: alertsList.filter(a => a.severity === 'Advisory').length,
      acknowledged: alertsList.filter(a => a.status === 'Acknowledged').length,
      resolved: alertsList.filter(a => a.status === 'Resolved').length,
    };
  }, []);

  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    active: 0,
    critical: 0,
    warning: 0,
    advisory: 0,
    acknowledged: 0,
    resolved: 0,
  });

  // Manual refresh function
  const refresh = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    isActiveRef.current = true;
    setLoading(true);
    
    // Subscribe to real-time alerts
    const unsubscribe = alertsService.subscribeToAlerts(
      (alertsData) => {
        if (!isActiveRef.current) return;
        
        // Validate incoming data (accept empty arrays as valid)
        if (alertsData !== null && alertsData !== undefined) {
          const newStats = calculateStats(alertsData);
          
          dataFlowLogger.log(
            DataSource.FIRESTORE,
            FlowLayer.HOOK,
            'Alerts update received',
            { alertCount: alertsData.length, stats: newStats }
          );
          
          setAlerts(alertsData);
          setStats(newStats);
          
          lastValidAlertsRef.current = alertsData;
          lastValidStatsRef.current = newStats;
          
          setError(null);
          setLoading(false);
          setLastUpdate(new Date());
        } else {
          // Null/undefined data - use cached state
          dataFlowLogger.logCacheHit(
            DataSource.FIRESTORE,
            FlowLayer.HOOK,
            'Received null/undefined data - using cached alerts',
            lastValidAlertsRef.current
          );
          console.warn('Received null/undefined alerts data, maintaining cached state');
          
          if (lastValidAlertsRef.current.length > 0) {
            setAlerts(lastValidAlertsRef.current);
            setStats(lastValidStatsRef.current);
          }
          setLoading(false);
        }
      },
      (err) => {
        if (!isActiveRef.current) return;
        
        console.error('Error listening to alerts:', err);
        setError(err);
        setLoading(false);
        
        // Keep cached data on error
        if (lastValidAlertsRef.current.length > 0) {
          console.warn('Using cached alerts data due to subscription error');
          setAlerts(lastValidAlertsRef.current);
          setStats(lastValidStatsRef.current);
        }
      },
      maxAlerts
    );
    
    unsubscribeRef.current = unsubscribe;
    
    return () => {
      isActiveRef.current = false;
      unsubscribe();
    };
  }, [maxAlerts, calculateStats]);

  // Return cached data as fallback
  const safeAlerts = alerts.length > 0 ? alerts : lastValidAlertsRef.current;
  const safeStats = stats.total > 0 || alerts.length === 0 ? stats : lastValidStatsRef.current;
  
  const activeAlerts = safeAlerts.filter(a => a.status === 'Active');
  const criticalAlerts = safeAlerts.filter(a => a.severity === 'Critical' && a.status === 'Active');

  return {
    alerts: safeAlerts,
    activeAlerts,
    criticalAlerts,
    loading,
    error,
    lastUpdate,
    refresh,
    stats: safeStats,
  };
};
