import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  theme,
  Typography,
  Drawer,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  CloseOutlined,
  DashboardOutlined,
  SettingOutlined,
  BellOutlined,
  TeamOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ApiOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { ROUTES } from '../../router/routes';
import UserMenu from '../UserMenu';
import AlertNotificationCenter from '../AlertNotificationCenter';
import { useResponsive } from '../../hooks/useResponsive';
import { MobileUserProfile, MobileLogoutButton } from '../index';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { isMobile } = useResponsive();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dashboard']);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Persist collapsed state to localStorage (desktop only)
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('adminSidebarCollapsed', JSON.stringify(collapsed));
    }
  }, [collapsed, isMobile]);

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
    if (path.includes('/devices')) {
      setSelectedKeys(['devices']);
    } else if (path.includes('/readings')) {
      setSelectedKeys(['readings']);
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
      analytics: ROUTES.ADMIN.ANALYTICS,
      alerts: ROUTES.ADMIN.ALERTS,
      users: ROUTES.ADMIN.USERS,
      reports: ROUTES.ADMIN.REPORTS,
      settings: ROUTES.ADMIN.SETTINGS,
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

  // Sidebar content component (reused for desktop and mobile)
  const SidebarContent = () => (
    <>
      {/* Logo - Always at top */}
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
            width: (collapsed && !isMobile) ? 32 : 40,
            height: (collapsed && !isMobile) ? 32 : 40,
            transition: 'all 0.2s',
          }} 
        />
        {(!collapsed || isMobile) && (
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

      {/* User Profile - Only on mobile, below logo */}
      {isMobile && <MobileUserProfile />}

      {/* Menu */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ marginTop: 8, flex: 1 }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar - Hidden on Mobile */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          breakpoint="lg"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <SidebarContent />
        </Sider>
      )}

      {/* Mobile Drawer Sidebar */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          closeIcon={<CloseOutlined style={{ color: '#fff', fontSize: '18px' }} />}
          styles={{
            header: {
              background: '#001529',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px 24px',
            },
            body: {
              background: '#001529',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
          width={280}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <SidebarContent />
            </div>
            {/* Logout Button at Bottom */}
            <MobileLogoutButton onLogout={() => setMobileMenuOpen(false)} />
          </div>
        </Drawer>
      )}

      {/* Main Layout */}
      <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 200), 
        transition: 'all 0.2s',
      }}>
        {/* Header */}
        <Header
          style={{
            padding: isMobile ? '0 16px' : '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            height: '64px',
          }}
        >
          {/* Left side - Toggle button or Hamburger */}
          {isMobile ? (
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
          ) : (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            />
          )}

          {/* Center - Logo on Mobile */}
          {isMobile && (
            <div style={{ 
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <img 
                src="/system_logo.svg" 
                alt="PureTrack" 
                style={{ width: 28, height: 28 }} 
              />
              <Text strong style={{ fontSize: '16px' }}>
                PureTrack
              </Text>
            </div>
          )}

          {/* Right side - Notifications & User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
            {/* Alert Notifications */}
            <AlertNotificationCenter />

            {/* User Profile Menu - Hidden on mobile, shown in drawer instead */}
            {!isMobile && <UserMenu />}
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: isMobile ? '12px 8px' : '16px 12px',
            padding: 0,
            minHeight: 'calc(100vh - 140px)',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'hidden',
          }}
        >
          <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            {children}
          </div>
        </Content>

        {/* Footer */}
        <Footer style={{ 
          textAlign: 'center', 
          padding: isMobile ? '12px 8px' : '12px 16px', 
          fontSize: isMobile ? '11px' : '12px' 
        }}>
          Admin Panel ©{new Date().getFullYear()} • Capstone System
        </Footer>
      </Layout>
    </Layout>
  );
};