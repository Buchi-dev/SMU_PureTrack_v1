import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminDashboard from '../pages/admin/AdminDashboard';
import { DeviceManagement } from '../pages/admin/DeviceManagement';
import Analytics from '../pages/admin/Analytics';
import UserManagement from '../pages/admin/UserManagement';
import Reports from '../pages/admin/Reports';
import Settings from '../pages/admin/Settings';

/**
 * Application Routes Configuration
 * Uses React Router v6 with data router (createBrowserRouter)
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: '/admin',
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: '/admin/dashboard',
    element: <AdminDashboard />,
  },
  {
    path: '/admin/devices',
    element: <DeviceManagement />,
  },
  {
    path: '/admin/analytics',
    element: <Analytics />,
  },
  {
    path: '/admin/users',
    element: <UserManagement />,
  },
  {
    path: '/admin/reports',
    element: <Reports />,
  },
  {
    path: '/admin/settings',
    element: <Settings />,
  },
  {
    path: '*',
    element: (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h1>404 - Page Not Found</h1>
        <a href="/admin/dashboard">Go to Dashboard</a>
      </div>
    ),
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
    ANALYTICS: '/admin/analytics',
    USERS: '/admin/users',
    REPORTS: '/admin/reports',
    SETTINGS: '/admin/settings',
  },
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
  },
} as const;
