/**
 * Authentication Context
 * Provides authentication state and user data throughout the application
 * Uses Express/Passport.js session-based authentication
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { authService, type AuthUser } from "../services/auth.Service";
import { auth } from "../config/firebase.config";
import { onAuthStateChanged } from "firebase/auth";
import { AuthContext, type AuthContextType } from "./auth.context";
import { isValidSMUEmail } from "../utils/validation.util";

// User status types (mapped from MongoDB model)
export type UserStatus = "active" | "pending" | "suspended";
export type UserRole = "admin" | "staff";

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state
 * Uses session-based auth with periodic checks
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [requiresAccountCompletion, setRequiresAccountCompletion] = useState(false);
  const [firebaseEmail, setFirebaseEmail] = useState<string | null>(null);
  
  // Track if listener has been initialized to prevent duplicates
  const listenerInitialized = useRef(false);

  /**
   * Fetch current user from backend
   * FALLBACK MODE: If backend fails, use Firebase user data directly
   */
  const fetchUser = useCallback(async () => {
    try {
      const response = await authService.checkStatus();
      
      if (response.requiresAccountCompletion) {
        // Firebase authenticated but no database record
        setRequiresAccountCompletion(true);
        setFirebaseEmail(response.firebaseEmail || null);
        setUser(null);
      } else if (response.authenticated && response.user) {
        setUser(response.user);
        setRequiresAccountCompletion(false);
        setFirebaseEmail(null);
      } else {
        setUser(null);
        setRequiresAccountCompletion(false);
        setFirebaseEmail(null);
      }

      // Validate domain before making backend call
      const email = auth.currentUser.email;
      if (!email || !email.endsWith('@smu.edu.ph')) {
        console.error('[AuthContext] Domain validation failed in fetchUser:', email);
        setUser(null);
        setLoading(false);
        return;
      }

      // Try to get user from backend (with timeout)
      try {
        const { user: userData } = await authService.getCurrentUser();
        
        if (userData) {
          setUser(userData);
          console.log('[AuthContext] ✅ User data from backend:', userData.email);
        } else {
          setUser(null);
        }
      } catch (backendError: any) {
        console.warn('[AuthContext] ⚠️ Backend failed, using Firebase fallback mode');
        
        // FALLBACK: Create user object from Firebase data
        const firebaseUser = auth.currentUser;
        const tokenResult = await firebaseUser.getIdTokenResult();
        
        // Parse name
        const fullName = firebaseUser.displayName || 'User';
        const nameParts = fullName.trim().split(/\s+/);
        let firstName = nameParts[0] || '';
        let lastName = nameParts[nameParts.length - 1] || '';
        
        // Create a client-side user object based on Firebase data
        const fallbackUser: AuthUser = {
          _id: firebaseUser.uid,
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: fullName,
          firstName,
          lastName,
          profilePicture: firebaseUser.photoURL || '',
          role: (tokenResult.claims.role as 'admin' | 'staff') || 'staff',
          status: 'active', // Assume active since they're authenticated
          profileComplete: true,
        };
        
        setUser(fallbackUser);
        
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('⚠️ RUNNING IN FALLBACK MODE');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('Backend authentication is unavailable.');
        console.warn('Using Firebase client-side authentication only.');
        console.warn('Some features may be limited until backend is fixed.');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    } catch (error: any) {
      console.error("[AuthContext] Critical error in fetchUser:", error);
      setUser(null);
      setRequiresAccountCompletion(false);
      setFirebaseEmail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Manual refetch function for UI components
   */
  const refetchUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  /**
   * Logout function - signs out from Firebase and clears all auth state
   */
  const logout = useCallback(async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Logging out user...');
      }

      // Sign out from Firebase
      await auth.signOut();

      // Clear all auth state
      setUser(null);
      setFirebaseReady(false);
      setRequiresAccountCompletion(false);
      setFirebaseEmail(null);

      // Clear any localStorage (if you're using it)
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Optionally call backend logout endpoint (don't fail if it errors)
      try {
        await authService.logout();
      } catch (backendError) {
        if (import.meta.env.DEV) {
          console.warn('[AuthContext] Backend logout failed (non-critical):', backendError);
        }
      }

      if (import.meta.env.DEV) {
        console.log('[AuthContext] Logout successful');
      }
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      // Even if logout fails, clear local state
      setUser(null);
      setFirebaseReady(false);
      setRequiresAccountCompletion(false);
      setFirebaseEmail(null);
      throw error;
    }
  }, []);

  // Listen to Firebase auth state changes (SINGLE INITIALIZATION)
  useEffect(() => {
    // Prevent duplicate listener setup
    if (listenerInitialized.current) {
      if (import.meta.env.DEV) {
        console.warn('[AuthContext] Listener already initialized, skipping duplicate setup');
      }
      return;
    }

    listenerInitialized.current = true;
    
    if (import.meta.env.DEV) {
      console.log('[AuthContext] Setting up Firebase auth listener (once)...');
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Firebase auth state changed:', firebaseUser?.email || 'No user');
      }
      
      if (firebaseUser) {
        // CRITICAL: Domain validation BEFORE any backend calls
        const email = firebaseUser.email;
        if (!email || !isValidSMUEmail(email)) {
          console.error('[AuthContext] Domain validation failed - personal account detected:', email);
          console.error('[AuthContext] Signing out unauthorized user immediately');
          
          // Sign out immediately to prevent any further processing
          try {
            await auth.signOut();
          } catch (signOutError) {
            console.error('[AuthContext] Error signing out unauthorized user:', signOutError);
          }
          
          // Clear state and stop loading
          setUser(null);
          setFirebaseReady(true);
          setLoading(false);
          
          // Do NOT proceed with user fetch or MQTT connection
          return;
        }
        
        // User is signed in with Firebase AND has valid domain
        setFirebaseReady(true);
        
        // Fetch user data from backend
        fetchUser();
      } else {
        // User is signed out
        if (import.meta.env.DEV) {
          console.log('[AuthContext] User logged out');
        }
        
        setFirebaseReady(true);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      listenerInitialized.current = false;
    };
  }, [fetchUser]); // fetchUser is stable due to useCallback

  // Set up periodic auth check (every 5 minutes)
  // ONLY if user is authenticated and Firebase is ready
  useEffect(() => {
    if (!firebaseReady || !auth.currentUser) return;

    if (import.meta.env.DEV) {
      console.log('[AuthContext] Setting up periodic auth check (5 min interval)');
    }

    const interval = setInterval(() => {
      // Double-check user still exists before fetching
      if (auth.currentUser && auth.currentUser.email?.endsWith('@smu.edu.ph')) {
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Periodic auth check...');
        }
        fetchUser();
      } else {
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Skipping periodic check - no valid user');
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(interval);
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Cleaning up periodic auth check');
      }
    };
  }, [firebaseReady, fetchUser]);

  // Computed values
  const isAuthenticated = !!user;
  const isActive = user?.status === "active";
  const isPending = user?.status === "pending";
  const isSuspended = user?.status === "suspended";
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    isActive,
    isPending,
    isSuspended,
    isAdmin,
    isStaff,
    requiresAccountCompletion,
    firebaseEmail,
    refetchUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
