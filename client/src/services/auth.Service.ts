/**
 * Authentication Service Layer
 * Handles all authentication operations via Firebase Authentication + Express backend
 * 
 * Authentication Flow:
 * 1. Client authenticates with Firebase (Google OAuth, Email/Password, etc.)
 * 2. Client sends Firebase ID token to backend for verification
 * 3. Backend verifies token, syncs user to MongoDB, and returns user profile
 * 4. All subsequent API calls include Firebase ID token in Authorization header
 * 
 * @module services/auth.Service
 */

import { apiClient, getErrorMessage } from '../config/api.config';
import { AUTH_ENDPOINTS } from '../config/endpoints';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AuthUser {
  _id: string;
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  department?: string;
  phoneNumber?: string;
  profilePicture?: string;
  role: 'admin' | 'staff';
  status: 'active' | 'pending' | 'suspended';
  profileComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

export interface VerifyTokenResponse {
  success: boolean;
  user: AuthUser;
  message: string;
}

export interface CurrentUserResponse {
  success: boolean;
  user: AuthUser;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// AUTH SERVICE CLASS
// ============================================================================

export class AuthService {
  
  /**
   * Verify Firebase ID token and sync user to database
   * This is called after successful Firebase authentication
   * 
   * @param idToken - Firebase ID token from client-side authentication
   * @returns Promise with user data
   * @throws {Error} If token verification fails
   * @example
   * const firebaseUser = await signInWithPopup(auth, googleProvider);
   * const idToken = await firebaseUser.user.getIdToken();
   * const response = await authService.verifyToken(idToken);
   */
  async verifyToken(idToken: string): Promise<VerifyTokenResponse> {
    try {
      const response = await apiClient.post<VerifyTokenResponse>(
        AUTH_ENDPOINTS.VERIFY_TOKEN,
        { idToken }
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AuthService] Token verification error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get current authenticated user from backend
   * Requires valid Firebase ID token in Authorization header
   * 
   * @returns Promise with user data
   * @throws {Error} If user is not authenticated
   * @example
   * const { user } = await authService.getCurrentUser();
   */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    try {
      const response = await apiClient.get<CurrentUserResponse>(
        AUTH_ENDPOINTS.CURRENT_USER
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AuthService] Get current user error:', message);
      throw new Error(message);
    }
  }

  /**
   * Check authentication status
   * Does not require authentication - returns status
   * 
   * @returns Promise with authentication status
   * @example
   * const { authenticated, user } = await authService.checkStatus();
   */
  async checkStatus(): Promise<AuthStatusResponse> {
    try {
      const response = await apiClient.get<AuthStatusResponse>(
        AUTH_ENDPOINTS.STATUS
      );
      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Check status error:', error);
      return { authenticated: false, user: null };
    }
  }

  /**
   * Logout user
   * Client should also sign out from Firebase after calling this
   * 
   * @returns Promise that resolves when logout is complete
   * @example
   * await authService.logout();
   * await signOut(auth); // Firebase client-side logout
   */
  async logout(): Promise<LogoutResponse> {
    try {
      const response = await apiClient.post<LogoutResponse>(
        AUTH_ENDPOINTS.LOGOUT
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AuthService] Logout error:', message);
      throw new Error(message);
    }
  }
}

// ============================================================================
// EXPORT SERVICE INSTANCE
// ============================================================================

export const authService = new AuthService();