import { Space, Spin } from 'antd';
import { AdminLayout } from '../../../components/layouts';
import {
  AnalyticsHeader,
  KeyMetrics,
  WaterQualityStandards,
  ActiveAlerts,
  DeviceStatusOverview,
  WaterQualityMetrics,
  TimeSeriesCharts,
  WaterQualityAssessment,
} from './components';
import { useAnalyticsData } from './hooks';

export const AdminAnalytics = () => {
  const {
    loading,
    waterQualityData,
    deviceStatusData,
    timeSeriesData,
    parameterDistribution,
    alerts,
  } = useAnalyticsData();

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading analytics data..." />
        </div>
      </AdminLayout>
    );
  }

  const metrics = waterQualityData?.devices?.[0]?.metrics;

  const parameterComparisonData = metrics ? [
    {
      parameter: 'pH',
      Average: metrics.avgPH,
      Maximum: metrics.maxPH,
      Minimum: metrics.minPH,
    },
    {
      parameter: 'TDS',
      Average: metrics.avgTDS / 10,
      Maximum: metrics.maxTDS / 10,
      Minimum: metrics.minTDS / 10,
    },
    {
      parameter: 'Turbidity',
      Average: metrics.avgTurbidity,
      Maximum: metrics.maxTurbidity,
      Minimum: metrics.minTurbidity,
    },
  ] : [];

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <AnalyticsHeader />
        
        <KeyMetrics 
          deviceStatusData={deviceStatusData}
          totalReadings={metrics?.totalReadings || 0}
          alerts={alerts}
        />

        <WaterQualityStandards />

        <ActiveAlerts alerts={alerts} />

        <DeviceStatusOverview deviceStatusData={deviceStatusData} />

        <WaterQualityMetrics metrics={metrics} />

        <TimeSeriesCharts 
          timeSeriesData={timeSeriesData}
          parameterComparisonData={parameterComparisonData}
          parameterDistribution={parameterDistribution}
        />

        <WaterQualityAssessment 
          metrics={metrics}
          waterQualityData={waterQualityData}
        />
      </Space>
    </AdminLayout>
  );
};
