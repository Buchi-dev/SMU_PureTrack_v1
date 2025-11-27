/**
 * Axios API Client Configuration
 * Centralized HTTP client for Express REST API with Firebase authentication
 */
import axios, { type AxiosInstance } from 'axios';
import { auth } from './firebase.config';

// API Base URL - use relative paths in development (proxied by Vite), full URL in production
export const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_BASE_URL || 'https://puretrack-api.onrender.com')
  : '';

// Log API configuration on startup
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🌐 API Configuration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Environment: ${import.meta.env.MODE}`);
console.log(`API Base URL: ${API_BASE_URL || 'relative paths (proxied)'}`);
console.log(`Development Mode: ${import.meta.env.DEV}`);
console.log(`Production Mode: ${import.meta.env.PROD}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
 * Add Firebase ID token to Authorization header for authenticated requests
 */
apiClient.interceptors.request.use(
  async (config) => {
    // Add Firebase ID token if user is authenticated
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Force token refresh if it might be expiring soon (within 5 minutes)
        // This prevents mid-request token expiration
        // Check token expiration from claims
        const tokenResult = await currentUser.getIdTokenResult();
        const expirationTime = new Date(tokenResult.expirationTime).getTime();
        const now = Date.now();
        const timeUntilExpiry = expirationTime - now;
        const fiveMinutes = 5 * 60 * 1000;
        
        // Force refresh if token expires in less than 5 minutes
        const forceRefresh = timeUntilExpiry < fiveMinutes;
        
        if (forceRefresh && import.meta.env.DEV) {
          console.log('[API] Token expiring soon, forcing refresh');
        }
        
        const idToken = await currentUser.getIdToken(forceRefresh);
        config.headers.Authorization = `Bearer ${idToken}`;
        if (import.meta.env.DEV) {
          // SECURITY: Never log the full token - only show masked version
          const maskedToken = idToken.substring(0, 10) + '...' + idToken.substring(idToken.length - 10);
          console.log(`[API] Added token for user:`, currentUser.email, `(token: ${maskedToken})`);
          if (forceRefresh) {
            console.log('[API] Token was refreshed');
          }
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('[API] No currentUser available for request to:', config.url);
        }
        // Check if this is a protected endpoint that requires auth
        const protectedEndpoints = ['/api/v1/users', '/api/v1/devices', '/api/v1/analytics', '/api/v1/alerts'];
        const isProtectedEndpoint = protectedEndpoints.some(endpoint => config.url?.includes(endpoint));
        
        if (isProtectedEndpoint) {
          console.error('[API] Protected endpoint called without authentication:', config.url);
          // Wait a bit for Firebase to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try one more time
          const retryUser = auth.currentUser;
          if (retryUser) {
            const idToken = await retryUser.getIdToken();
            config.headers.Authorization = `Bearer ${idToken}`;
            if (import.meta.env.DEV) {
              const maskedToken = idToken.substring(0, 10) + '...' + idToken.substring(idToken.length - 10);
              console.log('[API] Token added after retry for:', retryUser.email, `(token: ${maskedToken})`);
            }
          } else {
            console.error('[API] Still no user after retry - request will likely fail');
          }
        }
        // Don't reject - some endpoints might be public or handle missing auth
        // The backend will return 401 if auth is required
      }
    } catch (error) {
      console.error('[API] Failed to get Firebase token:', error);
      // If token fetch fails, let the request continue and let backend handle it
      // This prevents blocking all requests due to transient token errors
    }
    
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
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle authentication errors
      if (status === 401) {
        console.warn('[API] Unauthorized - Session expired or not logged in', data);
        
        // Check if this request has already been retried
        const config = error.config;
        if (config._retry) {
          console.error('[API] Token refresh retry failed - backend rejecting token');
          console.error('[API] Backend error:', data.message || data.error || 'Unknown error');
          console.error('[API] Full error response:', data);
          
          // Check for Firebase service account permission issues
          if (data.message && data.message.includes('serviceusage.serviceUsageConsumer')) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('🔥 FIREBASE CONFIGURATION ERROR 🔥');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('The Firebase service account is missing required permissions.');
            console.error('');
            console.error('Solution:');
            console.error('1. Go to: https://console.developers.google.com/iam-admin/iam/project?project=smupuretrack');
            console.error('2. Find your service account');
            console.error('3. Add role: "Service Usage Consumer" (roles/serviceusage.serviceUsageConsumer)');
            console.error('4. Wait a few minutes for propagation');
            console.error('5. Restart the backend server');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            alert('⚠️ Firebase Configuration Error\n\nThe backend server has a Firebase permission issue.\nPlease check the browser console for details and contact your system administrator.');
            return Promise.reject(error);
          }
          
          // DON'T redirect if we're on admin/staff pages - let component handle the error
          // Only redirect if on auth pages or public pages where auth failure means session expired
          const isAdminOrStaffPage = window.location.pathname.includes('/admin') || window.location.pathname.includes('/staff');
          
          if (!isAdminOrStaffPage && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth/')) {
            console.log('[API] Redirecting to login - retry failed and not on protected page');
            window.location.href = '/auth/login?session=expired';
          } else {
            console.warn('[API] 401 error on protected page - displaying error to user instead of redirecting');
          }
          
          return Promise.reject(error);
        }
        
        // Check if Firebase user still exists - if not, truly logged out
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.error('[API] No Firebase user detected');
          
          // Don't redirect from admin/staff pages - let the component show the error
          const isAdminOrStaffPage = window.location.pathname.includes('/admin') || window.location.pathname.includes('/staff');
          
          if (!isAdminOrStaffPage && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth/')) {
            console.log('[API] Redirecting to login - no user and not on protected page');
            window.location.href = '/auth/login?session=expired';
          } else {
            console.warn('[API] No user on protected page - displaying error instead of redirecting');
          }
          
          return Promise.reject(error);
        } else {
          // Try to refresh the token once
          try {
            console.log('[API] Attempting to refresh token...');
            const newToken = await currentUser.getIdToken(true); // force refresh
            if (import.meta.env.DEV) {
              const maskedToken = newToken.substring(0, 10) + '...' + newToken.substring(newToken.length - 10);
              console.log('[API] Token refreshed successfully, retrying request once (token:', maskedToken + ')');
            } else {
              console.log('[API] Token refreshed successfully, retrying request once');
            }
            
            // Mark this request as retried to prevent infinite loops
            config._retry = true;
            config.headers.Authorization = `Bearer ${newToken}`;
            
            // Retry the original request with new token
            return apiClient.request(config);
          } catch (refreshError) {
            console.error('[API] Token refresh failed:', refreshError);
            
            // Don't redirect from admin/staff pages - let the component show the error
            const isAdminOrStaffPage = window.location.pathname.includes('/admin') || window.location.pathname.includes('/staff');
            
            if (!isAdminOrStaffPage && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth/')) {
              console.log('[API] Redirecting to login - token refresh failed and not on protected page');
              window.location.href = '/auth/login?session=expired';
            } else {
              console.warn('[API] Token refresh failed on protected page - displaying error instead of redirecting');
            }
            
            return Promise.reject(refreshError);
          }
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
export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.response?.data?.error) {
      return err.response.data.error;
    }
    if (err.message) {
      return err.message;
    }
  }
  return 'An unexpected error occurred';
};
