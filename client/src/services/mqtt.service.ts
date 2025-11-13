/**
 * MQTT Service
 * 
 * Handles all MQTT Bridge operations via Axios HTTP requests.
 * Used for bridge status, health metrics, and MQTT-specific endpoints.
 * 
 * ⚠️ MQTT operations use Axios ONLY (not Firestore/RTDB)
 * 
 * Features:
 * - Bridge health monitoring
 * - Status metrics retrieval
 * - Connection state tracking
 * - Performance metrics
 * 
 * @module services/mqtt
 */

import axios, { AxiosError } from 'axios';

// ============================================================================
// CONSTANTS
// ============================================================================

const MQTT_BRIDGE_BASE_URL = 'https://mqtt-bridge-8158575421.us-central1.run.app';
const HEALTH_ENDPOINT = `${MQTT_BRIDGE_BASE_URL}/health`;
const STATUS_ENDPOINT = `${MQTT_BRIDGE_BASE_URL}/status`;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * MQTT Bridge Health Response
 */
export interface MqttBridgeHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
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
      rssPercent: number;
      percent: number;
    };
    cpu: {
      current: number;
      average: number;
      peak: number;
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
    flushes: number;
    droppedUnmatched: number;
    droppedBufferFull: number;
    circuitBreakerOpen: boolean;
  };
}

/**
 * MQTT Bridge Status Response
 */
export interface MqttBridgeStatus {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  cpu: {
    current: number;
    average: number;
    peak: number;
  };
  metrics: {
    received: number;
    published: number;
    failed: number;
    flushes: number;
    droppedUnmatched: number;
    droppedBufferFull: number;
    circuitBreakerOpen: boolean;
  };
  buffers: {
    [key: string]: number;
  };
  mqtt: {
    connected: boolean;
  };
}

/**
 * Error response from MQTT service
 */
export interface MqttErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class MqttService {
  // ==========================================================================
  // PROPERTIES
  // ==========================================================================
  
  private readonly healthEndpoint = HEALTH_ENDPOINT;
  private readonly statusEndpoint = STATUS_ENDPOINT;
  private readonly requestTimeout = 5000; // 5 seconds

  // ==========================================================================
  // READ OPERATIONS (HTTP Requests)
  // ==========================================================================

  /**
   * Fetch MQTT Bridge health status
   * 
   * Includes connection status, memory, CPU, and metrics.
   * 
   * @returns Promise with health data
   * @throws {MqttErrorResponse} If request fails
   */
  async getHealth(): Promise<MqttBridgeHealth> {
    try {
      console.log('[MqttService] Fetching health from:', this.healthEndpoint);
      const response = await axios.get<MqttBridgeHealth>(this.healthEndpoint, {
        headers: { 'Accept': 'application/json' },
        timeout: this.requestTimeout,
      });

      console.log('[MqttService] Health response received:', {
        status: response.data.status,
        metricsReceived: response.data.metrics?.received,
        metricsPublished: response.data.metrics?.published,
        connected: response.data.checks?.mqtt?.connected
      });

      return response.data;
    } catch (error) {
      console.error('[MqttService] Health fetch failed:', error);
      throw this.handleError(error, 'Failed to fetch MQTT Bridge health');
    }
  }

  /**
   * Fetch MQTT Bridge status
   * 
   * Includes uptime, memory, CPU metrics, and buffer states.
   * 
   * @returns Promise with status data
   * @throws {MqttErrorResponse} If request fails
   */
  async getStatus(): Promise<MqttBridgeStatus> {
    try {
      console.log('[MqttService] Fetching status from:', this.statusEndpoint);
      const response = await axios.get<MqttBridgeStatus>(this.statusEndpoint, {
        headers: { 'Accept': 'application/json' },
        timeout: this.requestTimeout,
      });

      console.log('[MqttService] Status response received:', {
        uptime: response.data.uptime,
        metricsReceived: response.data.metrics?.received,
        metricsPublished: response.data.metrics?.published,
        mqttConnected: response.data.mqtt?.connected
      });

      return response.data;
    } catch (error) {
      console.error('[MqttService] Status fetch failed:', error);
      throw this.handleError(error, 'Failed to fetch MQTT Bridge status');
    }
  }

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  /**
   * Handle errors from MQTT API requests
   * 
   * Transforms Axios errors into user-friendly messages.
   * 
   * @param error - Raw error from request
   * @param defaultMessage - Fallback message if error unmapped
   * @returns Standardized error response
   */
  private handleError(error: any, defaultMessage: string): MqttErrorResponse {
    console.error('[MqttService] Error:', error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Check for CORS errors
      if (axiosError.message?.includes('Network Error') && !axiosError.response) {
        console.error('[MqttService] Possible CORS error - check browser console for details');
        console.error('[MqttService] Current origin:', window.location.origin);
        console.error('[MqttService] Target URL:', this.healthEndpoint);
        return {
          code: 'cors_error',
          message: 'CORS error: Cannot connect to MQTT Bridge. Check if your origin is allowed.',
          details: { 
            origin: window.location.origin,
            error: error.message 
          },
        };
      }
      
      if (axiosError.code === 'ECONNABORTED') {
        return {
          code: 'timeout',
          message: 'MQTT Bridge request timeout',
          details: error.message,
        };
      }

      if (axiosError.response) {
        return {
          code: `http_${axiosError.response.status}`,
          message: axiosError.response.data 
            ? String(axiosError.response.data) 
            : defaultMessage,
          details: axiosError.response.data,
        };
      }

      if (axiosError.request) {
        return {
          code: 'network_error',
          message: 'MQTT Bridge is unreachable',
          details: error.message,
        };
      }
    }

    return {
      code: 'unknown',
      message: error.message || defaultMessage,
      details: error,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const mqttService = new MqttService();
export default mqttService;
