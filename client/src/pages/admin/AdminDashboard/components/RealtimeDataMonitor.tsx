import { Card, Row, Col, Progress, Space, Typography, Badge, Tooltip } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { memo, useState, useEffect, useRef, useMemo } from 'react';
import type { MqttBridgeHealth } from '../hooks';

const { Text } = Typography;

interface RealtimeDataMonitorProps {
  health: MqttBridgeHealth | null;
  loading: boolean;
}

interface MetricSnapshot {
  received: number;
  published: number;
  failed: number;
  timestamp: number;
}

interface ThroughputData {
  receivedPerSec: number;
  publishedPerSec: number;
  successRate: number;
  activeFlow: boolean;
}

export const RealtimeDataMonitor = memo<RealtimeDataMonitorProps>(({ health, loading }) => {
  const [throughput, setThroughput] = useState<ThroughputData>({
    receivedPerSec: 0,
    publishedPerSec: 0,
    successRate: 100,
    activeFlow: false,
  });

  const [previousSnapshot, setPreviousSnapshot] = useState<MetricSnapshot | null>(null);
  const [deltaReceived, setDeltaReceived] = useState(0);
  const [deltaPublished, setDeltaPublished] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Calculate real-time throughput
  useEffect(() => {
    if (!health?.metrics) return;

    const currentSnapshot: MetricSnapshot = {
      received: health.metrics.received,
      published: health.metrics.published,
      failed: health.metrics.failed,
      timestamp: Date.now(),
    };

    if (previousSnapshot) {
      const timeDelta = (currentSnapshot.timestamp - previousSnapshot.timestamp) / 1000; // seconds
      
      if (timeDelta > 0) {
        const receivedDelta = currentSnapshot.received - previousSnapshot.received;
        const publishedDelta = currentSnapshot.published - previousSnapshot.published;
        const failedDelta = currentSnapshot.failed - previousSnapshot.failed;

        // Calculate per-second rates
        const receivedPerSec = Math.round(receivedDelta / timeDelta);
        const publishedPerSec = Math.round(publishedDelta / timeDelta);

        // Calculate success rate
        const totalAttempts = currentSnapshot.published + currentSnapshot.failed;
        const successRate = totalAttempts > 0
          ? Math.round((currentSnapshot.published / totalAttempts) * 100)
          : 100;

        // Detect active data flow
        const hasActivity = receivedDelta > 0 || publishedDelta > 0 || failedDelta > 0;
        
        if (hasActivity) {
          lastActivityRef.current = Date.now();
        }

        // Consider flow active if there was activity in last 3 seconds
        const activeFlow = (Date.now() - lastActivityRef.current) < 3000;

        setThroughput({
          receivedPerSec,
          publishedPerSec,
          successRate,
          activeFlow,
        });

        // Set deltas for animation
        setDeltaReceived(receivedDelta);
        setDeltaPublished(publishedDelta);

        // Clear delta animation after 1 second
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
        animationRef.current = window.setTimeout(() => {
          setDeltaReceived(0);
          setDeltaPublished(0);
        }, 1000);
      }
    }

    setPreviousSnapshot(currentSnapshot);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [health?.metrics, previousSnapshot]);

  // Memoized styles
  const activeIndicatorStyle = useMemo(() => ({
    height: '8px',
    width: '8px',
    borderRadius: '50%',
    backgroundColor: throughput.activeFlow ? '#52c41a' : '#d9d9d9',
    boxShadow: throughput.activeFlow ? '0 0 8px rgba(82, 196, 26, 0.6)' : 'none',
    transition: 'all 0.3s ease',
    animation: throughput.activeFlow ? 'pulse 1.5s infinite' : 'none',
  }), [throughput.activeFlow]);

  const successRateColor = useMemo(() => {
    if (throughput.successRate >= 98) return '#52c41a';
    if (throughput.successRate >= 90) return '#faad14';
    return '#ff4d4f';
  }, [throughput.successRate]);

  const metrics = health?.metrics;

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .delta-badge {
          animation: slideIn 0.3s ease;
        }
      `}</style>

      <Card
        loading={loading}
        bordered={false}
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
        }}
        title={
          <Space>
            <ThunderboltOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
            <Text strong style={{ fontSize: '16px' }}>Real-time Data Flow Monitor</Text>
            <div style={activeIndicatorStyle} title={throughput.activeFlow ? 'Active' : 'Idle'} />
          </Space>
        }
        extra={
          <Tooltip title={throughput.activeFlow ? 'Data flowing' : 'No recent activity'}>
            <Badge 
              status={throughput.activeFlow ? 'processing' : 'default'} 
              text={throughput.activeFlow ? 'Live' : 'Idle'} 
            />
          </Tooltip>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Throughput Metrics */}
          <Row gutter={[24, 16]}>
            {/* Received Rate */}
            <Col xs={24} sm={12} md={6}>
              <Card 
                bordered={false} 
                style={{ 
                  backgroundColor: '#f0f9ff',
                  borderLeft: '4px solid #52c41a',
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Incoming Rate
                  </Text>
                  <Space align="baseline">
                    <Text strong style={{ fontSize: '28px', color: '#52c41a' }}>
                      {throughput.receivedPerSec}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                      msg/s
                    </Text>
                  </Space>
                  {deltaReceived > 0 && (
                    <div className="delta-badge">
                      <Badge 
                        count={`+${deltaReceived}`} 
                        style={{ 
                          backgroundColor: '#52c41a',
                          fontSize: '11px'
                        }} 
                      />
                    </div>
                  )}
                  <Space size={4} style={{ marginTop: '8px' }}>
                    <ArrowDownOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                    <Text style={{ fontSize: '12px', color: '#666' }}>
                      Total: {metrics?.received?.toLocaleString() || 0}
                    </Text>
                  </Space>
                </Space>
              </Card>
            </Col>

            {/* Published Rate */}
            <Col xs={24} sm={12} md={6}>
              <Card 
                bordered={false} 
                style={{ 
                  backgroundColor: '#f0f5ff',
                  borderLeft: '4px solid #1890ff',
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Outgoing Rate
                  </Text>
                  <Space align="baseline">
                    <Text strong style={{ fontSize: '28px', color: '#1890ff' }}>
                      {throughput.publishedPerSec}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                      msg/s
                    </Text>
                  </Space>
                  {deltaPublished > 0 && (
                    <div className="delta-badge">
                      <Badge 
                        count={`+${deltaPublished}`} 
                        style={{ 
                          backgroundColor: '#1890ff',
                          fontSize: '11px'
                        }} 
                      />
                    </div>
                  )}
                  <Space size={4} style={{ marginTop: '8px' }}>
                    <ArrowUpOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                    <Text style={{ fontSize: '12px', color: '#666' }}>
                      Total: {metrics?.published?.toLocaleString() || 0}
                    </Text>
                  </Space>
                </Space>
              </Card>
            </Col>

            {/* Success Rate */}
            <Col xs={24} sm={12} md={6}>
              <Card 
                bordered={false} 
                style={{ 
                  backgroundColor: '#f6ffed',
                  borderLeft: `4px solid ${successRateColor}`,
                }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Success Rate
                  </Text>
                  <div style={{ position: 'relative' }}>
                    <Progress
                      type="circle"
                      percent={throughput.successRate}
                      strokeColor={successRateColor}
                      strokeWidth={10}
                      format={(percent) => (
                        <Text strong style={{ fontSize: '20px', color: successRateColor }}>
                          {percent}%
                        </Text>
                      )}
                      size={80}
                    />
                  </div>
                  <Space size={4}>
                    <CheckCircleOutlined style={{ color: successRateColor, fontSize: '12px' }} />
                    <Text style={{ fontSize: '11px', color: '#666' }}>
                      Failed: {metrics?.failed || 0}
                    </Text>
                  </Space>
                </Space>
              </Card>
            </Col>

            {/* Buffer Activity */}
            <Col xs={24} sm={12} md={6}>
              <Card 
                bordered={false} 
                style={{ 
                  backgroundColor: '#fef0ff',
                  borderLeft: '4px solid #722ed1',
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Buffer Flushes
                  </Text>
                  <Space align="baseline">
                    <Text strong style={{ fontSize: '28px', color: '#722ed1' }}>
                      {metrics?.flushes || 0}
                    </Text>
                  </Space>
                  <Space size={4} style={{ marginTop: '8px' }}>
                    <SyncOutlined 
                      spin={throughput.activeFlow} 
                      style={{ color: '#722ed1', fontSize: '12px' }} 
                    />
                    <Text style={{ fontSize: '12px', color: '#666' }}>
                      {throughput.activeFlow ? 'Processing...' : 'Idle'}
                    </Text>
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Connection Status Bar */}
          <Card 
            bordered={false}
            size="small"
            style={{ 
              backgroundColor: health?.checks?.mqtt?.connected ? '#f6ffed' : '#fff1f0',
              borderLeft: `4px solid ${health?.checks?.mqtt?.connected ? '#52c41a' : '#ff4d4f'}`,
            }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  {health?.checks?.mqtt?.connected ? (
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
                  )}
                  <div>
                    <Text strong>
                      MQTT Connection: {health?.checks?.mqtt?.connected ? 'Active' : 'Disconnected'}
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
                    Circuit Breaker
                  </Text>
                  <Badge 
                    status={metrics?.circuitBreakerOpen ? 'error' : 'success'} 
                    text={metrics?.circuitBreakerOpen ? 'OPEN' : 'CLOSED'} 
                  />
                </Space>
              </Col>
            </Row>
          </Card>
        </Space>
      </Card>
    </>
  );
});

RealtimeDataMonitor.displayName = 'RealtimeDataMonitor';
