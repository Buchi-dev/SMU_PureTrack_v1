import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts';
import { Spin } from 'antd';

/**
 * Smart Root Redirect
 * Redirects users to appropriate dashboard based on their role and status
 */
export const RootRedirect = () => {
  const { isAuthenticated, isAdmin, isActive, isPending, isSuspended, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // Not authenticated -> Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check user status
  if (isSuspended) {
    return <Navigate to="/auth/account-suspended" replace />;
  }

  if (isPending) {
    return <Navigate to="/auth/pending-approval" replace />;
  }

  // Active users - redirect to appropriate dashboard
  if (isActive) {
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/staff/dashboard" replace />;
  }

  // Default fallback - pending approval
  return <Navigate to="/auth/pending-approval" replace />;
};
