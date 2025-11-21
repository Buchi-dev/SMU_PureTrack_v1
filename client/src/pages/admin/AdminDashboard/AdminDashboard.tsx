import { Space, Alert, Tabs, Layout } from 'antd';
import { 
  DashboardOutlined, 
  ReloadOutlined,
} from '@ant-design/icons';
import { memo, useState } from 'react';
import { AdminLayout } from "../../../components/layouts";
import { PageHeader } from "../../../components/PageHeader";
import { 
  useSystemHealth,
  useDevices, 
  useAlerts 
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
  
  // ✅ GLOBAL HOOKS - Real-time data from service layer
  const {
    health: systemHealth,
    isLoading: healthLoading,
    error: healthError,
    refetch: healthRefetch,
  } = useSystemHealth({ pollInterval: 10000 });

  const {
    devices,
    isLoading: devicesLoading,
    error: devicesError,
    refetch: devicesRefetch,
  } = useDevices({ pollInterval: 15000 });

  const {
    alerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: alertsRefetch,
  } = useAlerts({ 
    filters: { limit: 50 },
    pollInterval: 10000 
  });

  // ✅ LOCAL HOOK - UI-specific statistics calculation
  const { deviceStats, alertStats } = useDashboardStats(devices, alerts);

  // Refresh all data sources
  const handleRefreshAll = async () => {
    await Promise.all([
      healthRefetch(),
      devicesRefetch(),
      alertsRefetch()
    ]);
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
          {healthError && (
            <Alert
              message="System Health Connection Error"
              description={healthError.message}
              type="error"
              showIcon
              closable
            />
          )}
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

          {/* PRIORITY 1: Overall System Health + Key Metrics (TOP) */}
          <OverallHealthCard
            deviceStats={deviceStats}
            alertStats={alertStats}
            alerts={alerts}
            systemHealth={systemHealth}
            loading={isLoading}
          />

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

          {/* PRIORITY 4: Recent Alerts List */}
          <RecentAlertsList
            alerts={alerts}
            loading={alertsLoading}
            maxItems={10}
          />
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Content style={{ padding: '24px' }}>
        <PageHeader
          title="Dashboard"
          icon={<DashboardOutlined />}
          description="Monitor system health, device status, and water quality metrics in real-time"
          breadcrumbItems={[
            { title: 'Dashboard', icon: <DashboardOutlined /> }
          ]}
          actions={[
            {
              key: 'refresh',
              label: 'Refresh',
              icon: <ReloadOutlined spin={isLoading} />,
              onClick: handleRefreshAll,
              disabled: isLoading,
            }
          ]}
        />

        {/* Tabbed Interface */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          style={{ marginTop: 24 }}
        />
      </Content>
    </AdminLayout>
  );
});
