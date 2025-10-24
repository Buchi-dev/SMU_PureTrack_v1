import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  theme,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  SettingOutlined,
  DatabaseOutlined,
  BellOutlined,
  TeamOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ApiOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { ROUTES } from '../../router';
import UserMenu from '../UserMenu';
import AlertNotificationCenter from '../AlertNotificationCenter';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard']);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // Update selected menu item based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/devices')) {
      setSelectedKeys(['devices']);
    } else if (path.includes('/readings')) {
      setSelectedKeys(['readings']);
    } else if (path.includes('/data')) {
      setSelectedKeys(['data']);
    } else if (path.includes('/dashboard')) {
      setSelectedKeys(['dashboard']);
    } else if (path.includes('/analytics')) {
      setSelectedKeys(['analytics']);
    } else if (path.includes('/users')) {
      setSelectedKeys(['users']);
    } else if (path.includes('/reports')) {
      setSelectedKeys(['reports']);
    } else if (path.includes('/alerts')) {
      setSelectedKeys(['alerts']);
    } else if (path.includes('/settings')) {
      setSelectedKeys(['settings']);
    }
  }, [location.pathname]);

  // Sidebar menu items with route mapping
  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'devices',
      icon: <ApiOutlined />,
      label: 'Devices',
    },
    {
      key: 'readings',
      icon: <LineChartOutlined />,
      label: 'Sensor Readings',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
    {
      key: 'alerts',
      icon: <BellOutlined />,
      label: 'Alerts',
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'User Management',
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: 'data',
      icon: <DatabaseOutlined />,
      label: 'Data Management',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  // Handle menu navigation
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const routeMap: Record<string, string> = {
      dashboard: ROUTES.ADMIN.DASHBOARD,
      devices: ROUTES.ADMIN.DEVICES,
      readings: ROUTES.ADMIN.READINGS,
      data: ROUTES.ADMIN.DATA,
      analytics: ROUTES.ADMIN.ANALYTICS,
      alerts: ROUTES.ADMIN.ALERTS,
      users: ROUTES.ADMIN.USERS,
      reports: ROUTES.ADMIN.REPORTS,
      settings: ROUTES.ADMIN.SETTINGS,
    };

    const route = routeMap[e.key];
    if (route) {
      navigate(route);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          console.log('Breakpoint:', broken);
        }}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            gap: '12px',
          }}
        >
          <img 
            src="/system_logo.svg" 
            alt="PureTrack Logo" 
            style={{ 
              width: collapsed ? 32 : 40,
              height: collapsed ? 32 : 40,
              transition: 'all 0.2s',
            }} 
          />
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <Text strong style={{ color: '#fff', fontSize: '16px' }}>
                PureTrack
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '12px' }}>
                Admin Panel
              </Text>
            </div>
          )}
        </div>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ marginTop: 8 }}
        />
      </Sider>

      {/* Main Layout */}
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {/* Left side - Toggle button */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />

          {/* Right side - Notifications & User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Alert Notifications */}
            <AlertNotificationCenter />

            {/* User Profile Menu */}
            <UserMenu />
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: 'center' }}>
          Admin Panel ©{new Date().getFullYear()} • Capstone System
        </Footer>
      </Layout>
    </Layout>
  );
};