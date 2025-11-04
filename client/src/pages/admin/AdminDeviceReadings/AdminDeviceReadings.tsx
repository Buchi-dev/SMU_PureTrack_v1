import { Card, Space } from 'antd';
import { AdminLayout } from '../../../components/layouts';
import { useDeviceReadings, useSensorExport } from './hooks';
import {
  PageHeader,
  DeviceSelector,
  DeviceStatusAlert,
  LoadingState,
  EmptyState,
  CurrentReadingsCard,
  SensorChartsGrid,
} from './components';

// Sensor thresholds for water quality monitoring
const THRESHOLDS = {
  turbidity: { min: 0, max: 5, unit: 'NTU', label: 'Turbidity' },
  tds: { min: 0, max: 500, unit: 'ppm', label: 'TDS' },
  ph: { min: 6.5, max: 8.5, unit: '', label: 'pH Level' },
};

export const AdminDeviceReadings = () => {
  const {
    devices,
    selectedDeviceId,
    selectedDevice,
    latestReading,
    sensorHistory,
    loading,
    lastUpdated,
    setSelectedDeviceId,
  } = useDeviceReadings();

  const { exportToCSV } = useSensorExport();

  const handleExport = () => {
    exportToCSV(sensorHistory, selectedDeviceId);
  };

  return (
    <AdminLayout>
      <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
        {/* Page Header */}
        <PageHeader
          lastUpdated={lastUpdated}
          hasData={sensorHistory.length > 0}
          onExport={handleExport}
        />

        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
          {/* Device Selection */}
          <Card>
            <DeviceSelector
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              loading={loading}
              onChange={setSelectedDeviceId}
            />
          </Card>

          {/* Device Status Alert */}
          <DeviceStatusAlert device={selectedDevice} />

          {/* Main Content */}
          {!selectedDeviceId ? (
            <EmptyState />
          ) : loading && !latestReading ? (
            <LoadingState />
          ) : (
            <>
              {/* Current Readings */}
              <CurrentReadingsCard
                latestReading={latestReading}
                thresholds={THRESHOLDS}
              />

              {/* Historical Charts */}
              <SensorChartsGrid
                sensorHistory={sensorHistory}
                thresholds={THRESHOLDS}
              />
            </>
          )}
        </Space>
      </div>
    </AdminLayout>
  );
};
