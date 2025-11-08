import { useState, useEffect } from 'react';
import { Space, Spin, message } from 'antd';
import { AdminLayout } from '../../../components/layouts';
import { useCall_Reports } from '../../../hooks';
import { useAnalyticsProcessing } from './hooks';
import type { 
  WaterQualityReportData, 
  DeviceStatusSummary 
} from '../../../schemas';
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

export const AdminAnalytics = () => {
  // GLOBAL WRITE HOOK - Generate reports
  const { 
    generateWaterQualityReport,
    generateDeviceStatusReport,
    isLoading: reportsLoading,
  } = useCall_Reports();

  // LOCAL STATE - Store report data
  const [waterQualityData, setWaterQualityData] = useState<WaterQualityReportData | null>(null);
  const [deviceStatusData, setDeviceStatusData] = useState<DeviceStatusSummary | null>(null);

  // LOCAL HOOK - Process data for charts (UI logic only)
  const { 
    timeSeriesData, 
    parameterDistribution, 
    parameterComparisonData 
  } = useAnalyticsProcessing(waterQualityData);

  // Fetch reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [wqReport, dsReport] = await Promise.all([
          generateWaterQualityReport(),
          generateDeviceStatusReport()
        ]);
        setWaterQualityData(wqReport);
        setDeviceStatusData(dsReport.summary);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        message.error('Failed to load analytics data');
      }
    };
    fetchReports();
  }, [generateWaterQualityReport, generateDeviceStatusReport]);

  const loading = reportsLoading;

  if (loading && !waterQualityData) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading analytics data..." />
        </div>
      </AdminLayout>
    );
  }

  const metrics = waterQualityData?.devices?.[0]?.metrics;
  const alerts = waterQualityData?.devices?.[0]?.alerts || [];

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
