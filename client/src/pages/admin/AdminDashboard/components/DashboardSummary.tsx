import { Space, Card, Progress, Typography } from 'antd';
import { 
  CloudServerOutlined,
  DashboardOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { LiveMetricIndicator } from './LiveMetricIndicator';
import { RecentAlertsList } from './RecentAlertsList';
import { Row, Col } from 'antd';
import type { MqttBridgeHealth } from '../../../../services/mqtt.service';
import type { WaterQualityAlert } from '../../../../schemas';
import {
  calculateMqttBridgeHealthScore,
  HEALTH_COLORS,
} from '../config';
import { calculateSystemHealth, getSystemHealthColor, getSystemHealthDescription } from '../utils';

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
  alerts: WaterQualityAlert[]; // Add alerts array for RecentAlertsList
  mqttHealth: {
    status: 'healthy' | 'unhealthy' | 'degraded';
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
  alerts,
  mqttHealth,
  mqttMemory,
  mqttFullHealth,
  loading 
}) => {
  // Real-time metrics state for live indicators
  const [receivedHistory, setReceivedHistory] = useState<number[]>([]);
  const [publishedHistory, setPublishedHistory] = useState<number[]>([]);
  const [healthHistory, setHealthHistory] = useState<number[]>([]);
  const [receivedRate, setReceivedRate] = useState(0);
  const [publishedRate, setPublishedRate] = useState(0);
  const previousMetricsRef = useRef<{ received: number; published: number; timestamp: number } | null>(null);

  // Calculate real-time throughput for live indicators
  useEffect(() => {
    console.log('[DashboardSummary] mqttFullHealth received:', {
      exists: !!mqttFullHealth,
      hasMetrics: !!mqttFullHealth?.metrics,
      metrics: mqttFullHealth?.metrics,
      status: mqttFullHealth?.status,
      connected: mqttFullHealth?.checks?.mqtt?.connected
    });

    if (!mqttFullHealth?.metrics) {
      console.warn('[DashboardSummary] No metrics available - skipping rate calculation');
      return;
    }

    const currentMetrics = {
      received: mqttFullHealth.metrics.received,
      published: mqttFullHealth.metrics.published,
      timestamp: Date.now(),
    };

    console.log('[DashboardSummary] Current metrics:', currentMetrics);
    console.log('[DashboardSummary] Previous metrics:', previousMetricsRef.current);

    if (previousMetricsRef.current) {
      const timeDelta = (currentMetrics.timestamp - previousMetricsRef.current.timestamp) / 1000;

      if (timeDelta > 0) {
        const receivedDelta = currentMetrics.received - previousMetricsRef.current.received;
        const publishedDelta = currentMetrics.published - previousMetricsRef.current.published;

        const newReceivedRate = Math.round(receivedDelta / timeDelta);
        const newPublishedRate = Math.round(publishedDelta / timeDelta);

        console.log('[DashboardSummary] Calculated rates:', {
          timeDelta,
          receivedDelta,
          publishedDelta,
          newReceivedRate,
          newPublishedRate
        });

        setReceivedRate(newReceivedRate);
        setPublishedRate(newPublishedRate);

        setReceivedHistory(prev => [...prev, newReceivedRate].slice(-MAX_HISTORY));
        setPublishedHistory(prev => [...prev, newPublishedRate].slice(-MAX_HISTORY));
      }
    }

    previousMetricsRef.current = currentMetrics;
  }, [mqttFullHealth?.metrics]);

  // Calculate MQTT Bridge health score using RSS and CPU (not heap)
  const mqttMemoryScore = useMemo(() => {
    if (!mqttMemory || !mqttHealth || !mqttFullHealth?.checks?.cpu) return 0;
    
    return calculateMqttBridgeHealthScore(
      mqttMemory.rss, // Use RSS instead of heap
      mqttFullHealth.checks.cpu.current, // Include CPU usage
      mqttHealth.connected,
      mqttHealth.status
    );
  }, [mqttHealth, mqttMemory, mqttFullHealth]);

  // Track MQTT health history for sparkline
  useEffect(() => {
    if (mqttMemoryScore > 0) {
      setHealthHistory(prev => [...prev, mqttMemoryScore].slice(-MAX_HISTORY));
    }
  }, [mqttMemoryScore]);

  // Calculate overall system health using the new dynamic calculator
  const systemHealth = useMemo(() => {
    return calculateSystemHealth(
      mqttMemoryScore,        // MQTT Bridge score (0-100) - 60% weight
      deviceStats.online,     // Online devices
      deviceStats.total,      // Total devices - 20% weight
      alerts                  // All alerts array - 20% weight
    );
  }, [mqttMemoryScore, deviceStats.online, deviceStats.total, alerts]);

  const formatBytes = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Main Metrics Layout: 1 Left | Overall Health Center | 3 Right */}
      <Row gutter={[16, 16]} align="stretch">
        {/* LEFT SIDE - Recent Alerts Only */}
        <Col xs={24} lg={7}>
          <div style={{ height: '100%' }}>
            {/* Recent Alerts List - Full Height */}
            <RecentAlertsList
              alerts={alerts}
              loading={loading}
              maxItems={10}
            />
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
              background: `linear-gradient(135deg, ${getSystemHealthColor(systemHealth.status)}15 0%, ${getSystemHealthColor(systemHealth.status)}05 100%)`
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
                <DashboardOutlined style={{ fontSize: '48px', color: getSystemHealthColor(systemHealth.status) }} />
                <Title level={3} style={{ margin: '12px 0 4px 0' }}>Overall System Health</Title>
                <Text type="secondary" style={{ fontSize: '14px' }}>{getSystemHealthDescription(systemHealth.status)}</Text>
              </div>

              {/* Large Health Gauge */}
              <div style={{ margin: '16px 0' }}>
                <Progress
                  type="dashboard"
                  percent={systemHealth.overallScore}
                  strokeColor={getSystemHealthColor(systemHealth.status)}
                  strokeWidth={10}
                  format={(percent) => (
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: '56px', color: getSystemHealthColor(systemHealth.status), lineHeight: 1 }}>
                        {percent}%
                      </Text>
                      <Text type="secondary" style={{ fontSize: '18px', fontWeight: 500, marginTop: '8px' }}>
                        {systemHealth.status}
                      </Text>
                    </Space>
                  )}
                  size={220}
                />
              </div>

              {/* Component Breakdown */}
              <div style={{ textAlign: 'left', width: '100%', marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  COMPONENT BREAKDOWN
                </Text>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {/* MQTT Bridge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text style={{ fontSize: '13px' }}>MQTT Bridge</Text>
                      <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
                        ({Math.round(systemHealth.components.mqttBridge.weight * 100)}% weight)
                      </Text>
                    </div>
                    <Text strong style={{ fontSize: '14px' }}>
                      {systemHealth.components.mqttBridge.score}% → +{systemHealth.components.mqttBridge.contribution}
                    </Text>
                  </div>

                  {/* Devices */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text style={{ fontSize: '13px' }}>Devices</Text>
                      <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
                        ({systemHealth.components.devices.online}/{systemHealth.components.devices.total} online, {Math.round(systemHealth.components.devices.weight * 100)}% weight)
                      </Text>
                    </div>
                    <Text strong style={{ fontSize: '14px' }}>
                      {systemHealth.components.devices.score}% → +{systemHealth.components.devices.contribution}
                    </Text>
                  </div>

                  {/* Alerts */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text style={{ fontSize: '13px' }}>Alerts</Text>
                      <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
                        ({systemHealth.components.alerts.breakdown.totalAlerts} total, {Math.round(systemHealth.components.alerts.weight * 100)}% weight)
                      </Text>
                    </div>
                    <Text strong style={{ fontSize: '14px' }}>
                      {systemHealth.components.alerts.score}% → +{systemHealth.components.alerts.contribution}
                    </Text>
                  </div>
                </Space>
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
                color={HEALTH_COLORS.EXCELLENT}
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
                color={HEALTH_COLORS.INFO}
                dataHistory={publishedHistory}
                tooltip={`Real-time outgoing message rate\nTotal published: ${mqttFullHealth?.metrics?.published?.toLocaleString() || 0}`}
                loading={loading}
              />
            </div>
            
            {/* MQTT Bridge Health */}
            <div style={{ flex: 1 }}>
              <LiveMetricIndicator
                title="MQTT Bridge Health"
                currentValue={mqttMemoryScore}
                totalValue={100}
                icon={<CloudServerOutlined />}
                color={
                  mqttMemoryScore >= 80 ? HEALTH_COLORS.EXCELLENT :
                  mqttMemoryScore >= 60 ? HEALTH_COLORS.GOOD :
                  mqttMemoryScore >= 40 ? HEALTH_COLORS.WARNING :
                  HEALTH_COLORS.CRITICAL
                }
                unit="%"
                subtitle={
                  mqttMemory && mqttFullHealth?.checks?.cpu
                    ? `${formatBytes(mqttMemory.rss)}/256MB RAM • ${mqttFullHealth.checks.cpu.current.toFixed(1)}% CPU`
                    : mqttHealth?.connected ? 'Connected' : 'Disconnected'
                }
                dataHistory={healthHistory}
                tooltip={
                  mqttMemory && mqttHealth && mqttFullHealth?.checks?.cpu
                    ? `Status: ${mqttHealth.status} (${mqttHealth.connected ? 'connected' : 'disconnected'})\nRSS: ${formatBytes(mqttMemory.rss)}MB / 256MB (${Math.round((mqttMemory.rss / (256 * 1024 * 1024)) * 100)}%)\nCPU: ${mqttFullHealth.checks.cpu.current.toFixed(1)}% (avg: ${mqttFullHealth.checks.cpu.average.toFixed(1)}%)\nHealth Score: ${mqttMemoryScore}% (based on RSS + CPU usage)`
                    : `MQTT Bridge: ${mqttHealth?.status || 'unknown'} - ${mqttHealth?.connected ? 'connected' : 'disconnected'}`
                }
                loading={loading}
              />
            </div>
          </div>
        </Col>
      </Row>
    </Space>
  );
});

DashboardSummary.displayName = 'DashboardSummary';
