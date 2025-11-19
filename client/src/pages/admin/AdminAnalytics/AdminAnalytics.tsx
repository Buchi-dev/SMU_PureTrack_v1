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
import { Space, Spin, Tabs } from 'antd';
import { memo } from 'react';
import { 
  DashboardOutlined, 
  LineChartOutlined, 
  CheckCircleOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { 
  useRealtime_Devices, 
  useRealtime_Alerts,
  useRealtime_MQTTMetrics 
} from '../../../hooks';
import { useAnalyticsProcessing, useAnalyticsStats } from './hooks';
import {
  AnalyticsHeader,
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

export const AdminAnalytics = memo(() => {
  // ✅ GLOBAL READ HOOKS - Real-time data from service layer
  const {
    devices,
    isLoading: devicesLoading,
  } = useRealtime_Devices({ includeMetadata: true });

  const {
    alerts,
    isLoading: alertsLoading,
  } = useRealtime_Alerts({ maxAlerts: 100 });

  const {
    health: mqttHealth,
    status: mqttStatus,
    isLoading: mqttLoading,
  } = useRealtime_MQTTMetrics({ pollInterval: 3000 });

  // ✅ LOCAL HOOK - Calculate analytics statistics (UI logic only)
  const { 
    deviceStats, 
    alertStats,
    waterQualityMetrics,
    systemHealth,
    complianceStatus,
    devicePerformance,
    aggregatedMetrics,
  } = useAnalyticsStats(devices, alerts, mqttHealth, mqttStatus);

  // ✅ LOCAL HOOK - Process data for charts (UI logic only)
  const { 
    timeSeriesData, 
    parameterDistribution, 
    parameterComparisonData 
  } = useAnalyticsProcessing(devices);

  // Combined loading state
  const loading = devicesLoading || alertsLoading || mqttLoading;

  // Initial loading state
  if (loading && devices.length === 0) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading analytics data..." />
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
            parameterDistribution={parameterDistribution}
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
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <AnalyticsHeader />
        
        <Tabs 
          defaultActiveKey="overview" 
          items={tabItems}
          size="large"
          type="card"
        />
      </Space>
    </AdminLayout>
  );
});
