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
import { initializeSocket, disconnectSocket } from "../utils/socket";
import { AuthContext, type AuthContextType } from "./auth.context";

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
  
  // Track if listener has been initialized to prevent duplicates
  const listenerInitialized = useRef(false);
  const socketInitialized = useRef(false);

  /**
   * Fetch current user from backend
   */
  const fetchUser = useCallback(async () => {
    try {
      const { authenticated, user: userData } = await authService.checkAuthStatus();
      
      if (authenticated && userData) {
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("[AuthContext] Error fetching user:", error);
      setUser(null);
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
        if (!email || !email.endsWith('@smu.edu.ph')) {
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
          socketInitialized.current = false;
          
          // Do NOT proceed with user fetch or socket connection
          return;
        }
        
        // User is signed in with Firebase AND has valid domain
        setFirebaseReady(true);
        
        // Initialize Socket.IO connection once
        if (!socketInitialized.current) {
          socketInitialized.current = true;
          if (import.meta.env.DEV) {
            console.log('[AuthContext] User authenticated, connecting to Socket.IO...');
          }
          try {
            await initializeSocket();
            if (import.meta.env.DEV) {
              console.log('[AuthContext] Socket.IO connected successfully');
            }
          } catch (socketError) {
            console.error('[AuthContext] Failed to connect to Socket.IO:', socketError);
            socketInitialized.current = false; // Allow retry on error
            // Non-fatal error, app can still work with HTTP polling
          }
        }
        
        // Fetch user data from backend
        fetchUser();
      } else {
        // User is signed out
        if (import.meta.env.DEV) {
          console.log('[AuthContext] User logged out, disconnecting Socket.IO...');
        }
        disconnectSocket();
        socketInitialized.current = false;
        
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
  useEffect(() => {
    if (!firebaseReady) return;

    if (import.meta.env.DEV) {
      console.log('[AuthContext] Setting up periodic auth check (5 min interval)');
    }

    const interval = setInterval(() => {
      if (auth.currentUser) {
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Periodic auth check...');
        }
        fetchUser();
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
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
