

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  theme,
  Typography,
  Space,
  Breadcrumb,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  ApiOutlined,
  LineChartOutlined,
  HomeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { ROUTES } from '../../router';
import UserMenu from '../UserMenu';
import AlertNotificationCenter from '../AlertNotificationCenter';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

interface StaffLayoutProps {
  children: React.ReactNode;
}

export const StaffLayout = ({ children }: StaffLayoutProps) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard']);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, colorPrimary },
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
    } else if (path.includes('/staff/settings')) {
      setSelectedKeys(['settings']);
    } else if (path.includes('/staff/dashboard')) {
      setSelectedKeys(['dashboard']);
    }
  }, [location.pathname]);

  // Header menu items for staff
  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined style={{ fontSize: '16px' }} />,
      label: 'Dashboard',
    },
    {
      key: 'devices',
      icon: <ApiOutlined style={{ fontSize: '16px' }} />,
      label: 'Devices',
    },
    {
      key: 'readings',
      icon: <LineChartOutlined style={{ fontSize: '16px' }} />,
      label: 'Sensor Data',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined style={{ fontSize: '16px' }} />,
      label: 'Analytics',
    },
    {
      key: 'settings',
      icon: <SettingOutlined style={{ fontSize: '16px' }} />,
      label: 'Settings',
    },
  ];

  // Handle menu navigation
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const routeMap: Record<string, string> = {
      dashboard: ROUTES.STAFF.DASHBOARD,
      devices: ROUTES.STAFF.DEVICES,
      readings: ROUTES.STAFF.READINGS,
      analytics: ROUTES.STAFF.ANALYTICS,
      settings: ROUTES.STAFF.SETTINGS,
    };

    const route = routeMap[e.key];
    if (route) {
      navigate(route);
    }
  };

  // Generate breadcrumb items
  const getBreadcrumbItems = () => {
    const path = location.pathname;
    const items: { title: string | React.ReactNode }[] = [
      {
        title: (
          <Space>
            <HomeOutlined />
            <span>Staff Portal</span>
          </Space>
        ),
      },
    ];

    if (path.includes('/staff/devices')) {
      items.push({ title: 'Devices' });
    } else if (path.includes('/staff/readings')) {
      items.push({ title: 'Sensor Data' });
    } else if (path.includes('/staff/analytics')) {
      items.push({ title: 'Analytics' });
    } else if (path.includes('/staff/settings')) {
      items.push({ title: 'Settings' });
    } else if (path.includes('/staff/dashboard')) {
      items.push({ title: 'Dashboard' });
    }

    return items;
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Main Header with Navigation */}
      <Header
        style={{
          padding: '0 32px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderBottom: `1px solid ${colorPrimary}15`,
        }}
      >
        {/* Left side - Logo and Navigation */}
        <Space size="large" style={{ flex: 1 }}>
          {/* Logo and Branding */}
          <div
            onClick={() => navigate(ROUTES.STAFF.DASHBOARD)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              paddingRight: '24px',
              borderRight: '1px solid #f0f0f0',
            }}
          >
            <img 
              src="/system_logo.svg" 
              alt="PureTrack Logo" 
              style={{ 
                width: 36,
                height: 36,
              }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
              <Text 
                strong 
                style={{ 
                  fontSize: '18px',
                  color: colorPrimary,
                  fontWeight: 600,
                }}
              >
                PureTrack
              </Text>
              <Text 
                style={{ 
                  fontSize: '12px',
                  color: '#8c8c8c',
                }}
              >
                Staff Portal
              </Text>
            </div>
          </div>

          {/* Main Navigation Menu */}
          <Menu
            mode="horizontal"
            selectedKeys={selectedKeys}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 500,
            }}
          />
        </Space>

        {/* Right side - Actions and User Menu */}
        <Space size="middle">
          {/* Alert Notifications */}
          <AlertNotificationCenter />

          {/* User Profile Menu */}
          <UserMenu />
        </Space>
      </Header>

      {/* Breadcrumb Navigation */}
      <div
        style={{
          background: colorBgContainer,
          padding: '12px 32px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Breadcrumb items={getBreadcrumbItems()} />
      </div>

      {/* Main Content Area */}
      <Content
        style={{
          margin: '24px 32px',
          minHeight: 'calc(100vh - 240px)',
        }}
      >
        <div
          style={{
            padding: '32px',
            background: colorBgContainer,
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            border: '1px solid #f0f0f0',
          }}
        >
          {children}
        </div>
      </Content>

      {/* Footer */}
      <Footer 
        style={{ 
          textAlign: 'center',
          background: colorBgContainer,
          borderTop: '1px solid #f0f0f0',
          padding: '20px 32px',
        }}
      >
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: '13px' }}>
            PureTrack Staff Portal
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Water Quality Monitoring System © {new Date().getFullYear()}
          </Text>
        </Space>
      </Footer>
    </Layout>
  );
};
