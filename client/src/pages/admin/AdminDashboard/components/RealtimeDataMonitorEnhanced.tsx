import { Card, Row, Col, Space, Typography, Badge, Statistic, Progress, Tooltip } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { memo, useState, useEffect, useRef } from 'react';
import { ThroughputGraphCard } from './ActivityGraph';
import type { MqttBridgeHealth } from '../hooks';

const { Text, Title } = Typography;

interface RealtimeDataMonitorEnhancedProps {
  health: MqttBridgeHealth | null;
  loading: boolean;
}

interface MetricSnapshot {
  received: number;
  published: number;
  failed: number;
  timestamp: number;
}

const MAX_HISTORY = 60; // Keep 60 data points (1 minute of history at 1s intervals)

export const RealtimeDataMonitorEnhanced = memo<RealtimeDataMonitorEnhancedProps>(({ health, loading }) => {
  const [receivedHistory, setReceivedHistory] = useState<number[]>([]);
  const [publishedHistory, setPublishedHistory] = useState<number[]>([]);
  const [receivedRate, setReceivedRate] = useState(0);
  const [publishedRate, setPublishedRate] = useState(0);
  const [successRate, setSuccessRate] = useState(100);
  const [isActive, setIsActive] = useState(false);
  
  const previousSnapshotRef = useRef<MetricSnapshot | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!health?.metrics) return;

    const currentSnapshot: MetricSnapshot = {
      received: health.metrics.received,
      published: health.metrics.published,
      failed: health.metrics.failed,
      timestamp: Date.now(),
    };

    if (previousSnapshotRef.current) {
      const timeDelta = (currentSnapshot.timestamp - previousSnapshotRef.current.timestamp) / 1000;

      if (timeDelta > 0) {
        const receivedDelta = currentSnapshot.received - previousSnapshotRef.current.received;
        const publishedDelta = currentSnapshot.published - previousSnapshotRef.current.published;

        // Calculate per-second rates
        const newReceivedRate = Math.round(receivedDelta / timeDelta);
        const newPublishedRate = Math.round(publishedDelta / timeDelta);

        setReceivedRate(newReceivedRate);
        setPublishedRate(newPublishedRate);

        // Update history (keep last MAX_HISTORY points)
        setReceivedHistory(prev => [...prev, newReceivedRate].slice(-MAX_HISTORY));
        setPublishedHistory(prev => [...prev, newPublishedRate].slice(-MAX_HISTORY));

        // Calculate success rate
        const totalAttempts = currentSnapshot.published + currentSnapshot.failed;
        const newSuccessRate = totalAttempts > 0
          ? Math.round((currentSnapshot.published / totalAttempts) * 100)
          : 100;
        setSuccessRate(newSuccessRate);

        // Detect activity
        const hasActivity = receivedDelta > 0 || publishedDelta > 0;
        if (hasActivity) {
          lastActivityRef.current = Date.now();
        }

        // Active if activity in last 3 seconds
        const active = (Date.now() - lastActivityRef.current) < 3000;
        setIsActive(active);
      }
    }

    previousSnapshotRef.current = currentSnapshot;
  }, [health?.metrics]);

  const metrics = health?.metrics;
  const connected = health?.checks?.mqtt?.connected || false;

  const successRateColor = successRate >= 98 ? '#52c41a' : successRate >= 90 ? '#faad14' : '#ff4d4f';

  return (
    <Card
      loading={loading}
      bordered={false}
      style={{
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
      }}
      title={
        <Space size={12}>
          <DashboardOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            Real-time MQTT Traffic Monitor
          </Title>
          <Badge 
            status={isActive ? 'processing' : 'default'} 
            text={isActive ? 'Live Traffic' : 'Idle'} 
          />
        </Space>
      }
      extra={
        <Space>
          <Tooltip title={connected ? 'MQTT Connected' : 'MQTT Disconnected'}>
            {connected ? (
              <CheckCircleOutlined style={{ fontSize: '18px', color: '#52c41a' }} />
            ) : (
              <CloseCircleOutlined style={{ fontSize: '18px', color: '#ff4d4f' }} />
            )}
          </Tooltip>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {connected ? 'Connected' : 'Disconnected'}
          </Text>
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Throughput Graphs */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <ThroughputGraphCard
              title="Incoming Messages"
              dataPoints={receivedHistory}
              currentValue={receivedRate}
              total={metrics?.received || 0}
              color="#52c41a"
              icon={<ArrowDownOutlined />}
              active={isActive && receivedRate > 0}
            />
          </Col>
          <Col xs={24} md={12}>
            <ThroughputGraphCard
              title="Outgoing Messages"
              dataPoints={publishedHistory}
              currentValue={publishedRate}
              total={metrics?.published || 0}
              color="#1890ff"
              icon={<ArrowUpOutlined />}
              active={isActive && publishedRate > 0}
            />
          </Col>
        </Row>

        {/* Stats Summary */}
        <Card 
          bordered={false}
          size="small"
          style={{ 
            backgroundColor: '#fafafa',
            borderRadius: '8px'
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={12} sm={6}>
              <Statistic
                title="Success Rate"
                value={successRate}
                suffix="%"
                valueStyle={{ 
                  color: successRateColor,
                  fontSize: '24px'
                }}
                prefix={
                  <Progress
                    type="circle"
                    percent={successRate}
                    strokeColor={successRateColor}
                    width={50}
                    format={() => null}
                  />
                }
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Failed Messages"
                value={metrics?.failed || 0}
                valueStyle={{ 
                  color: (metrics?.failed || 0) > 0 ? '#ff4d4f' : '#52c41a',
                  fontSize: '24px'
                }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Buffer Flushes"
                value={metrics?.flushes || 0}
                valueStyle={{ 
                  color: '#722ed1',
                  fontSize: '24px'
                }}
                prefix={
                  <SyncOutlined spin={isActive} />
                }
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Circuit Breaker"
                value={metrics?.circuitBreakerOpen ? 'OPEN' : 'CLOSED'}
                valueStyle={{ 
                  color: metrics?.circuitBreakerOpen ? '#ff4d4f' : '#52c41a',
                  fontSize: '18px'
                }}
                prefix={
                  <Badge 
                    status={metrics?.circuitBreakerOpen ? 'error' : 'success'} 
                  />
                }
              />
            </Col>
          </Row>
        </Card>

        {/* Live Activity Indicator */}
        {isActive && (
          <div style={{ 
            textAlign: 'center',
            padding: '8px',
            backgroundColor: '#f6ffed',
            borderRadius: '6px',
            border: '1px solid #b7eb8f'
          }}>
            <Space>
              <ThunderboltOutlined style={{ color: '#52c41a' }} />
              <Text style={{ color: '#52c41a', fontWeight: 500 }}>
                Active data flow detected • {receivedRate} msg/s incoming • {publishedRate} msg/s outgoing
              </Text>
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
});

RealtimeDataMonitorEnhanced.displayName = 'RealtimeDataMonitorEnhanced';
