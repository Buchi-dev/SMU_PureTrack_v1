/**
 * Auth Context Definition
 * Separate file for context to satisfy react-refresh/only-export-components
 */

import { createContext } from 'react';
import type { AuthUser } from '../services/auth.Service';

// Auth context state
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isActive: boolean;
  isPending: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  requiresAccountCompletion: boolean;
  firebaseEmail: string | null;
  refetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

// Create context with undefined default
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
