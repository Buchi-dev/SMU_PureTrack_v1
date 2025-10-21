/**
 * Authentication Utilities
 * Helper functions for auth operations
 */

import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

/**
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
    console.log("✓ User signed out successfully");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

/**
 * Check if user profile is complete
 */
export function isProfileComplete(profile: { department?: string; phoneNumber?: string } | null): boolean {
  if (!profile) return false;
  return !!(profile.department && profile.phoneNumber);
}

/**
 * Get user display name
 */
export function getUserDisplayName(profile: { firstname?: string; lastname?: string } | null): string {
  if (!profile) return "User";
  const { firstname, lastname } = profile;
  if (firstname && lastname) {
    return `${firstname} ${lastname}`;
  }
  return firstname || lastname || "User";
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(profile: { firstname?: string; lastname?: string } | null): string {
  if (!profile) return "U";
  const { firstname, lastname } = profile;
  const firstInitial = firstname?.charAt(0)?.toUpperCase() || "";
  const lastInitial = lastname?.charAt(0)?.toUpperCase() || "";
  return `${firstInitial}${lastInitial}` || "U";
}

/**
 * Get status badge color
 */
export function getStatusColor(status: "Pending" | "Approved" | "Suspended"): string {
  switch (status) {
    case "Approved":
      return "green";
    case "Pending":
      return "orange";
    case "Suspended":
      return "red";
    default:
      return "default";
  }
}

/**
 * Get role badge color
 */
export function getRoleColor(role: "Admin" | "Staff"): string {
  switch (role) {
    case "Admin":
      return "blue";
    case "Staff":
      return "cyan";
    default:
      return "default";
  }
}
