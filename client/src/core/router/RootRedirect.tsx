import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';
import { Spin } from 'antd';

/**
 * Smart Root Redirect
 * Redirects users to appropriate dashboard based on their role and status
 */
export const RootRedirect = () => {
  const { isAuthenticated, isAdmin, isApproved, isPending, isSuspended, userProfile, loading } = useAuth();

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

  // Check if profile is incomplete (missing department or phone)
  if (!userProfile || !userProfile.department || !userProfile.phoneNumber) {
    return <Navigate to="/auth/complete-account" replace />;
  }

  // Check user status
  if (isSuspended) {
    return <Navigate to="/auth/account-inactive" replace />;
  }

  if (isPending) {
    return <Navigate to="/auth/pending-approval" replace />;
  }

  // Approved users - redirect to appropriate dashboard
  if (isApproved) {
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/staff/dashboard" replace />;
  }

  // Default fallback - pending approval
  return <Navigate to="/auth/pending-approval" replace />;
};
