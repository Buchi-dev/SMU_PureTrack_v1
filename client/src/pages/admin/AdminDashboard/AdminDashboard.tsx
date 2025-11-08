import { Space, Row, Col, Typography, Alert, Divider, Tabs } from 'antd';
import { 
  DashboardOutlined, 
  CloudServerOutlined 
} from '@ant-design/icons';
import { memo, useMemo, useState } from 'react';
import { AdminLayout } from "../../../components/layouts";
import { useMqttBridgeStatus, useRealtimeDevices, useRealtimeAlerts } from './hooks';
import {
  HealthOverview,
  MetricsGrid,
  MemoryMonitor,
  CpuMonitor,
  BufferMonitor,
  SystemInfo,
  RefreshControl,
  DashboardSummary,
} from './components';

const { Title } = Typography;

export const AdminDashboard = memo(() => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Load all data with 2-second real-time updates
  const mqttBridge = useMqttBridgeStatus();
  const realtimeDevices = useRealtimeDevices();
  const realtimeAlerts = useRealtimeAlerts(50);

  // Refresh all data
  const handleRefreshAll = () => {
    mqttBridge.refresh();
    realtimeDevices.refresh();
    realtimeAlerts.refresh();
  };

  // Get the most recent update time across all sources
  const lastUpdate = useMemo(() => {
    const times = [
      mqttBridge.lastUpdate,
      realtimeDevices.lastUpdate,
      realtimeAlerts.lastUpdate,
    ].filter(Boolean) as Date[];
    
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map(t => t.getTime())));
  }, [mqttBridge.lastUpdate, realtimeDevices.lastUpdate, realtimeAlerts.lastUpdate]);

  // Calculate loading state
  const isLoading = mqttBridge.loading || realtimeDevices.loading || realtimeAlerts.loading;

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
          {mqttBridge.error && (
            <Alert
              message="MQTT Bridge Connection Error"
              description={mqttBridge.error}
              type="error"
              showIcon
              closable
            />
          )}
          {realtimeDevices.error && (
            <Alert
              message="Device Monitoring Error"
              description={realtimeDevices.error.message}
              type="error"
              showIcon
              closable
            />
          )}
          {realtimeAlerts.error && (
            <Alert
              message="Alerts Monitoring Error"
              description={realtimeAlerts.error.message}
              type="error"
              showIcon
              closable
            />
          )}

          {/* Comprehensive Dashboard Summary */}
          <DashboardSummary
            deviceStats={realtimeDevices.stats}
            alertStats={realtimeAlerts.stats}
            alerts={realtimeAlerts.alerts}
            mqttHealth={mqttBridge.health ? {
              status: mqttBridge.health.status,
              connected: mqttBridge.health.checks.mqtt.connected,
              metrics: mqttBridge.health.metrics,
            } : null}
            mqttMemory={mqttBridge.status?.memory || null}
            mqttFullHealth={mqttBridge.health}
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
          {mqttBridge.error && (
            <Alert
              message="Connection Error"
              description={mqttBridge.error}
              type="error"
              showIcon
              closable
            />
          )}

          {/* Health Overview */}
          <HealthOverview health={mqttBridge.health} loading={mqttBridge.loading} />

          {/* Metrics Grid */}
          <div>
            <Title level={4} style={{ marginBottom: '16px' }}>
              Real-time Metrics
            </Title>
            <MetricsGrid status={mqttBridge.status} loading={mqttBridge.loading} />
          </div>

          {/* Detailed Monitoring Section */}
          <div>
            <Title level={4} style={{ marginBottom: '16px' }}>
              System Monitoring
            </Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <MemoryMonitor 
                  health={mqttBridge.health} 
                  status={mqttBridge.status} 
                  loading={mqttBridge.loading} 
                />
              </Col>
              <Col xs={24} lg={12}>
                <CpuMonitor 
                  health={mqttBridge.health} 
                  status={mqttBridge.status} 
                  loading={mqttBridge.loading} 
                />
              </Col>
              <Col xs={24} lg={12}>
                <SystemInfo status={mqttBridge.status} loading={mqttBridge.loading} />
              </Col>
              <Col xs={24} lg={12}>
                <BufferMonitor health={mqttBridge.health} loading={mqttBridge.loading} />
              </Col>
            </Row>
          </div>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%', padding: '24px' }}>
        {/* Header Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <Title level={2} style={{ margin: 0 }}>
            Admin Dashboard
          </Title>
          <RefreshControl 
            onRefresh={handleRefreshAll} 
            loading={isLoading} 
            lastUpdate={lastUpdate} 
          />
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Tabbed Interface */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Space>
    </AdminLayout>
  );
});
