import { Space, Row, Col, Typography, Alert, Divider, Tabs, Badge } from 'antd';
import { 
  DashboardOutlined, 
  DatabaseOutlined, 
  BellOutlined, 
  CloudServerOutlined 
} from '@ant-design/icons';
import { memo, useMemo, useState } from 'react';
import { AdminLayout } from "../../../components/layouts";
import { useMqttBridgeStatus, useRealtimeDevices, useRealtimeAlerts } from './hooks';
import {
  HealthOverview,
  MetricsGrid,
  MemoryMonitor,
  BufferMonitor,
  SystemInfo,
  RefreshControl,
  DeviceMonitor,
  AlertsMonitor,
  DashboardSummary,
} from './components';

const { Title } = Typography;

export const AdminDashboard = memo(() => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Load all data with 2-second real-time updates
  const mqttBridge = useMqttBridgeStatus();
  const realtimeDevices = useRealtimeDevices();
  const realtimeAlerts = useRealtimeAlerts(50);

  // Memoize static styles
  const containerStyle = useMemo(() => ({ 
    width: '100%', 
    padding: '24px' 
  }), []);

  const headerStyle = useMemo(() => ({ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px',
    marginBottom: '16px'
  }), []);

  const dividerStyle = useMemo(() => ({ 
    margin: '8px 0' 
  }), []);

  const titleStyle = useMemo(() => ({ 
    margin: 0 
  }), []);

  const sectionTitleStyle = useMemo(() => ({ 
    marginBottom: '16px' 
  }), []);

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

  // Tab items with badges
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
            mqttHealth={mqttBridge.health ? {
              status: mqttBridge.health.status,
              connected: mqttBridge.health.checks.mqtt.connected,
              metrics: mqttBridge.health.metrics,
            } : null}
            loading={isLoading}
          />

          {/* Quick Action Insights */}
          {realtimeAlerts.criticalAlerts.length > 0 && (
            <Alert
              message={`${realtimeAlerts.criticalAlerts.length} Critical Alert${realtimeAlerts.criticalAlerts.length > 1 ? 's' : ''} Require Immediate Attention`}
              description={
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {realtimeAlerts.criticalAlerts.slice(0, 3).map(alert => (
                    <li key={alert.alertId}>
                      <strong>{alert.deviceName || alert.deviceId}:</strong> {alert.message}
                    </li>
                  ))}
                  {realtimeAlerts.criticalAlerts.length > 3 && (
                    <li>... and {realtimeAlerts.criticalAlerts.length - 3} more</li>
                  )}
                </ul>
              }
              type="error"
              showIcon
              closable
            />
          )}

          {realtimeDevices.stats.offline > 0 && (
            <Alert
              message={`${realtimeDevices.stats.offline} Device${realtimeDevices.stats.offline > 1 ? 's' : ''} Offline`}
              description="Some devices are not reporting sensor data. Check the Devices tab for details."
              type="warning"
              showIcon
              closable
            />
          )}
        </Space>
      ),
    },
    {
      key: 'devices',
      label: (
        <span>
          <DatabaseOutlined /> 
          Devices 
          <Badge 
            count={realtimeDevices.stats.online} 
            style={{ marginLeft: 8 }}
            showZero
          />
        </span>
      ),
      children: (
        <DeviceMonitor 
          devices={realtimeDevices.devices} 
          loading={realtimeDevices.loading} 
        />
      ),
    },
    {
      key: 'alerts',
      label: (
        <span>
          <BellOutlined /> 
          Alerts 
          <Badge 
            count={realtimeAlerts.stats.active} 
            style={{ marginLeft: 8 }}
            showZero
          />
        </span>
      ),
      children: (
        <AlertsMonitor 
          alerts={realtimeAlerts.alerts} 
          loading={realtimeAlerts.loading} 
        />
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
            <Title level={4} style={sectionTitleStyle}>
              Real-time Metrics
            </Title>
            <MetricsGrid status={mqttBridge.status} loading={mqttBridge.loading} />
          </div>

          {/* Detailed Monitoring Section */}
          <div>
            <Title level={4} style={sectionTitleStyle}>
              System Monitoring
            </Title>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <MemoryMonitor 
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
      <Space direction="vertical" size="large" style={containerStyle}>
        {/* Header Section */}
        <div style={headerStyle}>
          <Title level={2} style={titleStyle}>
            Admin Dashboard
          </Title>
          <RefreshControl 
            onRefresh={handleRefreshAll} 
            loading={isLoading} 
            lastUpdate={lastUpdate} 
          />
        </div>

        <Divider style={dividerStyle} />

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
