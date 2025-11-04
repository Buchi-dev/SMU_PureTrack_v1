import { AdminLayout } from '../../../components/layouts/AdminLayout';
import { Typography, Space } from 'antd';
import { useState } from 'react';
import type { WaterQualityAlertSeverity } from '../../../schemas';
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
  useFilteredAlerts,
} from './hooks';

const { Title, Text } = Typography;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdminDashboard = () => {
  // UI State
  const [alertFilter, setAlertFilter] = useState<WaterQualityAlertSeverity | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');

  // Custom Hooks
  const { alerts, loading: alertsLoading } = useAlerts();
  const { devices, loading: devicesLoading } = useDevices();
  const { historicalData } = useHistoricalData(selectedDevice);
  const stats = useDashboardStats(devices, alerts);
  const filteredAlerts = useFilteredAlerts(alerts, alertFilter, searchText);

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

        {/* ====== RECENT ALERTS ====== */}
        <RecentAlertsCard
          alerts={filteredAlerts}
          loading={loading}
          activeAlerts={stats.activeAlerts}
          criticalAlerts={stats.criticalAlerts}
          searchText={searchText}
          alertFilter={alertFilter}
          onSearchChange={setSearchText}
          onFilterChange={setAlertFilter}
        />
      </Space>
    </AdminLayout>
  );
};
