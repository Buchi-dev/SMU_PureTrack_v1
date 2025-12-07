import { createBrowserRouter, Navigate } from 'react-router-dom';

// Protected Route Components
import { PublicRoute, ProtectedRoute, ApprovedRoute, AdminRoute, AccountCompletionRoute } from '../components/ProtectedRoute';
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
  AdminSettings,
  AdminSystemHealth
} from '../pages/admin';
import ReportHistory from '../pages/admin/AdminReports/ReportHistory';

// Staff Pages
import { 
  StaffDashboard, 
  StaffDevices, 
  StaffReadings, 
  StaffAnalytics,
  StaffAlerts,
  StaffSettings
} from '../pages/staff';

// Auth Pages
import {
  AuthLogin,
  AuthAccountCompletion,
  AuthPendingApproval,
  AuthAccountSuspended
} from '../pages/auth';

// 404 Page
import { NotFoundPage } from '../pages/NotFoundPage';

// Test Page (Development)
import ComponentTestPage from '../pages/ComponentTestPage';

/**
 * Application Routes Configuration
 * Uses React Router v6 with data router (createBrowserRouter)
 * 
 * Route Protection Levels:
 * - PublicRoute: Only accessible when NOT logged in (auth pages)
 * - ApprovedRoute: Requires authentication AND approved status
 * - AdminRoute: Requires authentication, approved status, AND admin role
 */
const router = createBrowserRouter([
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
    path: '/auth/account-completion',
    element: (
      <AccountCompletionRoute>
        <AuthAccountCompletion />
      </AccountCompletionRoute>
    ),
  },
  {
    path: '/auth/pending-approval',
    element: (
      <ProtectedRoute>
        <AuthPendingApproval />
      </ProtectedRoute>
    ),
  },
  {
    path: '/auth/account-suspended',
    element: (
      <ProtectedRoute>
        <AuthAccountSuspended />
      </ProtectedRoute>
    ),
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
    path: '/admin/reports/history',
    element: (
      <AdminRoute>
        <ReportHistory />
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
  {
    path: '/admin/health',
    element: (
      <AdminRoute>
        <AdminSystemHealth />
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
    path: '/staff/alerts',
    element: (
      <ApprovedRoute>
        <StaffAlerts />
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

  // ==================== TEST PAGE (DEVELOPMENT) ====================
  {
    path: '/test/components',
    element: <ComponentTestPage />,
  },

  // ==================== 404 NOT FOUND ====================
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export { router };
