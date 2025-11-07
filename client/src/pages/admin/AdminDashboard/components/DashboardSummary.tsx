import { Space } from 'antd';
import { memo, useMemo } from 'react';
import { SystemHealthCard } from './SystemHealthCard';
import { AlertStatusCard } from './AlertStatusCard';
import { MqttBridgeStatusCard } from './MqttBridgeStatusCard';
import { DeviceStatusCard } from './DeviceStatusCard';
import { Row, Col } from 'antd';

interface DashboardSummaryProps {
  deviceStats: {
    total: number;
    online: number;
    offline: number;
    withReadings: number;
  };
  alertStats: {
    total: number;
    active: number;
    critical: number;
    warning: number;
    advisory: number;
  };
  mqttHealth: {
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    metrics?: {
      received: number;
      published: number;
      failed: number;
    };
  } | null;
  mqttMemory?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  } | null;
  loading: boolean;
}

export const DashboardSummary = memo<DashboardSummaryProps>(({ 
  deviceStats, 
  alertStats, 
  mqttHealth,
  mqttMemory,
  loading 
}) => {
  // DEFENSIVE: Validate input data before calculations
  // Prevent 0% flashes when data is temporarily null/undefined
  const safeDeviceStats = useMemo(() => ({
    total: deviceStats?.total ?? 0,
    online: deviceStats?.online ?? 0,
    offline: deviceStats?.offline ?? 0,
    withReadings: deviceStats?.withReadings ?? 0,
  }), [deviceStats]);

  const safeAlertStats = useMemo(() => ({
    total: alertStats?.total ?? 0,
    active: alertStats?.active ?? 0,
    critical: alertStats?.critical ?? 0,
    warning: alertStats?.warning ?? 0,
    advisory: alertStats?.advisory ?? 0,
  }), [alertStats]);

  // Calculate RAM usage from MQTT Bridge memory data
  const ramUsage = useMemo(() => {
    if (!mqttMemory) return null;
    
    const RAM_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB limit for Cloud Run
    const used = mqttMemory.rss;
    const total = RAM_LIMIT_BYTES;
    const percent = Math.min(Math.round((used / total) * 100), 100);
    
    return { used, total, percent };
  }, [mqttMemory]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Overall System Health - Now with RAM data */}
      <SystemHealthCard
        deviceStats={safeDeviceStats}
        alertStats={safeAlertStats}
        mqttHealth={mqttHealth}
        ramUsage={ramUsage}
        loading={loading}
      />

      {/* Detailed Stats Grid */}
      <Row gutter={[16, 16]}>
        {/* Device Statistics - Using new DeviceStatusCard */}
        <Col xs={24} md={8}>
          <DeviceStatusCard
            deviceStats={safeDeviceStats}
            loading={loading}
          />
        </Col>

        {/* Alert Statistics - Using new AlertStatusCard */}
        <Col xs={24} md={8}>
          <AlertStatusCard
            alertStats={safeAlertStats}
            loading={loading}
          />
        </Col>

        {/* MQTT Bridge Statistics - Using new MqttBridgeStatusCard */}
        <Col xs={24} md={8}>
          <MqttBridgeStatusCard
            mqttHealth={mqttHealth}
            loading={loading}
          />
        </Col>
      </Row>
    </Space>
  );
});

DashboardSummary.displayName = 'DashboardSummary';
