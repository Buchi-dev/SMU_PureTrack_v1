

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  theme,
  Typography,
  Space,
  Breadcrumb,
  Button,
  Drawer,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  ApiOutlined,
  LineChartOutlined,
  HomeOutlined,
  SettingOutlined,
  BellOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { ROUTES } from '../../router/routes';
import UserMenu from '../UserMenu';
import AlertNotificationCenter from '../AlertNotificationCenter';
import { useResponsive } from '../../hooks/useResponsive';
import { MobileUserProfile, MobileLogoutButton } from '../index';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

interface StaffLayoutProps {
  children: React.ReactNode;
}

export const StaffLayout = ({ children }: StaffLayoutProps) => {
  const { isMobile } = useResponsive();
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard']);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, colorPrimary },
  } = theme.useToken();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, mobileMenuOpen]);

  // Update selected menu item based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/staff/devices')) {
      setSelectedKeys(['devices']);
    } else if (path.includes('/staff/readings')) {
      setSelectedKeys(['readings']);
    } else if (path.includes('/staff/analytics')) {
      setSelectedKeys(['analytics']);
    } else if (path.includes('/staff/alerts')) {
      setSelectedKeys(['alerts']);
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
      key: 'alerts',
      icon: <BellOutlined style={{ fontSize: '16px' }} />,
      label: 'Alerts',
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
      alerts: ROUTES.STAFF.ALERTS,
      settings: ROUTES.STAFF.SETTINGS,
    };

    const route = routeMap[e.key];
    if (route) {
      navigate(route);
      // Close mobile menu after navigation
      if (isMobile) {
        setMobileMenuOpen(false);
      }
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
    } else if (path.includes('/staff/alerts')) {
      items.push({ title: 'Alerts' });
    } else if (path.includes('/staff/settings')) {
      items.push({ title: 'Settings' });
    } else if (path.includes('/staff/dashboard')) {
      items.push({ title: 'Dashboard' });
    }

    return items;
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Mobile Drawer Menu */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          closeIcon={<CloseOutlined style={{ fontSize: '18px' }} />}
          styles={{
            header: {
              borderBottom: '1px solid #f0f0f0',
              padding: '16px 24px',
            },
            body: {
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
          width={280}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {/* Logo at Top */}
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #f0f0f0',
                  background: colorBgContainer,
                }}
              >
                <Space size="middle">
                  <img 
                    src="/system_logo.svg" 
                    alt="PureTrack Logo" 
                    style={{ width: 40, height: 40 }} 
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
                    <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      Staff Portal
                    </Text>
                  </div>
                </Space>
              </div>

              {/* User Profile below Logo */}
              <MobileUserProfile />

              {/* Mobile Menu Items */}
              <Menu
                mode="inline"
                selectedKeys={selectedKeys}
                items={menuItems}
                onClick={handleMenuClick}
                style={{
                  border: 'none',
                  fontSize: '15px',
                  padding: '8px 0',
                }}
              />
            </div>

            {/* Logout Button at Bottom */}
            <MobileLogoutButton onLogout={() => setMobileMenuOpen(false)} />
          </div>
        </Drawer>
      )}

      {/* Main Header with Navigation */}
      <Header
        style={{
          padding: isMobile ? '0 16px' : '0 32px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderBottom: `1px solid ${colorPrimary}15`,
          height: '64px',
        }}
      >
        {/* Left side - Mobile Hamburger or Desktop Logo + Nav */}
        <Space size={isMobile ? 'small' : 'large'} style={{ flex: 1 }}>
          {isMobile ? (
            <>
              {/* Mobile Hamburger */}
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                style={{
                  fontSize: '20px',
                  width: 48,
                  height: 48,
                }}
                aria-label="Open navigation menu"
              />
              {/* Mobile Logo */}
              <div
                onClick={() => navigate(ROUTES.STAFF.DASHBOARD)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <img 
                  src="/system_logo.svg" 
                  alt="PureTrack" 
                  style={{ width: 28, height: 28 }} 
                />
                <Text strong style={{ fontSize: '16px', color: colorPrimary }}>
                  PureTrack
                </Text>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Logo and Navigation */}
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
                  style={{ width: 36, height: 36 }} 
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
                  <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Staff Portal
                  </Text>
                </div>
              </div>

              {/* Desktop Navigation Menu */}
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
            </>
          )}
        </Space>

        {/* Right side - Actions and User Menu */}
        <Space size={isMobile ? 'small' : 'middle'}>
          {/* Alert Notifications */}
          <AlertNotificationCenter />

          {/* User Profile Menu - Hidden on mobile, shown in drawer instead */}
          {!isMobile && <UserMenu />}
        </Space>
      </Header>

      {/* Breadcrumb Navigation - Hidden on Mobile */}
      {!isMobile && (
        <div
          style={{
            background: colorBgContainer,
            padding: '12px 32px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Breadcrumb items={getBreadcrumbItems()} />
        </div>
      )}

      {/* Main Content Area */}
      <Content
        style={{
          margin: isMobile ? '16px 8px' : '24px 32px',
          minHeight: 'calc(100vh - 240px)',
        }}
      >
        <div
          style={{
            padding: isMobile ? '16px' : '32px',
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
          padding: isMobile ? '16px 8px' : '20px 32px',
        }}
      >
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: isMobile ? '12px' : '13px' }}>
            PureTrack Staff Portal
          </Text>
          <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '12px' }}>
            Water Quality Monitoring System © {new Date().getFullYear()}
          </Text>
        </Space>
      </Footer>
    </Layout>
  );
};
