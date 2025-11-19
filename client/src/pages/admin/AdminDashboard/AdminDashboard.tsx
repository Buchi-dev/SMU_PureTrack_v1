import { Space, Alert, Tabs, Row, Col, Layout, Typography } from 'antd';
import { 
  DashboardOutlined, 
  CloudServerOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { memo, useState } from 'react';
import { AdminLayout } from "../../../components/layouts";
import { PageHeader } from "../../../components/PageHeader";
import { 
  useRealtime_MQTTMetrics, 
  useRealtime_Devices, 
  useRealtime_Alerts 
} from '../../../hooks';
import { useDashboardStats } from './hooks';
import {
  HealthOverview,
  MetricsGrid,
  MemoryMonitor,
  CpuMonitor,
  BufferMonitor,
  SystemInfo,
  DashboardSummary,
} from './components';

const { Content } = Layout;
const { Title } = Typography;

/**
 * AdminDashboard - Admin Dashboard Page
 * 
 * Displays comprehensive system overview including:
 * - Device status and sensor readings
 * - Water quality alerts
 * - MQTT Bridge health metrics
 * - Real-time monitoring charts
 * 
 * Architecture: Uses GLOBAL hooks only for data fetching
 */
export const AdminDashboard = memo(() => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // ✅ GLOBAL HOOKS - Real-time data from service layer
  const {
    health: mqttHealth,
    status: mqttStatus,
    isLoading: mqttLoading,
    error: mqttError,
    refetch: mqttRefetch,
  } = useRealtime_MQTTMetrics({ pollInterval: 2000 });

  const {
    devices,
    isLoading: devicesLoading,
    error: devicesError,
    refetch: devicesRefetch,
  } = useRealtime_Devices({ includeMetadata: true });

  const {
    alerts,
    isLoading: alertsLoading,
    error: alertsError,
    refetch: alertsRefetch,
  } = useRealtime_Alerts({ maxAlerts: 50 });

  // ✅ LOCAL HOOK - UI-specific statistics calculation
  const { deviceStats, alertStats } = useDashboardStats(devices, alerts);

  // Refresh all data sources
  const handleRefreshAll = () => {
    mqttRefetch();
    devicesRefetch();
    alertsRefetch();
  };

  // Combined loading state
  const isLoading = mqttLoading || devicesLoading || alertsLoading;

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
          {mqttError && (
            <Alert
              message="MQTT Bridge Connection Error"
              description={mqttError.message}
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

          {/* Comprehensive Dashboard Summary */}
          <DashboardSummary
            deviceStats={deviceStats}
            alertStats={alertStats}
            alerts={alerts}
            mqttHealth={mqttHealth ? {
              status: mqttHealth.status,
              connected: mqttHealth.checks.mqtt.connected,
              metrics: mqttHealth.metrics,
            } : null}
            mqttMemory={mqttStatus?.memory || null}
            mqttFullHealth={mqttHealth}
            loading={isLoading}
          />
        </Space>
      ),
    },
    {
      key: 'mqtt',
      label: (
        <span>
          <CloudServerOutlined /> MQTT Bridge
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Error Alert */}
          {mqttError && (
            <Alert
              message="Connection Error"
              description={mqttError.message}
              type="error"
              showIcon
              closable
            />
          )}

          {/* Health Overview */}
          <HealthOverview health={mqttHealth} loading={mqttLoading} />

          {/* Metrics Grid */}
          <div>
            <Title level={4} style={{ marginBottom: '16px' }}>
              Real-time Metrics
            </Title>
            <MetricsGrid status={mqttStatus} loading={mqttLoading} />
          </div>

          {/* Detailed Monitoring Section */}
          <div>
            <Title level={4} style={{ marginBottom: '16px' }}>
              System Monitoring
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <MemoryMonitor 
                  health={mqttHealth} 
                  status={mqttStatus} 
                  loading={mqttLoading} 
                />
              </Col>
              <Col xs={24} lg={12}>
                <CpuMonitor 
                  health={mqttHealth} 
                  status={mqttStatus} 
                  loading={mqttLoading} 
                />
              </Col>
              <Col xs={24} lg={12}>
                <SystemInfo status={mqttStatus} loading={mqttLoading} />
              </Col>
              <Col xs={24} lg={12}>
                <BufferMonitor health={mqttHealth} loading={mqttLoading} />
              </Col>
            </Row>
          </div>
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
