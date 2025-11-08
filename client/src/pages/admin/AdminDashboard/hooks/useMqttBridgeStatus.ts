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
const POLL_INTERVAL = 2000; // Poll every 2 seconds for real-time updates
const ERROR_RETRY_DELAY = 5000; // Wait 5 seconds before retrying after errors

export const useMqttBridgeStatus = () => {
  const [health, setHealth] = useState<MqttBridgeHealth | null>(null);
  const [status, setStatus] = useState<MqttBridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Refs for cleanup and optimization
  const prevHealthRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const isActiveRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  const lastValidHealthRef = useRef<MqttBridgeHealth | null>(null);
  const lastValidStatusRef = useRef<MqttBridgeStatus | null>(null);

  // Fetch health endpoint with deduplication
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
      
      // Only update if data has changed
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

  // Fetch status endpoint with deduplication
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
      
      // Only update if data has changed
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

  // Fetch both endpoints in parallel
  const fetchAll = useCallback(async (showError = false) => {
    if (!isActiveRef.current) return;
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      // Fetch both endpoints in parallel
      const [healthData, statusData] = await Promise.all([
        fetchHealth(signal),
        fetchStatus(signal),
      ]);
      
      // Update state only if data has changed
      if (healthData !== null) {
        lastValidHealthRef.current = healthData;
        setHealth(healthData);
        setLastUpdate(new Date());
      } else if (lastValidHealthRef.current && !health) {
        setHealth(lastValidHealthRef.current);
      }
      
      if (statusData !== null) {
        lastValidStatusRef.current = statusData;
        setStatus(statusData);
        setLastUpdate(new Date());
      } else if (lastValidStatusRef.current && !status) {
        setStatus(lastValidStatusRef.current);
      }
      
      if (error) {
        setError(null);
      }
      
      errorCountRef.current = 0;
      
      if (loading) {
        setLoading(false);
      }
    } catch (err) {
      if (!signal.aborted) {
        errorCountRef.current++;
        const errorMsg = err instanceof Error ? err.message : 'Connection failed';
        
        // Restore cached data on error
        if (lastValidHealthRef.current && !health) {
          setHealth(lastValidHealthRef.current);
        }
        if (lastValidStatusRef.current && !status) {
          setStatus(lastValidStatusRef.current);
        }
        
        setError(errorMsg);
        
        if (showError) {
          message.error(errorMsg);
        }
        
        if (loading) {
          setLoading(false);
        }
      }
    }
  }, [fetchHealth, fetchStatus, loading, error, health, status]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setLoading(true);
    return fetchAll(true);
  }, [fetchAll]);

  // Polling effect with dynamic retry delay
  useEffect(() => {
    isActiveRef.current = true;
    let mounted = true;
    
    const poll = async () => {
      while (isActiveRef.current && mounted) {
        await fetchAll(false);
        
        // Use longer delay after errors
        const delay = errorCountRef.current > 0 ? ERROR_RETRY_DELAY : POLL_INTERVAL;
        
        await new Promise(resolve => {
          timeoutIdRef.current = setTimeout(resolve, delay);
        });
      }
    };
    
    poll();

    return () => {
      mounted = false;
      isActiveRef.current = false;
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [fetchAll]);

  // Return cached data as fallback
  return useMemo(() => ({
    health: health || lastValidHealthRef.current,
    status: status || lastValidStatusRef.current,
    loading,
    error,
    lastUpdate,
    refresh,
  }), [health, status, loading, error, lastUpdate, refresh]);
};
