

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Badge,
  theme,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  BellOutlined,
  BarChartOutlined,
  ApiOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { ROUTES } from '../../router';
import UserMenu from '../UserMenu';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

interface StaffLayoutProps {
  children: React.ReactNode;
}

export const StaffLayout = ({ children }: StaffLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard']);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Update selected menu item based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/staff/devices')) {
      setSelectedKeys(['devices']);
    } else if (path.includes('/staff/readings')) {
      setSelectedKeys(['readings']);
    } else if (path.includes('/staff/analytics')) {
      setSelectedKeys(['analytics']);
    } else if (path.includes('/staff/dashboard')) {
      setSelectedKeys(['dashboard']);
    }
  }, [location.pathname]);

  // Sidebar menu items for staff (limited access)
  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'devices',
      icon: <ApiOutlined />,
      label: 'View Devices',
    },
    {
      key: 'readings',
      icon: <LineChartOutlined />,
      label: 'Sensor Data',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
  ];

  // Handle menu navigation
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const routeMap: Record<string, string> = {
      dashboard: ROUTES.STAFF.DASHBOARD,
      devices: ROUTES.STAFF.DEVICES,
      readings: ROUTES.STAFF.READINGS,
      analytics: ROUTES.STAFF.ANALYTICS,
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
          }}
        >
          {!collapsed ? (
            <Text strong style={{ color: '#fff', fontSize: '18px' }}>
              Staff Portal
            </Text>
          ) : (
            <Text strong style={{ color: '#fff', fontSize: '18px' }}>
              SP
            </Text>
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
            {/* Notifications */}
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: '18px' }} />}
                size="large"
              />
            </Badge>

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
          Staff Portal ©{new Date().getFullYear()} • Water Quality Monitoring System
        </Footer>
      </Layout>
    </Layout>
  );
};
