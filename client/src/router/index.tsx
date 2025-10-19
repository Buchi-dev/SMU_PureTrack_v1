import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Result, Button, theme } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import AdminDashboard from '../pages/admin/AdminDashboard';
import { DeviceManagement } from '../pages/admin/DeviceManagement';
import { DeviceReadings } from '../pages/admin/DeviceReadings';
import { DataManagement } from '../pages/admin/DataManagement';
import { ManageReports } from '../pages/admin/ManageReports';
import Analytics from '../pages/admin/Analytics/Analytics';
import UserManagement from '../pages/admin/UserManagement/UserManagement';
import Settings from '../pages/admin/Settings';

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
            onClick={() => window.location.href = '/admin/dashboard'}
          >
            Back to Dashboard
          </Button>
        }
      />
    </div>
  );
};

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
    path: '/admin/devices/:deviceId/readings',
    element: <DeviceReadings />,
  },
  {
    path: '/admin/readings',
    element: <DeviceReadings />,
  },
  {
    path: '/admin/data',
    element: <DataManagement />,
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
    element: <ManageReports />,
  },
  {
    path: '/admin/settings',
    element: <Settings />,
  },
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
    SETTINGS: '/admin/settings',
  },
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
  },
} as const;
