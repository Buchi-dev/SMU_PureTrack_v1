/**
 * Protected Route Components
 * Handle authentication and authorization for routes
 */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin, Result, Button } from "antd";
import { LoadingOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts";
import { isValidSMUEmail } from "../utils/validation.util";

/**
 * Loading Spinner Component
 */
const LoadingScreen = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      flexDirection: "column",
      gap: "16px",
    }}
  >
    <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
    <div style={{ color: "#666", fontSize: "16px" }}>Loading...</div>
  </div>
);

/**
 * Protected Route - Requires Authentication
 * Redirects to login if not authenticated
 */
interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Redirect to login, save the attempted location
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // CRITICAL: Domain validation - block personal accounts
  if (user && (!user.email || !isValidSMUEmail(user.email))) {
    console.error('[ProtectedRoute] Unauthorized access - personal account detected:', user.email);
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Approved Route - Requires Active Status
 * Redirects based on user status
 */
export function ApprovedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading, isPending, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // CRITICAL: Domain validation - block personal accounts
  if (!user.email || !isValidSMUEmail(user.email)) {
    console.error('[ApprovedRoute] Unauthorized access - personal account detected:', user.email);
    return <Navigate to="/auth/login" replace />;
  }

  // Check status - pending means awaiting admin approval
  if (isPending) {
    // Check if profile is complete (has department and phone)
    if (!user.department || !user.phoneNumber) {
      // New user without complete profile - go to account completion
      return <Navigate to="/auth/account-completion" replace />;
    }
    return <Navigate to="/auth/pending-approval" replace />;
  }

  if (isSuspended) {
    return <Navigate to="/auth/account-suspended" replace />;
  }

  // User is active, allow access
  return <>{children}</>;
}

/**
 * Admin Route - Requires Admin Role
 * Redirects if not admin
 */
export function AdminRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading, isAdmin, isPending, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // CRITICAL: Domain validation - block personal accounts
  if (!user.email || !isValidSMUEmail(user.email)) {
    console.error('[AdminRoute] Unauthorized access - personal account detected:', user.email);
    return <Navigate to="/auth/login" replace />;
  }

  // Check status
  if (isPending) {
    // Check if profile is complete (has department and phone)
    if (!user.department || !user.phoneNumber) {
      // New user without complete profile - go to account completion
      return <Navigate to="/auth/account-completion" replace />;
    }
    return <Navigate to="/auth/pending-approval" replace />;
  }

  if (isSuspended) {
    return <Navigate to="/auth/account-suspended" replace />;
  }

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          padding: "20px",
        }}
      >
        <Result
          status="403"
          icon={<LockOutlined style={{ fontSize: "72px", color: "#ff4d4f" }} />}
          title="Access Denied"
          subTitle="You do not have permission to access this page. Admin privileges required."
          extra={
            <Button type="primary" onClick={() => window.location.href = "/staff/dashboard"}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  // User is admin and active, allow access
  return <>{children}</>;
}

/**
 * Public Route - Only accessible when NOT authenticated
 * Redirects to dashboard if already logged in
 */
export function PublicRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, isActive, isAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && isActive) {
    // User is already logged in and active, redirect to appropriate dashboard
    const redirectPath = isAdmin ? "/admin/dashboard" : "/staff/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

/**
 * Role-Based Route - Requires specific role(s)
 */
interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: ("admin" | "staff")[];
}

export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { isAuthenticated, user, loading, isPending, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check status
  if (isPending) {
    // Check if profile is complete (has department and phone)
    if (!user.department || !user.phoneNumber) {
      // New user without complete profile - go to account completion
      return <Navigate to="/auth/account-completion" replace />;
    }
    return <Navigate to="/auth/pending-approval" replace />;
  }

  if (isSuspended) {
    return <Navigate to="/auth/account-suspended" replace />;
  }

  // Check if user's role is allowed
  if (!allowedRoles.includes(user.role)) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          padding: "20px",
        }}
      >
        <Result
          status="403"
          icon={<LockOutlined style={{ fontSize: "72px", color: "#ff4d4f" }} />}
          title="Access Denied"
          subTitle={`This page requires ${allowedRoles.join(" or ")} role.`}
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Account Completion Route - Only accessible to pending users with incomplete profiles
 * Redirects based on user status and profile completeness
 */
export function AccountCompletionRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading, isPending, isSuspended, isActive } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // If user is active, redirect to dashboard
  if (isActive) {
    const redirectPath = user.role === "admin" ? "/admin/dashboard" : "/staff/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  // If suspended, redirect to suspended page
  if (isSuspended) {
    return <Navigate to="/auth/account-suspended" replace />;
  }

  // If pending and profile is complete, redirect to pending approval
  if (isPending && user.department && user.phoneNumber) {
    return <Navigate to="/auth/pending-approval" replace />;
  }

  // If pending and profile is incomplete, allow access
  if (isPending && (!user.department || !user.phoneNumber)) {
    return <>{children}</>;
  }

  // Fallback - redirect to login
  return <Navigate to="/auth/login" replace />;
}
