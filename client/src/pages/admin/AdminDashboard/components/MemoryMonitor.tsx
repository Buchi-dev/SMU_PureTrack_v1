import { Card, Progress, Typography, Space, Row, Col } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { memo, useMemo, useCallback } from 'react';
import type { MqttBridgeHealth } from '../hooks';

const { Title, Text } = Typography;

interface MemoryMonitorProps {
  health: MqttBridgeHealth | null;
  loading: boolean;
}

export const MemoryMonitor = memo(({ health, loading }: MemoryMonitorProps) => {
  const memory = health?.checks?.memory;
  const memoryPercent = memory?.percent || 0;

  const getMemoryStatus = useCallback((percent: number): 'success' | 'normal' | 'exception' => {
    if (percent < 60) return 'success';
    if (percent < 85) return 'normal';
    return 'exception';
  }, []);

  const memoryColor = useMemo(() => {
    if (memoryPercent > 85) return '#ff4d4f';
    if (memoryPercent > 60) return '#fa8c16';
    return '#52c41a';
  }, [memoryPercent]);

  const memoryStatus = useMemo(() => 
    getMemoryStatus(memoryPercent),
    [memoryPercent, getMemoryStatus]
  );

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <DatabaseOutlined style={{ fontSize: '20px' }} />
          <span>Memory Usage</span>
        </Space>
      }
      bordered={false}
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>Overall Memory</Text>
            <Text strong style={{ color: memoryColor }}>
              {memoryPercent}%
            </Text>
          </div>
          <Progress 
            percent={memoryPercent} 
            status={memoryStatus}
            strokeWidth={12}
            showInfo={false}
          />
        </div>

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Heap Used</Text>
              <Title level={4} style={{ margin: 0 }}>
                {memory?.heapUsed || '--'}
              </Title>
            </Space>
          </Col>

          <Col span={8}>
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Heap Total</Text>
              <Title level={4} style={{ margin: 0 }}>
                {memory?.heapTotal || '--'}
              </Title>
            </Space>
          </Col>

          <Col span={8}>
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: '12px' }}>RSS</Text>
              <Title level={4} style={{ margin: 0 }}>
                {memory?.rss || '--'}
              </Title>
            </Space>
          </Col>
        </Row>
      </Space>
    </Card>
  );
});
