import { Space, Typography, Alert, Divider, Tabs, Row, Col } from 'antd';
import { 
  DashboardOutlined, 
  CloudServerOutlined 
} from '@ant-design/icons';
import { memo, useMemo, useState, useEffect } from 'react';
import { AdminLayout } from "../../../components/layouts";
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
  RefreshControl,
  DashboardSummary,
} from './components';

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
    lastUpdate: mqttLastUpdate,
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

  // Calculate most recent update time across all sources
  const lastUpdate = useMemo(() => {
    const times = [mqttLastUpdate].filter(Boolean) as Date[];
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map((t) => t.getTime())));
  }, [mqttLastUpdate]);

  // Combined loading state
  const isLoading = mqttLoading || devicesLoading || alertsLoading;

  // Debug: Log loading states
  useEffect(() => {
    console.log('[AdminDashboard] Loading States:', {
      mqttLoading,
      devicesLoading,
      alertsLoading,
      combinedIsLoading: isLoading,
      mqttHealth: !!mqttHealth,
      mqttStatus: !!mqttStatus,
      devices: devices?.length,
      alerts: alerts?.length
    });
  }, [mqttLoading, devicesLoading, alertsLoading, isLoading, mqttHealth, mqttStatus, devices, alerts]);

  // 🔧 FIX: Only show loading on initial load, not on background refetches
  // If we have data, don't block the UI with loading state
  const isInitialLoading = isLoading && !mqttHealth && !devices && !alerts;

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
          {(() => {
            console.log('[AdminDashboard] Passing props to DashboardSummary:', {
              mqttHealth: mqttHealth ? {
                status: mqttHealth.status,
                connected: mqttHealth.checks?.mqtt?.connected,
                hasMetrics: !!mqttHealth.metrics,
                metrics: mqttHealth.metrics
              } : null,
              mqttMemory: mqttStatus?.memory || null,
              mqttFullHealth: mqttHealth ? {
                status: mqttHealth.status,
                hasChecks: !!mqttHealth.checks,
                hasMetrics: !!mqttHealth.metrics,
                metricsReceived: mqttHealth.metrics?.received,
                metricsPublished: mqttHealth.metrics?.published
              } : null,
              loading: isInitialLoading,  // 🔧 FIXED: Was isLoading, now isInitialLoading
              oldLoading: isLoading        // For comparison
            });
            return null;
          })()}
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
            loading={isInitialLoading}
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
