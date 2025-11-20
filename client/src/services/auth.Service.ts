/**
 * Authentication Service Layer
 * Handles all authentication operations via Express/Passport.js backend
 * 
 * @module services/auth.Service
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Configure axios instance with credentials support
const authAPI = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true, // Important: send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  role: 'admin' | 'staff' | 'user';
  status: 'active' | 'inactive' | 'suspended';
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

export interface CurrentUserResponse {
  success: boolean;
  user: AuthUser;
  message?: string;
}

// ============================================================================
// AUTH SERVICE FUNCTIONS
// ============================================================================

/**
 * Check current authentication status
 * @returns Promise with authentication status and user data
 * @example
 * const { authenticated, user } = await authService.checkAuthStatus();
 */
export const checkAuthStatus = async (): Promise<AuthStatusResponse> => {
  try {
    const response = await authAPI.get<AuthStatusResponse>('/status');
    return response.data;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { authenticated: false, user: null };
  }
};

/**
 * Get current authenticated user details
 * @returns Promise with user data
 * @throws {Error} If user is not authenticated
 * @example
 * const { user } = await authService.getCurrentUser();
 */
export const getCurrentUser = async (): Promise<CurrentUserResponse> => {
  const response = await authAPI.get<CurrentUserResponse>('/current-user');
  return response.data;
};

/**
 * Initiate Google OAuth login
 * Redirects to backend Google OAuth flow
 * @example
 * authService.loginWithGoogle();
 */
export const loginWithGoogle = (): void => {
  // Redirect to backend Google OAuth endpoint
  window.location.href = `${API_BASE_URL}/auth/google`;
};

/**
 * Logout current user and destroy session
 * @returns Promise that resolves when logout is complete
 * @example
 * await authService.logout();
 */
export const logout = async (): Promise<void> => {
  try {
    // Backend will handle session destruction and redirect
    window.location.href = `${API_BASE_URL}/auth/logout`;
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const authService = {
  checkAuthStatus,
  getCurrentUser,
  loginWithGoogle,
  logout,
};