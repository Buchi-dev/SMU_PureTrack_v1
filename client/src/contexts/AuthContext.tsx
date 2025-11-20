/**
 * Authentication Context
 * Provides authentication state and user data throughout the application
 * Uses Express/Passport.js session-based authentication
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { authService, type AuthUser } from "../services/auth.Service";

// User status types (mapped from MongoDB model)
export type UserStatus = "active" | "pending" | "suspended";
export type UserRole = "admin" | "staff";

// Auth context state
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isActive: boolean;
  isPending: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  refetchUser: () => Promise<void>;
}

// Create context with undefined default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state
 * Uses session-based auth with periodic checks
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.error("Error fetching user:", error);
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

  useEffect(() => {
    // Initial auth check
    fetchUser();

    // Set up periodic auth check (every 5 minutes)
    // This ensures session expiry is detected
    const interval = setInterval(() => {
      fetchUser();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchUser]);

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

/**
 * Custom hook to use auth context
 * Throws error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
