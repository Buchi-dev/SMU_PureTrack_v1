import { useState, useEffect } from 'react';
import { alertsService } from '../../../../services/alerts.Service';
import type { WaterQualityAlert } from '../../../../schemas';

/**
 * Custom hook to fetch and manage alerts
 * Automatically polls for updates every 30 seconds
 */
export const useAlerts = () => {
  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const alertsData = await alertsService.listAlerts();
        // Get only the 20 most recent alerts
        const recentAlerts = alertsData
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          })
          .slice(0, 20);
        setAlerts(recentAlerts);
        setError(null);
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    
    // Poll for updates every 30 seconds
    const intervalId = setInterval(fetchAlerts, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  return { alerts, loading, error };
};
