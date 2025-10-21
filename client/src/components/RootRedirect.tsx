import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spin } from 'antd';

/**
 * Smart Root Redirect
 * Redirects users to appropriate dashboard based on their role
 */
export const RootRedirect = () => {
  const { isAuthenticated, isAdmin, isApproved, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  // Not authenticated -> Login
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Authenticated but not approved -> Will be handled by auth flow
  if (!isApproved) {
    return <Navigate to="/auth/pending-approval" replace />;
  }

  // Admin users -> Admin Dashboard
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Staff users -> Staff Dashboard
  return <Navigate to="/staff/dashboard" replace />;
};
