import { Space, Alert, Tabs, Layout } from 'antd';
import { 
  DashboardOutlined, 
  ReloadOutlined,
} from '@ant-design/icons';
import { memo, useState } from 'react';
import { AdminLayout } from "../../../components/layouts";
import { PageHeader } from "../../../components/PageHeader";
import { 
  useHealth,
  useDevices, 
  useAlerts,
  useResponsive
} from '../../../hooks';
import { useDashboardStats } from './hooks';
import {
  OverallHealthCard,
  QuickStatsCard,
  SystemHealthCard,
  RecentAlertsList,
} from './components';

const { Content } = Layout;

/**
 * AdminDashboard - Admin Dashboard Page
 * 
 * Displays comprehensive system overview including:
 * - Device status and sensor readings
 * - Water quality alerts
 * - System health metrics
 * - Real-time monitoring charts
 * 
 * Architecture: Uses GLOBAL hooks only for data fetching
 */
export const AdminDashboard = memo(() => {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const { isMobile } = useResponsive();
  
  // ✅ GLOBAL HOOKS - Real-time data from service layer
  const {
    health: systemHealth,
    isLoading: healthLoading,
  } = useHealth(); // 🔥 NO POLLING - WebSocket broadcasts every 10s

  const {
    devices,
    isLoading: devicesLoading,
    error: devicesError,
    refetch: devicesRefetch,
  } = useDevices(); // 🔥 NO POLLING - WebSocket provides real-time updates

  const {
    alerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: alertsRefetch,
  } = useAlerts({ 
    filters: { limit: 50 },
  }); // 🔥 NO POLLING - WebSocket broadcasts alert:new/resolved

  // ✅ LOCAL HOOK - UI-specific statistics calculation
  const { deviceStats, alertStats } = useDashboardStats(devices, alerts);

  // Refresh all data sources
  const handleRefreshAll = async () => {
    if (refreshing) return; // Prevent spam clicks
    
    setRefreshing(true);
    try {
      await Promise.all([
        devicesRefetch(),
        alertsRefetch()
      ]);
      setTimeout(() => setRefreshing(false), 500);
    } catch (error) {
      console.error('Refresh error:', error);
      setRefreshing(false);
    }
  };

  // Combined loading state
  const isLoading = healthLoading || devicesLoading || alertsLoading;

  // Tab items
  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DashboardOutlined /> Overview
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Error Alerts */}
          {devicesError && (
            <Alert
              message="Device Monitoring Error"
              description={devicesError.message}
              type="error"
              showIcon
              closable
            />
          )}
          {alertsError && (
            <Alert
              message="Alerts Monitoring Error"
              description={alertsError.message}
              type="error"
              showIcon
              closable
            />
          )}

          {/* PRIORITY 1: Overall System Health + Recent Alerts (TOP ROW) */}
          <Space direction="vertical" size={isMobile ? 'small' : 'middle'} style={{ width: '100%' }}>
            <OverallHealthCard
              deviceStats={deviceStats}
              alertStats={alertStats}
              alerts={alerts}
              systemHealth={systemHealth}
              loading={isLoading}
            />
            
            <RecentAlertsList
              alerts={alerts}
              loading={alertsLoading}
              maxItems={isMobile ? 5 : 10}
            />
          </Space>

          {/* PRIORITY 2: Quick Stats - Devices & Alerts */}
          <QuickStatsCard
            deviceStats={deviceStats}
            alertStats={alertStats}
          />

          {/* PRIORITY 3: System Health Monitor - Detailed Service Status */}
          <SystemHealthCard
            systemHealth={systemHealth}
            loading={healthLoading}
          />
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Content style={{ padding: isMobile ? '12px' : '24px' }}>
        <PageHeader
          title="Dashboard"
          icon={<DashboardOutlined />}
          description={isMobile ? "" : "Monitor system health, device status, and water quality metrics in real-time"}
          breadcrumbItems={[
            { title: 'Dashboard', icon: <DashboardOutlined /> }
          ]}
          actions={[
            {
              key: 'refresh',
              label: isMobile ? "" : 'Refresh',
              icon: <ReloadOutlined spin={refreshing} />,
              onClick: handleRefreshAll,
              disabled: refreshing,
              loading: refreshing,
            }
          ]}
        />

        {/* Tabbed Interface */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size={isMobile ? 'small' : 'large'}
          style={{ marginTop: isMobile ? 12 : 24 }}
        />
      </Content>
    </AdminLayout>
  );
});
