import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { message } from 'antd';

export interface MqttBridgeHealth {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    mqtt: {
      connected: boolean;
      clientId: string;
    };
    memory: {
      heapUsed: string;
      heapTotal: string;
      rss: string;
      percent: number;
    };
    buffers: {
      [key: string]: {
        messages: number;
        utilization: number;
      };
    };
  };
  metrics: {
    received: number;
    published: number;
    failed: number;
    commands: number;
    flushes: number;
    messagesInDLQ: number;
    circuitBreakerOpen: boolean;
  };
}

export interface MqttBridgeStatus {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  metrics: {
    received: number;
    published: number;
    failed: number;
    commands: number;
    flushes: number;
    messagesInDLQ: number;
    circuitBreakerOpen: boolean;
  };
  buffers: {
    [key: string]: number;
  };
  mqtt: {
    connected: boolean;
  };
}

const MQTT_BRIDGE_BASE_URL = 'https://mqtt-bridge-8158575421.us-central1.run.app';
const HEALTH_ENDPOINT = `${MQTT_BRIDGE_BASE_URL}/health`;
const STATUS_ENDPOINT = `${MQTT_BRIDGE_BASE_URL}/status`;
const POLL_INTERVAL = 2000; // Optimized: Reduced polling frequency to 2s for better performance
const ERROR_RETRY_DELAY = 5000; // Wait longer before retrying after errors

export const useMqttBridgeStatus = () => {
  const [health, setHealth] = useState<MqttBridgeHealth | null>(null);
  const [status, setStatus] = useState<MqttBridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Refs for optimization - avoid unnecessary re-renders
  const prevHealthRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const isActiveRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);

  // Memoized fetch function with abort controller for cleanup
  const fetchHealth = useCallback(async (signal?: AbortSignal): Promise<MqttBridgeHealth | null> => {
    try {
      const response = await fetch(HEALTH_ENDPOINT, { 
        signal,
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: MqttBridgeHealth = await response.json();
      
      // Optimized: Only stringify and compare if we have previous data
      if (prevHealthRef.current) {
        const dataStr = JSON.stringify(data);
        if (prevHealthRef.current === dataStr) {
          return null; // No change
        }
        prevHealthRef.current = dataStr;
      } else {
        prevHealthRef.current = JSON.stringify(data);
      }
      
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      throw err;
    }
  }, []);

  const fetchStatus = useCallback(async (signal?: AbortSignal): Promise<MqttBridgeStatus | null> => {
    try {
      const response = await fetch(STATUS_ENDPOINT, { 
        signal,
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: MqttBridgeStatus = await response.json();
      
      // Optimized: Only stringify and compare if we have previous data
      if (prevStatusRef.current) {
        const dataStr = JSON.stringify(data);
        if (prevStatusRef.current === dataStr) {
          return null; // No change
        }
        prevStatusRef.current = dataStr;
      } else {
        prevStatusRef.current = JSON.stringify(data);
      }
      
      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      throw err;
    }
  }, []);

  // Optimized fetch with batched state updates
  const fetchAll = useCallback(async (showError = false) => {
    if (!isActiveRef.current) return;
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      // Fetch both endpoints in parallel for speed
      const [healthData, statusData] = await Promise.all([
        fetchHealth(signal),
        fetchStatus(signal),
      ]);
      
      // Batch state updates to avoid multiple re-renders
      let shouldUpdate = false;
      const updates: (() => void)[] = [];
      
      if (healthData !== null) {
        shouldUpdate = true;
        updates.push(() => setHealth(healthData));
      }
      
      if (statusData !== null) {
        shouldUpdate = true;
        updates.push(() => setStatus(statusData));
      }
      
      if (shouldUpdate) {
        // Execute all updates in a single batch
        updates.forEach(update => update());
        setLastUpdate(new Date());
      }
      
      // Clear error on success
      if (error) {
        setError(null);
      }
      
      // Reset error count on success
      errorCountRef.current = 0;
      
      if (loading) {
        setLoading(false);
      }
    } catch (err) {
      if (!signal.aborted) {
        errorCountRef.current++;
        const errorMsg = err instanceof Error ? err.message : 'Connection failed';
        setError(errorMsg);
        
        if (showError) {
          message.error(errorMsg);
        }
        
        if (loading) {
          setLoading(false);
        }
      }
    }
  }, [fetchHealth, fetchStatus, loading, error]);

  // Optimized refresh - doesn't set loading state unnecessarily
  const refresh = useCallback(() => {
    setLoading(true);
    return fetchAll(true);
  }, [fetchAll]);

  // Optimized polling effect with dynamic retry delay
  useEffect(() => {
    isActiveRef.current = true;
    let mounted = true;
    
    const poll = async () => {
      while (isActiveRef.current && mounted) {
        await fetchAll(false);
        
        // Use longer delay if we're experiencing errors
        const delay = errorCountRef.current > 0 ? ERROR_RETRY_DELAY : POLL_INTERVAL;
        
        // Use timeout ref for proper cleanup
        await new Promise(resolve => {
          timeoutIdRef.current = setTimeout(resolve, delay);
        });
      }
    };
    
    // Start polling
    poll();

    return () => {
      mounted = false;
      isActiveRef.current = false;
      
      // Cleanup: abort pending requests and clear timeouts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [fetchAll]);

  // Memoize return value to prevent unnecessary re-renders in consuming components
  return useMemo(() => ({
    health,
    status,
    loading,
    error,
    lastUpdate,
    refresh,
  }), [health, status, loading, error, lastUpdate, refresh]);
};
