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

import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase.config';
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
        { idToken },
        {
          // Explicitly set the Authorization header with the fresh token
          // This bypasses the interceptor which might use a cached/old token
          headers: {
            'Authorization': `Bearer ${idToken}`
          },
          // Use longer timeout for token verification to allow backend processing
          timeout: 15000, // 15 seconds
        }
      );
      return response.data;
    } catch (error: any) {
      // Check for specific error codes from backend
      if (error.response?.data?.errorCode === 'AUTH_INVALID_DOMAIN') {
        const message = error.response.data.message || 
          'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed. Personal accounts are not permitted.';
        console.error('[AuthService] Domain validation failed:', message);
        throw new Error(message);
      }
      
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
    } catch (error) {
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
    } catch (error) {
      console.error('[AuthService] Check status error:', error);
      return { authenticated: false, user: null };
    }
  }

  /**
   * Check authentication status (alias for checkStatus)
   * Used by AuthContext for compatibility
   * 
   * @returns Promise with authentication status
   * @example
   * const { authenticated, user } = await authService.checkAuthStatus();
   */
  async checkAuthStatus(): Promise<AuthStatusResponse> {
    return this.checkStatus();
  }

  /**
   * Initiate Google OAuth login
   * Uses Firebase Google Sign-In popup
   * 
   * @returns Promise with user data after successful login
   * @throws {Error} If login fails
   * @example
   * const user = await authService.loginWithGoogle();
   */
  async loginWithGoogle(): Promise<VerifyTokenResponse> {
    let firebaseUserCredential = null;
    
    try {
      // Sign in with Google via Firebase
      firebaseUserCredential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = firebaseUserCredential.user;

      // CRITICAL: Check domain BEFORE backend verification to fail fast
      const email = firebaseUser.email;
      if (!email || !email.endsWith('@smu.edu.ph')) {
        console.warn('[AuthService] Domain validation failed - personal account detected:', email);
        
        // Immediately sign out from Firebase to prevent session persistence
        await firebaseSignOut(auth);
        
        throw new Error('Access denied: Only SMU email addresses (@smu.edu.ph) are allowed. Personal accounts are not permitted.');
      }

      // Get ID token from Firebase
      const idToken = await firebaseUser.getIdToken();

      // Verify token with backend and sync user to database
      // Backend will do secondary domain validation
      const response = await this.verifyToken(idToken);

      return response;
    } catch (error: any) {
      // Ensure Firebase session is cleaned up on ANY error
      if (firebaseUserCredential) {
        try {
          await firebaseSignOut(auth);
          console.log('[AuthService] Firebase session cleaned up after error');
        } catch (signOutError) {
          console.error('[AuthService] Failed to sign out after error:', signOutError);
        }
      }
      
      // Handle specific Firebase errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. Please try again.');
      }
      
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Pop-up blocked by browser. Please allow pop-ups for this site.');
      }
      
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      const message = getErrorMessage(error);
      console.error('[AuthService] Google login error:', message);
      throw new Error(message);
    }
  }

  /**
   * Logout user
   * Signs out from both Firebase and backend
   * 
   * @returns Promise that resolves when logout is complete
   * @example
   * await authService.logout();
   */
  async logout(): Promise<LogoutResponse> {
    try {
      // Sign out from Firebase first
      await firebaseSignOut(auth);
      
      // Notify backend
      const response = await apiClient.post<LogoutResponse>(
        AUTH_ENDPOINTS.LOGOUT
      );
      
      return response.data;
    } catch (error) {
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
