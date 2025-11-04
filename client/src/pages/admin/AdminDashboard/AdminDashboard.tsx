import { AdminLayout } from '../../../components/layouts/AdminLayout';
import { Typography, Space } from 'antd';
import {
  StatisticsCards,
  SensorReadingsCard,
  HistoricalTrendsCard,
  RecentAlertsCard,
} from './components';
import {
  useAlerts,
  useDevices,
  useHistoricalData,
  useDashboardStats,
} from './hooks';
import { useState } from 'react';

const { Title, Text } = Typography;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdminDashboard = () => {
  // UI State
  const [selectedDevice, setSelectedDevice] = useState<string>('all');

  // Custom Hooks
  const { alerts, loading: alertsLoading } = useAlerts();
  const { devices, loading: devicesLoading } = useDevices();
  const { historicalData } = useHistoricalData(selectedDevice);
  const stats = useDashboardStats(devices, alerts);

  // Combined loading state
  const loading = alertsLoading || devicesLoading;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* ====== PAGE HEADER ====== */}
        <div>
          <Title level={2}>Real-Time Dashboard</Title>
          <Text type="secondary">
            Monitor water quality sensors and alerts in real-time
          </Text>
        </div>

        {/* ====== STATISTICS CARDS ====== */}
        <StatisticsCards
          totalDevices={stats.totalDevices}
          onlineDevices={stats.onlineDevices}
          activeAlerts={stats.activeAlerts}
          criticalAlerts={stats.criticalAlerts}
        />

        {/* ====== REAL-TIME SENSOR READINGS ====== */}
        <SensorReadingsCard
          devices={devices}
          loading={loading}
          onlineDevices={stats.onlineDevices}
          onDeviceSelect={setSelectedDevice}
        />

        {/* ====== DATA VISUALIZATION (Historical Trends) ====== */}
        <HistoricalTrendsCard
          selectedDevice={selectedDevice}
          devices={devices}
          historicalData={historicalData}
          onDeviceChange={setSelectedDevice}
        />

        {/* ====== RECENT ALERTS SUMMARY ====== */}
        <RecentAlertsCard
          alerts={alerts}
          loading={loading}
          activeAlerts={stats.activeAlerts}
          criticalAlerts={stats.criticalAlerts}
        />
      </Space>
    </AdminLayout>
  );
};
