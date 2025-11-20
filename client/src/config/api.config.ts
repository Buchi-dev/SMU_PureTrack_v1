/**
 * Axios API Client Configuration
 * Centralized HTTP client for Express REST API with session-based authentication
 */
import axios, { type AxiosInstance } from 'axios';

// API Base URL from environment variables
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Create axios instance with default configuration
 * - withCredentials: true enables session cookies
 * - timeout: 30 seconds for long-running operations (reports, analytics)
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: Required for session-based authentication
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

/**
 * Request interceptor
 * Add any custom headers or request modifications here
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp for debugging
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handle global error responses (401, 403, 500, etc.)
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in dev mode
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle authentication errors
      if (status === 401) {
        console.warn('[API] Unauthorized - Session expired or not logged in');
        // Redirect to login page (unless already on login page)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
      }
      
      // Handle permission errors
      if (status === 403) {
        console.warn('[API] Forbidden - Insufficient permissions');
      }
      
      // Handle server errors
      if (status >= 500) {
        console.error('[API] Server Error:', data.message || 'Internal server error');
      }
      
      // Log error in dev mode
      if (import.meta.env.DEV) {
        console.error(`[API Error] ${error.config?.url}`, {
          status,
          message: data.message,
          error: data.error,
        });
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error('[API] Network Error - No response from server');
    } else {
      // Error during request setup
      console.error('[API] Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Helper function to extract error message from API error
 */
export const getErrorMessage = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
