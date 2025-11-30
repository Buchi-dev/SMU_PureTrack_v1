/**
 * AdminAnalytics - Analytics Dashboard Page
 * 
 * Displays comprehensive water quality analytics including:
 * - System health metrics
 * - Real-time device readings
 * - Water quality alerts
 * - Historical trends and charts
 * - Device performance tracking
 * - WHO compliance monitoring
 * 
 * Architecture: Uses GLOBAL read hooks for real-time data
 */
import { Layout, Space, Spin, Tabs } from 'antd';
import { memo, useMemo } from 'react';
import { 
  DashboardOutlined, 
  LineChartOutlined, 
  CheckCircleOutlined,
  FundOutlined,
  BarChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { PageHeader } from '../../../components/PageHeader';
import type { DeviceWithReadings } from '../../../schemas';
import { 
  useDevices,
  useAlerts,
  useSystemHealth
} from '../../../hooks';
import { useAnalyticsProcessing, useAnalyticsStats } from './hooks';
import {
  KeyMetrics,
  WaterQualityStandards,
  ActiveAlerts,
  DeviceStatusOverview,
  WaterQualityMetrics,
  TimeSeriesCharts,
  WaterQualityAssessment,
  HistoricalTrends,
  ComplianceTracker,
  DevicePerformance,
} from './components';

const { Content } = Layout;

export const AdminAnalytics = memo(() => {
  // ✅ GLOBAL READ HOOKS - Real-time data from service layer
  const {
    devices,
    isLoading: devicesLoading,
  } = useDevices({ pollInterval: 15000 });

  const {
    alerts,
    isLoading: alertsLoading,
  } = useAlerts({ pollInterval: 5000 });

  const {
    health: systemHealthData,
    isLoading: healthLoading,
  } = useSystemHealth({ pollInterval: 30000 });

  // Enrich devices with required properties for analytics
  const enrichedDevices = useMemo<DeviceWithReadings[]>(() => {
    return devices.map(device => {
      // Extract latestReading from device (populated by server aggregation)
      // Server returns devices with latestReading via MongoDB lookup
      const latestReading = (device as any).latestReading || null;
      const activeDeviceAlerts = alerts.filter(a => a.deviceId === device.deviceId && a.status === 'Active');
      
      // Calculate severity based on alerts and reading values
      let severityScore = 0;
      let severityLevel: 'critical' | 'warning' | 'normal' | 'offline' = 'normal';
      
      if (device.status === 'offline') {
        severityLevel = 'offline';
        severityScore = 50;
      } else if (activeDeviceAlerts.some(a => a.severity === 'Critical')) {
        severityLevel = 'critical';
        severityScore = 100;
      } else if (activeDeviceAlerts.some(a => a.severity === 'Warning')) {
        severityLevel = 'warning';
        severityScore = 75;
      } else if (activeDeviceAlerts.length > 0) {
        severityLevel = 'warning';
        severityScore = 60;
      }
      
      return {
        ...device,
        latestReading,
        activeAlerts: activeDeviceAlerts,
        severityScore,
        severityLevel,
      };
    });
  }, [devices, alerts]);

  // ✅ LOCAL HOOK - Calculate analytics statistics (UI logic only)
  const { 
    deviceStats, 
    alertStats,
    waterQualityMetrics,
    systemHealth,
    complianceStatus,
    devicePerformance,
    aggregatedMetrics,
  } = useAnalyticsStats(enrichedDevices, alerts, systemHealthData);

  // ✅ LOCAL HOOK - Process data for charts (UI logic only)
  const { 
    timeSeriesData, 
    parameterComparisonData 
  } = useAnalyticsProcessing(enrichedDevices);

  // Combined loading state
  const loading = devicesLoading || alertsLoading || healthLoading;

  // Initial loading state
  if (loading && enrichedDevices.length === 0) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </AdminLayout>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DashboardOutlined />
          Overview
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <KeyMetrics 
            systemHealth={systemHealth}
            deviceStats={deviceStats}
            alertStats={alertStats}
            waterQualityMetrics={waterQualityMetrics}
            loading={loading}
          />

          <WaterQualityStandards />

          <ActiveAlerts alerts={alerts} />

          <DeviceStatusOverview 
            devices={devices}
            deviceStats={deviceStats}
          />

          <WaterQualityMetrics 
            metrics={waterQualityMetrics}
            devices={devices}
          />

          <WaterQualityAssessment 
            metrics={waterQualityMetrics}
            devices={devices}
            alerts={alerts}
          />
        </Space>
      ),
    },
    {
      key: 'trends',
      label: (
        <span>
          <LineChartOutlined />
          Trends & History
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <TimeSeriesCharts 
            timeSeriesData={timeSeriesData}
            parameterComparisonData={parameterComparisonData}
          />

          <HistoricalTrends 
            aggregatedMetrics={aggregatedMetrics}
            loading={loading}
          />
        </Space>
      ),
    },
    {
      key: 'compliance',
      label: (
        <span>
          <CheckCircleOutlined />
          WHO Compliance
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <ComplianceTracker 
            complianceStatus={complianceStatus}
            loading={loading}
          />
        </Space>
      ),
    },
    {
      key: 'performance',
      label: (
        <span>
          <FundOutlined />
          Device Performance
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <DevicePerformance 
            devicePerformance={devicePerformance}
            loading={loading}
          />
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Content style={{ padding: '24px' }}>
        <PageHeader
          title="Analytics"
          icon={<BarChartOutlined />}
          description="Comprehensive water quality analytics, trends, and WHO compliance monitoring"
          breadcrumbItems={[
            { title: 'Analytics', icon: <BarChartOutlined /> }
          ]}
          actions={[
            {
              key: 'refresh',
              label: 'Refresh',
              icon: <ReloadOutlined spin={loading} />,
              onClick: () => window.location.reload(),
              disabled: loading,
            }
          ]}
        />
        
        <Tabs 
          defaultActiveKey="overview" 
          items={tabItems}
          size="large"
          type="card"
          style={{ marginTop: 24 }}
        />
      </Content>
    </AdminLayout>
  );
});
