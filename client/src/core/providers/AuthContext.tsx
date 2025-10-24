/**
 * Authentication Context
 * Provides authentication state and user data throughout the application
 */

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebase";

// User status types
export type UserStatus = "Pending" | "Approved" | "Suspended";
export type UserRole = "Staff" | "Admin";

// Extended user profile from Firestore
export interface UserProfile {
  uuid: string;
  firstname: string;
  lastname: string;
  middlename: string;
  department: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

// Auth context state
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isPending: boolean;
  isSuspended: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

// Create context with undefined default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Subscribe to user profile changes in Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeProfile = onSnapshot(
          userDocRef,
          (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              setUserProfile({
                uuid: data.uuid,
                firstname: data.firstname || "",
                lastname: data.lastname || "",
                middlename: data.middlename || "",
                department: data.department || "",
                phoneNumber: data.phoneNumber || "",
                email: data.email || "",
                role: data.role || "Staff",
                status: data.status || "Pending",
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate(),
                lastLogin: data.lastLogin?.toDate(),
              } as UserProfile);
            } else {
              setUserProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching user profile:", error);
            setUserProfile(null);
            setLoading(false);
          }
        );

        // Cleanup profile listener
        return () => unsubscribeProfile();
      } else {
        // User signed out
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Cleanup auth listener
    return () => unsubscribeAuth();
  }, []);

  // Computed values
  const isAuthenticated = !!user;
  const isApproved = userProfile?.status === "Approved";
  const isPending = userProfile?.status === "Pending";
  const isSuspended = userProfile?.status === "Suspended";
  const isAdmin = userProfile?.role === "Admin";
  const isStaff = userProfile?.role === "Staff";

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isAuthenticated,
    isApproved,
    isPending,
    isSuspended,
    isAdmin,
    isStaff,
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
