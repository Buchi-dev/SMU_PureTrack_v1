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
import * as React from 'react';
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
  useHealth,
  useAnalyticsSummary
} from '../../../hooks';
import { useAnalyticsProcessing, useAnalyticsStats } from './hooks';
import { ALERT_STATUS } from '../../../constants';
import {
  KeyMetrics,
  WaterQualityStandards,
  ActiveAlerts,
  WaterQualityMetrics,
  TimeSeriesCharts,
  WaterQualityAssessment,
  HistoricalTrends,
  ComplianceTracker,
  DevicePerformance,
} from './components';

const { Content } = Layout;

export const AdminAnalytics = memo(() => {
  // ✅ GLOBAL READ HOOKS - Real-time data via WebSocket
  const {
    devices,
    isLoading: devicesLoading,
    refetch: refetchDevices,
  } = useDevices(); // 🔥 NO POLLING - WebSocket provides real-time device updates

  const {
    alerts,
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = useAlerts(); // 🔥 NO POLLING - WebSocket broadcasts alert:new/resolved

  const {
    health: systemHealthData,
    isLoading: healthLoading,
  } = useHealth(); // 🔥 NO POLLING - WebSocket broadcasts system:health every 10s

  const {
    summary: analyticsSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useAnalyticsSummary(); // 🔥 NO POLLING - WebSocket broadcasts analytics:update every 45s

  // Enrich devices with required properties for analytics
  const enrichedDevices = useMemo<DeviceWithReadings[]>(() => {
    return devices.map(device => {
      // Extract latestReading from device (populated by server aggregation)
      // Server returns devices with latestReading via MongoDB lookup
      const latestReading = (device as any).latestReading || null;
      const activeDeviceAlerts = alerts.filter(a => a.deviceId === device.deviceId && a.status === ALERT_STATUS.UNACKNOWLEDGED);
      
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

  // Override totalReadings with the accurate count from server
  const waterQualityMetricsWithTotal = useMemo(() => ({
    ...waterQualityMetrics,
    totalReadings: analyticsSummary?.readings?.total ?? waterQualityMetrics.totalReadings,
  }), [waterQualityMetrics, analyticsSummary]);

  // ✅ LOCAL HOOK - Process data for charts (UI logic only)
  const { 
    timeSeriesData, 
    parameterComparisonData 
  } = useAnalyticsProcessing(enrichedDevices);

  // Combined loading state
  const loading = devicesLoading || alertsLoading || healthLoading || summaryLoading;

  // Refresh handler with loading state
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent spam clicks
    
    setIsRefreshing(true);
    try {
      await Promise.all([refetchDevices(), refetchAlerts(), refetchSummary()]);
      setTimeout(() => setIsRefreshing(false), 500);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
    }
  };

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
            waterQualityMetrics={waterQualityMetricsWithTotal}
            loading={loading}
          />

          <WaterQualityStandards />

          <ActiveAlerts alerts={alerts} />

          <WaterQualityMetrics 
            metrics={waterQualityMetricsWithTotal}
            devices={devices}
          />

          <WaterQualityAssessment 
            metrics={waterQualityMetricsWithTotal}
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
              icon: <ReloadOutlined spin={isRefreshing} />,
              onClick: handleRefresh,
              disabled: isRefreshing,
              loading: isRefreshing,
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
