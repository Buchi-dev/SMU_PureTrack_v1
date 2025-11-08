import { Card, Row, Col, Space, Typography, Badge, Statistic, Progress, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { memo, useState, useEffect, useRef } from 'react';
import type { MqttBridgeHealth } from '../hooks';

const { Text, Title } = Typography;

interface RealtimeStatsMonitorProps {
  health: MqttBridgeHealth | null;
  loading: boolean;
}

interface MetricSnapshot {
  received: number;
  published: number;
  failed: number;
  timestamp: number;
}

export const RealtimeStatsMonitor = memo<RealtimeStatsMonitorProps>(({ health, loading }) => {
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
            MQTT Performance Metrics
          </Title>
          <Badge 
            status={isActive ? 'processing' : 'default'} 
            text={isActive ? 'Active' : 'Idle'} 
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
        {/* Stats Summary */}
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Card 
              bordered={false} 
              size="small"
              style={{ 
                backgroundColor: '#f6ffed',
                borderLeft: `4px solid ${successRateColor}`,
                textAlign: 'center'
              }}
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Success Rate
                </Text>
                <Progress
                  type="circle"
                  percent={successRate}
                  strokeColor={successRateColor}
                  strokeWidth={10}
                  format={(percent) => (
                    <Text strong style={{ fontSize: '20px', color: successRateColor }}>
                      {percent}%
                    </Text>
                  )}
                  size={80}
                />
              </Space>
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card 
              bordered={false} 
              size="small"
              style={{ 
                backgroundColor: '#fff1f0',
                borderLeft: `4px solid ${(metrics?.failed || 0) > 0 ? '#ff4d4f' : '#52c41a'}`,
              }}
            >
              <Statistic
                title="Failed Messages"
                value={metrics?.failed || 0}
                valueStyle={{ 
                  color: (metrics?.failed || 0) > 0 ? '#ff4d4f' : '#52c41a',
                  fontSize: '32px'
                }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card 
              bordered={false} 
              size="small"
              style={{ 
                backgroundColor: '#fef0ff',
                borderLeft: '4px solid #722ed1',
              }}
            >
              <Statistic
                title="Buffer Flushes"
                value={metrics?.flushes || 0}
                valueStyle={{ 
                  color: '#722ed1',
                  fontSize: '32px'
                }}
                prefix={
                  <SyncOutlined spin={isActive} />
                }
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card 
              bordered={false} 
              size="small"
              style={{ 
                backgroundColor: metrics?.circuitBreakerOpen ? '#fff1f0' : '#f6ffed',
                borderLeft: `4px solid ${metrics?.circuitBreakerOpen ? '#ff4d4f' : '#52c41a'}`,
              }}
            >
              <Statistic
                title="Circuit Breaker"
                value={metrics?.circuitBreakerOpen ? 'OPEN' : 'CLOSED'}
                valueStyle={{ 
                  color: metrics?.circuitBreakerOpen ? '#ff4d4f' : '#52c41a',
                  fontSize: '20px'
                }}
                prefix={
                  <Badge 
                    status={metrics?.circuitBreakerOpen ? 'error' : 'success'} 
                  />
                }
              />
            </Card>
          </Col>
        </Row>

        {/* Connection Status */}
        <Card 
          bordered={false}
          size="small"
          style={{ 
            backgroundColor: connected ? '#f6ffed' : '#fff1f0',
            borderLeft: `4px solid ${connected ? '#52c41a' : '#ff4d4f'}`,
          }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                {connected ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
                )}
                <div>
                  <Text strong>
                    MQTT Connection: {connected ? 'Active' : 'Disconnected'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {health?.checks?.mqtt?.clientId || 'N/A'}
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  System Status
                </Text>
                <Badge 
                  status={isActive ? 'processing' : 'default'} 
                  text={isActive ? 'Processing Messages' : 'Idle'} 
                />
              </Space>
            </Col>
          </Row>
        </Card>
      </Space>
    </Card>
  );
});

RealtimeStatsMonitor.displayName = 'RealtimeStatsMonitor';
