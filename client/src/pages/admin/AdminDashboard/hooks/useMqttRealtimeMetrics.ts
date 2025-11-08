import { useState, useEffect, useCallback, useRef } from 'react';

export interface MqttRealtimeMetrics {
  received: number;
  published: number;
  failed: number;
  flushes: number;
  circuitBreakerOpen: boolean;
  connected: boolean;
  timestamp: number;
}

const MQTT_BRIDGE_BASE_URL = 'https://mqtt-bridge-8158575421.us-central1.run.app';
const HEALTH_ENDPOINT = `${MQTT_BRIDGE_BASE_URL}/health`;
const FAST_POLL_INTERVAL = 1000; // 1 second for true real-time feel

/**
 * Fast-polling hook specifically for real-time data monitor
 * Polls every 1 second for immediate feedback on MQTT traffic
 */
export const useMqttRealtimeMetrics = () => {
  const [metrics, setMetrics] = useState<MqttRealtimeMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isActiveRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!isActiveRef.current) return;

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = await fetch(HEALTH_ENDPOINT, {
        signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (isActiveRef.current) {
        setMetrics({
          received: data.metrics?.received || 0,
          published: data.metrics?.published || 0,
          failed: data.metrics?.failed || 0,
          flushes: data.metrics?.flushes || 0,
          circuitBreakerOpen: data.metrics?.circuitBreakerOpen || false,
          connected: data.checks?.mqtt?.connected || false,
          timestamp: Date.now(),
        });
        setError(null);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      if (isActiveRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      }
    }

    // Schedule next poll
    if (isActiveRef.current) {
      timeoutIdRef.current = setTimeout(fetchMetrics, FAST_POLL_INTERVAL);
    }
  }, []);

  useEffect(() => {
    isActiveRef.current = true;
    fetchMetrics();

    return () => {
      isActiveRef.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [fetchMetrics]);

  return { metrics, error };
};
