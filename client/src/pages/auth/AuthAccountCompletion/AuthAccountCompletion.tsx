/**
 * Account Completion / Inactive Component
 * Redirects new users to pending approval page
 * This page is kept for backward compatibility
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

/**
 * Simple redirect component based on authentication status
 */
export const AuthAccountCompletion = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }

    if (user) {
      // Route based on status
      if (user.status === "active") {
        if (user.role === "admin") {
          navigate("/admin/dashboard");
        } else if (user.role === "staff") {
          navigate("/staff/dashboard");
        } else {
          navigate("/dashboard");
        }
      } else if (user.status === "suspended") {
        navigate("/auth/account-suspended");
      } else if (user.status === "inactive") {
        navigate("/auth/pending-approval");
      }
    }
  }, [loading, isAuthenticated, user, navigate]);

  return null;
};
