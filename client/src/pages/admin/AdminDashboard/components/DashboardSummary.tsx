import { Space, Card, Progress, Typography } from 'antd';
import { 
  DatabaseOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  HddOutlined,
  DashboardOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { MetricIndicator } from './MetricIndicator';
import { LiveMetricIndicator } from './LiveMetricIndicator';
import { QuickAlertWidget } from './QuickAlertWidget';
import { Row, Col } from 'antd';
import type { MqttBridgeHealth } from '../hooks';
import {
  calculateMqttBridgeHealthScore,
  calculateRAMHealthScore,
  calculateAlertHealthScore,
  calculateOverallSystemHealth,
  getOverallHealth,
} from '../config';

const { Text, Title } = Typography;

const MAX_HISTORY = 30; // Keep 30 data points for mini graphs

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
  mqttFullHealth?: MqttBridgeHealth | null; // Full health object for RealtimeDataMonitor
  loading: boolean;
}

export const DashboardSummary = memo<DashboardSummaryProps>(({ 
  deviceStats, 
  alertStats, 
  mqttHealth,
  mqttMemory,
  mqttFullHealth,
  loading 
}) => {
  // Real-time metrics state for live indicators
  const [receivedHistory, setReceivedHistory] = useState<number[]>([]);
  const [publishedHistory, setPublishedHistory] = useState<number[]>([]);
  const [receivedRate, setReceivedRate] = useState(0);
  const [publishedRate, setPublishedRate] = useState(0);
  const previousMetricsRef = useRef<{ received: number; published: number; timestamp: number } | null>(null);

  // Calculate real-time throughput for live indicators
  useEffect(() => {
    if (!mqttFullHealth?.metrics) return;

    const currentMetrics = {
      received: mqttFullHealth.metrics.received,
      published: mqttFullHealth.metrics.published,
      timestamp: Date.now(),
    };

    if (previousMetricsRef.current) {
      const timeDelta = (currentMetrics.timestamp - previousMetricsRef.current.timestamp) / 1000;

      if (timeDelta > 0) {
        const receivedDelta = currentMetrics.received - previousMetricsRef.current.received;
        const publishedDelta = currentMetrics.published - previousMetricsRef.current.published;

        const newReceivedRate = Math.round(receivedDelta / timeDelta);
        const newPublishedRate = Math.round(publishedDelta / timeDelta);

        setReceivedRate(newReceivedRate);
        setPublishedRate(newPublishedRate);

        setReceivedHistory(prev => [...prev, newReceivedRate].slice(-MAX_HISTORY));
        setPublishedHistory(prev => [...prev, newPublishedRate].slice(-MAX_HISTORY));
      }
    }

    previousMetricsRef.current = currentMetrics;
  }, [mqttFullHealth?.metrics]);

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

  // Calculate component health scores for indicators
  const deviceHealth = useMemo(() => {
    if (safeDeviceStats.total === 0) return 100;
    return Math.round((safeDeviceStats.online / safeDeviceStats.total) * 100);
  }, [safeDeviceStats]);

  const alertHealth = useMemo(() => 
    calculateAlertHealthScore(
      safeAlertStats.total,
      safeAlertStats.active,
      safeAlertStats.critical
    ),
    [safeAlertStats]
  );

  // Calculate MQTT Bridge memory-based health score using centralized function
  const mqttMemoryScore = useMemo(() => {
    if (!mqttMemory || !mqttHealth) return 0;
    
    return calculateMqttBridgeHealthScore(
      mqttMemory.heapUsed,
      mqttMemory.heapTotal,
      mqttMemory.rss,
      mqttHealth.connected,
      mqttHealth.status
    );
  }, [mqttHealth, mqttMemory]);

  const ramHealthScore = useMemo(() => {
    if (!ramUsage) return 100;
    return calculateRAMHealthScore(ramUsage.used, ramUsage.total);
  }, [ramUsage]);

  // Overall health calculation using centralized function
  const overallHealthScore = useMemo(() => 
    calculateOverallSystemHealth(
      deviceHealth,
      alertHealth,
      mqttMemoryScore,
      ramHealthScore
    ),
    [deviceHealth, alertHealth, mqttMemoryScore, ramHealthScore]
  );

  // Get health status data using centralized function
  const overallHealthData = useMemo(() => 
    getOverallHealth(overallHealthScore),
    [overallHealthScore]
  );

  const formatBytes = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Main Metrics Layout: 4 Left | Overall Health Center | 3 Right */}
      <Row gutter={[16, 16]} align="stretch">
        {/* LEFT SIDE - 4 Metrics Stacked */}
        <Col xs={24} lg={7}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            height: '100%' 
          }}>
            {/* Quick Alerts Widget */}
            <div style={{ flex: '0 0 auto' }}>
              <QuickAlertWidget
                criticalCount={safeAlertStats.critical}
                offlineDevices={safeDeviceStats.offline}
                loading={loading}
              />
            </div>
            
            {/* Device Status */}
            <div style={{ flex: 1 }}>
              <MetricIndicator
                title="Device Status"
                percent={deviceHealth}
                icon={<DatabaseOutlined />}
                subtitle={`${safeDeviceStats.online} online · ${safeDeviceStats.offline} offline`}
                tooltip={`${safeDeviceStats.online} of ${safeDeviceStats.total} devices online\n${safeDeviceStats.withReadings} devices with recent readings`}
                loading={loading}
              />
            </div>
            
            {/* Alert Status */}
            <div style={{ flex: 1 }}>
              <MetricIndicator
                title="Alert Status"
                percent={alertHealth}
                icon={<ThunderboltOutlined />}
                subtitle={`${safeAlertStats.active} active · ${safeAlertStats.critical} critical`}
                tooltip={`${safeAlertStats.active} active alerts (${safeAlertStats.critical} critical)\n${safeAlertStats.warning} warnings · ${safeAlertStats.advisory} advisories`}
                loading={loading}
              />
            </div>
            
            {/* MQTT Bridge Health */}
            <div style={{ flex: 1 }}>
              <MetricIndicator
                title="MQTT Bridge Health"
                percent={mqttMemoryScore}
                icon={<CloudServerOutlined />}
                subtitle={
                  mqttMemory 
                    ? `${formatBytes(mqttMemory.heapUsed)}/${formatBytes(mqttMemory.heapTotal)}MB heap`
                    : mqttHealth?.connected ? 'Connected' : 'Disconnected'
                }
                tooltip={
                  mqttMemory && mqttHealth
                    ? `Status: ${mqttHealth.status} (${mqttHealth.connected ? 'connected' : 'disconnected'})\nHeap: ${formatBytes(mqttMemory.heapUsed)}MB / ${formatBytes(mqttMemory.heapTotal)}MB\nRSS: ${formatBytes(mqttMemory.rss)}MB / 256MB\nHealth Score: ${mqttMemoryScore}% (based on memory efficiency)`
                    : `MQTT Bridge: ${mqttHealth?.status || 'unknown'} - ${mqttHealth?.connected ? 'connected' : 'disconnected'}`
                }
                loading={loading}
              />
            </div>
          </div>
        </Col>

        {/* CENTER - Overall System Health (Larger) */}
        <Col xs={24} lg={10}>
          <Card 
            loading={loading}
            bordered={false}
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              height: '100%',
              minHeight: '480px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${overallHealthData.color}15 0%, ${overallHealthData.color}05 100%)`
            }}
            bodyStyle={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '32px',
              textAlign: 'center'
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Header */}
              <div>
                <DashboardOutlined style={{ fontSize: '48px', color: overallHealthData.color }} />
                <Title level={3} style={{ margin: '12px 0 4px 0' }}>Overall System Health</Title>
                <Text type="secondary" style={{ fontSize: '14px' }}>Real-time monitoring across all systems</Text>
              </div>

              {/* Large Health Gauge */}
              <div style={{ margin: '16px 0' }}>
                <Progress
                  type="dashboard"
                  percent={overallHealthScore}
                  strokeColor={overallHealthData.color}
                  strokeWidth={10}
                  format={(percent) => (
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: '56px', color: overallHealthData.color, lineHeight: 1 }}>
                        {percent}%
                      </Text>
                      <Text type="secondary" style={{ fontSize: '18px', fontWeight: 500, marginTop: '8px' }}>
                        {overallHealthData.statusText}
                      </Text>
                    </Space>
                  )}
                  size={220}
                />
              </div>
            </Space>
          </Card>
        </Col>

        {/* RIGHT SIDE - 3 Metrics Stacked */}
        <Col xs={24} lg={7}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            height: '100%' 
          }}>
            {/* Incoming Messages - Live Monitor */}
            <div style={{ flex: 1 }}>
              <LiveMetricIndicator
                title="Incoming Messages"
                currentValue={receivedRate}
                totalValue={mqttFullHealth?.metrics?.received || 0}
                icon={<ArrowDownOutlined />}
                color="#52c41a"
                dataHistory={receivedHistory}
                tooltip={`Real-time incoming message rate\nTotal received: ${mqttFullHealth?.metrics?.received?.toLocaleString() || 0}`}
                loading={loading}
              />
            </div>
            
            {/* Outgoing Messages - Live Monitor */}
            <div style={{ flex: 1 }}>
              <LiveMetricIndicator
                title="Outgoing Messages"
                currentValue={publishedRate}
                totalValue={mqttFullHealth?.metrics?.published || 0}
                icon={<ArrowUpOutlined />}
                color="#1890ff"
                dataHistory={publishedHistory}
                tooltip={`Real-time outgoing message rate\nTotal published: ${mqttFullHealth?.metrics?.published?.toLocaleString() || 0}`}
                loading={loading}
              />
            </div>
            
            {/* RAM Usage */}
            <div style={{ flex: 1 }}>
              <MetricIndicator
                title="RAM Usage"
                percent={ramUsage?.percent || 0}
                icon={<HddOutlined />}
                subtitle={
                  ramUsage 
                    ? `${formatBytes(ramUsage.used)}MB / ${formatBytes(ramUsage.total)}MB used`
                    : 'No data'
                }
                tooltip={
                  ramUsage 
                    ? `RAM: ${formatBytes(ramUsage.used)}MB / ${formatBytes(ramUsage.total)}MB (${ramUsage.percent}%)\n${formatBytes(ramUsage.total - ramUsage.used)}MB available`
                    : 'RAM usage data not available'
                }
                loading={loading}
                inverse={true}
              />
            </div>
          </div>
        </Col>
      </Row>
    </Space>
  );
});

DashboardSummary.displayName = 'DashboardSummary';
