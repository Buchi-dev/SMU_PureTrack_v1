import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Result, Button, theme } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

// Protected Route Components
import { PublicRoute, ApprovedRoute, AdminRoute } from './ProtectedRoute';
import { RootRedirect } from './RootRedirect';

// Authentication Pages
import {
  LoginPage,
  AccountCompletionPage,
  PendingApprovalPage,
  AccountInactivePage,
} from '../../features/authentication';

// Dashboard Pages
import {
  AdminDashboardPage,
  StaffDashboardPage,
  StaffDevicesPage,
  StaffReadingsPage,
} from '../../features/dashboard';

// Device Management Pages
import { DeviceManagementPage } from '../../features/device-management';

// Device Readings Pages  
import DataManagementPage from '../../features/device-readings/pages/DataManagementPage';
import DeviceReadingsPage from '../../features/device-readings/pages/DeviceReadingsPage';

// Alerts Pages
import ManageAlertsPage from '../../features/alerts/pages/ManageAlertsPage';

// Analytics Pages
import AdminAnalyticsPage from '../../features/analytics/pages/AdminAnalyticsPage';
import StaffAnalyticsPage from '../../features/analytics/pages/StaffAnalyticsPage';

// Reports Pages
import { ManageReportsPage } from '../../features/reports';

// User Management Pages
import UserManagementPage from '../../features/user-management/pages/UserManagementPage';

// Settings Pages
import SettingsPage from '../../features/settings/pages/SettingsPage';

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
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/auth/complete-account',
    element: <AccountCompletionPage />,
  },
  {
    path: '/auth/pending-approval',
    element: <PendingApprovalPage />,
  },
  {
    path: '/auth/account-inactive',
    element: <AccountInactivePage />,
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
        <AdminDashboardPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/devices',
    element: (
      <AdminRoute>
        <DeviceManagementPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/devices/:deviceId/readings',
    element: (
      <AdminRoute>
        <DeviceReadingsPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/readings',
    element: (
      <AdminRoute>
        <DeviceReadingsPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/data',
    element: (
      <AdminRoute>
        <DataManagementPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/analytics',
    element: (
      <AdminRoute>
        <AdminAnalyticsPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <AdminRoute>
        <UserManagementPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/reports',
    element: (
      <AdminRoute>
        <ManageReportsPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/alerts',
    element: (
      <AdminRoute>
        <ManageAlertsPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/settings',
    element: (
      <AdminRoute>
        <SettingsPage />
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
        <StaffDashboardPage />
      </ApprovedRoute>
    ),
  },
  {
    path: '/staff/devices',
    element: (
      <ApprovedRoute>
        <StaffDevicesPage />
      </ApprovedRoute>
    ),
  },
  {
    path: '/staff/devices/:deviceId/readings',
    element: (
      <ApprovedRoute>
        <StaffReadingsPage />
      </ApprovedRoute>
    ),
  },
  {
    path: '/staff/readings',
    element: (
      <ApprovedRoute>
        <StaffReadingsPage />
      </ApprovedRoute>
    ),
  },
  {
    path: '/staff/analytics',
    element: (
      <ApprovedRoute>
        <StaffAnalyticsPage />
      </ApprovedRoute>
    ),
  },
  
  // Legacy dashboard route (redirect based on role)
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
    DATA: '/admin/data',
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
  },
  AUTH: {
    LOGIN: '/auth/login',
    COMPLETE_ACCOUNT: '/auth/complete-account',
    PENDING_APPROVAL: '/auth/pending-approval',
    ACCOUNT_INACTIVE: '/auth/account-inactive',
  },
} as const;
