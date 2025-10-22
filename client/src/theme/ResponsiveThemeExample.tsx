/**
 * COMPLETE RESPONSIVE THEME IMPLEMENTATION EXAMPLE
 * 
 * Demonstrates full integration of Ant Design v5 theme system
 * with device-adaptive responsive design principles
 */

import React from 'react';
import { ConfigProvider, Layout, Row, Col, Card, Button, Space, Typography } from 'antd';
import {
  useResponsiveTheme,
  useResponsiveColSpan,
  useResponsiveValue,
  getResponsiveGutter,
  getResponsiveSiderProps,
  useResponsiveToken,
} from './responsiveTheme';
import { themeConfig } from './themeConfig';

const { Header, Content, Sider, Footer } = Layout;
const { Title, Text } = Typography;

// ============================================================================
// EXAMPLE 1: Basic Responsive Theme Provider
// ============================================================================

export const ResponsiveApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { responsiveTheme, currentBreakpoint, deviceType } = useResponsiveTheme(themeConfig);

  return (
    <ConfigProvider theme={responsiveTheme}>
      <div data-device={deviceType} data-breakpoint={currentBreakpoint}>
        {children}
      </div>
    </ConfigProvider>
  );
};

// ============================================================================
// EXAMPLE 2: Responsive Layout with Adaptive Sidebar
// ============================================================================

export const ResponsiveLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isMobile, isDesktop } = useResponsiveTheme(themeConfig);
  const [collapsed, setCollapsed] = React.useState(isMobile);
  const siderProps = getResponsiveSiderProps(isMobile);

  // Auto-collapse on mobile
  React.useEffect(() => {
    if (isMobile && !collapsed) {
      setCollapsed(true);
    }
  }, [isMobile, collapsed]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Adaptive Sidebar */}
      <Sider
        {...siderProps}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          ...siderProps.style,
          // Full height on desktop, slide-in on mobile
          height: isDesktop ? '100vh' : 'calc(100vh - 64px)',
          top: isDesktop ? 0 : 64,
        }}
      >
        <div style={{ padding: 16 }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            {collapsed ? 'PT' : 'PureTrack'}
          </Title>
        </div>
        {/* Menu items here */}
      </Sider>

      <Layout>
        {/* Responsive Header */}
        <Header
          style={{
            padding: isMobile ? '0 16px' : '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {isMobile && (
            <Button
              type="text"
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: '#fff' }}
            >
              ☰
            </Button>
          )}
          <div>Navigation</div>
        </Header>

        {/* Responsive Content */}
        <Content
          style={{
            margin: isMobile ? '16px 8px' : '24px 16px',
            padding: isMobile ? 16 : 24,
          }}
        >
          {children}
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: 'center', padding: isMobile ? '12px 8px' : '24px 50px' }}>
          PureTrack ©{new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
  );
};

// ============================================================================
// EXAMPLE 3: Responsive Grid with Adaptive Columns
// ============================================================================

export const ResponsiveGrid: React.FC = () => {
  const { screens } = useResponsiveTheme(themeConfig);
  const token = useResponsiveToken();
  
  // Automatically adjust gutter based on screen size
  const gutter = getResponsiveGutter(screens);
  
  // Responsive column spans
  const cardSpan = useResponsiveColSpan({
    xs: 24,  // 1 column on phones
    sm: 12,  // 2 columns on large phones
    md: 8,   // 3 columns on tablets
    lg: 6,   // 4 columns on desktops
    xl: 4,   // 6 columns on large screens
  });

  return (
    <Row gutter={gutter}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Col key={index} span={cardSpan}>
          <Card
            hoverable
            style={{
              height: '100%',
              borderRadius: token.token.borderRadiusLG,
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={4}>Card {index + 1}</Title>
              <Text type="secondary">Responsive card content</Text>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

// ============================================================================
// EXAMPLE 4: Responsive Statistics Dashboard
// ============================================================================

export const ResponsiveDashboard: React.FC = () => {
  const { isMobile, token } = useResponsiveToken();
  
  // Responsive padding
  const cardPadding = useResponsiveValue(
    { xs: 12, sm: 16, md: 20, lg: 24 },
    16
  );

  // Responsive font sizes
  const titleLevel = useResponsiveValue<2 | 3 | 4>(
    { xs: 4, sm: 3, md: 2 },
    2
  );

  const stats = [
    { title: 'Total Devices', value: 24, icon: '📱' },
    { title: 'Active Alerts', value: 3, icon: '⚠️' },
    { title: 'Data Points', value: '15.2K', icon: '📊' },
    { title: 'Uptime', value: '99.9%', icon: '✅' },
  ];

  return (
    <Row gutter={[16, 16]}>
      {stats.map((stat, index) => (
        <Col key={index} xs={24} sm={12} md={12} lg={6}>
          <Card
            style={{
              padding: cardPadding,
              textAlign: 'center',
              borderRadius: token.borderRadiusLG,
            }}
          >
            <Space direction="vertical" size={isMobile ? 'small' : 'middle'} style={{ width: '100%' }}>
              <div style={{ fontSize: isMobile ? 32 : 48 }}>{stat.icon}</div>
              <Title level={titleLevel} style={{ margin: 0 }}>
                {stat.value}
              </Title>
              <Text type="secondary">{stat.title}</Text>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

// ============================================================================
// EXAMPLE 5: Responsive Form Layout
// ============================================================================

export const ResponsiveForm: React.FC = () => {
  const { isMobile } = useResponsiveTheme(themeConfig);

  return (
    <Card>
      <Row gutter={[16, 16]}>
        {/* Single column on mobile, two columns on desktop */}
        <Col xs={24} md={12}>
          <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}>
            <label>Full Name</label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: isMobile ? '12px' : '8px',
                fontSize: isMobile ? '16px' : '14px', // Prevent zoom on iOS
                borderRadius: '6px',
                border: '1px solid #d9d9d9',
              }}
            />
          </Space>
        </Col>

        <Col xs={24} md={12}>
          <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 'small' : 'middle'}>
            <label>Email</label>
            <input
              type="email"
              style={{
                width: '100%',
                padding: isMobile ? '12px' : '8px',
                fontSize: isMobile ? '16px' : '14px',
                borderRadius: '6px',
                border: '1px solid #d9d9d9',
              }}
            />
          </Space>
        </Col>

        <Col span={24}>
          <Button
            type="primary"
            size={isMobile ? 'large' : 'middle'}
            block={isMobile}
            style={{
              marginTop: isMobile ? 8 : 0,
              height: isMobile ? 44 : undefined, // Touch-friendly
            }}
          >
            Submit
          </Button>
        </Col>
      </Row>
    </Card>
  );
};

// ============================================================================
// EXAMPLE 6: Complete Application Integration
// ============================================================================

export const CompleteResponsiveApp: React.FC = () => {
  const {
    responsiveTheme,
    currentBreakpoint,
    isMobile,
    isTablet,
    windowWidth,
  } = useResponsiveTheme(themeConfig);

  return (
    <ConfigProvider theme={responsiveTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        {/* Debug Info (remove in production) */}
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            padding: 8,
            background: '#001529',
            color: '#fff',
            borderRadius: 4,
            fontSize: 12,
            zIndex: 9999,
          }}
        >
          <div>Breakpoint: {currentBreakpoint}</div>
          <div>Width: {windowWidth}px</div>
          <div>Device: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}</div>
        </div>

        <ResponsiveLayout>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <ResponsiveDashboard />
            <ResponsiveGrid />
            <ResponsiveForm />
          </Space>
        </ResponsiveLayout>
      </Layout>
    </ConfigProvider>
  );
};

export default {
  ResponsiveApp,
  ResponsiveLayout,
  ResponsiveGrid,
  ResponsiveDashboard,
  ResponsiveForm,
  CompleteResponsiveApp,
};
