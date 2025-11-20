import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Result, Button, theme } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

// Protected Route Components
import { PublicRoute, ApprovedRoute, AdminRoute } from '../components/ProtectedRoute';
import { RootRedirect } from '../components/RootRedirect';

// Admin Pages
import { 
  AdminDashboard, 
  AdminDeviceManagement,
  AdminDeviceReadings,
  AdminReports,
  AdminAlerts,
  AdminAnalytics,
  AdminUserManagement,
  AdminSettings
} from '../pages/admin';

// Staff Pages
import { 
  StaffDashboard, 
  StaffDevices, 
  StaffReadings, 
  StaffAnalytics,
  StaffSettings
} from '../pages/staff';

// Auth Pages
import {
  AuthLogin,
  AuthAccountCompletion,
  AuthPendingApproval,
  AuthAccountSuspended
} from '../pages/auth';

/**
 * 404 Not Found Component with Theme Support
 */
const NotFoundPage = () => {
  const { token } = theme.useToken();
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: token.colorBgLayout,
      padding: token.paddingLG,
    }}>
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={
          <Button 
            type="primary" 
            icon={<HomeOutlined />}
            onClick={() => window.location.href = '/'}
          >
            Back to Home
          </Button>
        }
      />
    </div>
  );
};

/**
 * Application Routes Configuration
 * Uses React Router v6 with data router (createBrowserRouter)
 * 
 * Route Protection Levels:
 * - PublicRoute: Only accessible when NOT logged in (auth pages)
 * - ApprovedRoute: Requires authentication AND approved status
 * - AdminRoute: Requires authentication, approved status, AND admin role
 */
export const router = createBrowserRouter([
  // Root redirect - smart redirect based on user role
  {
    path: '/',
    element: <RootRedirect />,
  },

  // ==================== AUTH ROUTES ====================
  // Public routes - only accessible when not logged in
  {
    path: '/auth/login',
    element: (
      <PublicRoute>
        <AuthLogin />
      </PublicRoute>
    ),
  },
  {
    path: '/auth/complete-account',
    element: <AuthAccountCompletion />,
  },
  {
    path: '/auth/pending-approval',
    element: <AuthPendingApproval />,
  },
  {
    path: '/auth/account-suspended',
    element: <AuthAccountSuspended />,
  },

  // ==================== ADMIN ROUTES ====================
  // All admin routes require Admin role and Approved status
  {
    path: '/admin',
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: '/admin/dashboard',
    element: (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/devices',
    element: (
      <AdminRoute>
        <AdminDeviceManagement />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/devices/:deviceId/readings',
    element: (
      <AdminRoute>
        <AdminDeviceReadings />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/readings',
    element: (
      <AdminRoute>
        <AdminDeviceReadings />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/readings',
    element: (
      <AdminRoute>
        <AdminDeviceReadings />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/analytics',
    element: (
      <AdminRoute>
        <AdminAnalytics />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <AdminRoute>
        <AdminUserManagement />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/reports',
    element: (
      <AdminRoute>
        <AdminReports />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/alerts',
    element: (
      <AdminRoute>
        <AdminAlerts />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/settings',
    element: (
      <AdminRoute>
        <AdminSettings />
      </AdminRoute>
    ),
  },

  // ==================== STAFF DASHBOARD ====================
  // Staff routes - for approved staff members (both Admin and Staff roles can access)
  {
    path: '/staff',
    element: <Navigate to="/staff/dashboard" replace />,
  },
  {
    path: '/staff/dashboard',
    element: (
      <ApprovedRoute>
        <StaffDashboard />
      </ApprovedRoute>
    ),
  },
  {
    path: '/staff/devices',
    element: (
      <ApprovedRoute>
        <StaffDevices />
      </ApprovedRoute>
    ),
  },
  {
    path: '/staff/devices/:deviceId/readings',
    element: (
      <ApprovedRoute>
        <StaffReadings />
      </ApprovedRoute>
    ),
  },
  {
    path: '/staff/readings',
    element: (
      <ApprovedRoute>
        <StaffReadings />
      </ApprovedRoute>
    ),
  },
  {
    path: '/staff/analytics',
    element: (
      <ApprovedRoute>
        <StaffAnalytics />
      </ApprovedRoute>
    ),
  },
  {
    path: '/staff/settings',
    element: (
      <ApprovedRoute>
        <StaffSettings />
      </ApprovedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ApprovedRoute>
        <StaffDashboard />
      </ApprovedRoute>
    ),
  },

  // ==================== 404 NOT FOUND ====================
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

/**
 * Route Paths - Use these constants for navigation
 */
export const ROUTES = {
  HOME: '/',
  ADMIN: {
    BASE: '/admin',
    DASHBOARD: '/admin/dashboard',
    DEVICES: '/admin/devices',
    READINGS: '/admin/readings',
    ANALYTICS: '/admin/analytics',
    USERS: '/admin/users',
    REPORTS: '/admin/reports',
    ALERTS: '/admin/alerts',
    SETTINGS: '/admin/settings',
  },
  STAFF: {
    BASE: '/staff',
    DASHBOARD: '/staff/dashboard',
    DEVICES: '/staff/devices',
    READINGS: '/staff/readings',
    ANALYTICS: '/staff/analytics',
    SETTINGS: '/staff/settings',
  },
  AUTH: {
    LOGIN: '/auth/login',
    COMPLETE_ACCOUNT: '/auth/complete-account',
    PENDING_APPROVAL: '/auth/pending-approval',
    ACCOUNT_SUSPENDED: '/auth/account-suspended',
  },
} as const;
