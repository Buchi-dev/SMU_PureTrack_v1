/**
 * Protected Route Components
 * Handle authentication and authorization for routes
 */

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin, Result, Button } from "antd";
import { LoadingOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../providers/AuthContext";

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
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Redirect to login, save the attempted location
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Approved Route - Requires Approved Status
 * Redirects based on user status
 */
export function ApprovedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, userProfile, loading, isPending, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!userProfile) {
    return <Navigate to="/auth/complete-account" replace />;
  }

  // Check if profile is incomplete
  if (!userProfile.department || !userProfile.phoneNumber) {
    return <Navigate to="/auth/complete-account" replace />;
  }

  // Check status
  if (isPending) {
    return <Navigate to="/auth/pending-approval" replace />;
  }

  if (isSuspended) {
    return <Navigate to="/auth/account-inactive" replace />;
  }

  // User is approved, allow access
  return <>{children}</>;
}

/**
 * Admin Route - Requires Admin Role
 * Redirects if not admin
 */
export function AdminRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, userProfile, loading, isAdmin, isPending, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!userProfile) {
    return <Navigate to="/auth/complete-account" replace />;
  }

  // Check if profile is incomplete
  if (!userProfile.department || !userProfile.phoneNumber) {
    return <Navigate to="/auth/complete-account" replace />;
  }

  // Check status
  if (isPending) {
    return <Navigate to="/auth/pending-approval" replace />;
  }

  if (isSuspended) {
    return <Navigate to="/auth/account-inactive" replace />;
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
            <Button type="primary" onClick={() => window.location.href = "/dashboard"}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  // User is admin and approved, allow access
  return <>{children}</>;
}

/**
 * Public Route - Only accessible when NOT authenticated
 * Redirects to dashboard if already logged in
 */
export function PublicRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, isApproved, isAdmin } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && isApproved) {
    // User is already logged in and approved, redirect to appropriate dashboard
    const redirectPath = isAdmin ? "/admin/dashboard" : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

/**
 * Role-Based Route - Requires specific role(s)
 */
interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: ("Admin" | "Staff")[];
}

export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { isAuthenticated, userProfile, loading, isPending, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!userProfile) {
    return <Navigate to="/auth/complete-account" replace />;
  }

  // Check status
  if (isPending) {
    return <Navigate to="/auth/pending-approval" replace />;
  }

  if (isSuspended) {
    return <Navigate to="/auth/account-inactive" replace />;
  }

  // Check if user's role is allowed
  if (!allowedRoles.includes(userProfile.role)) {
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
