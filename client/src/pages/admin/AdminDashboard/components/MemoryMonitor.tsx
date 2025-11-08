import { Card, Progress, Typography, Space, Row, Col } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { MqttBridgeHealth, MqttBridgeStatus } from '../hooks';
import { getMemoryHealth, getProgressStatus } from '../config';

const { Text } = Typography;

interface MemoryMonitorProps {
  health: MqttBridgeHealth | null;
  status: MqttBridgeStatus | null;
  loading: boolean;
}

export const MemoryMonitor = memo(({ health, status, loading }: MemoryMonitorProps) => {
  const memory = health?.checks?.memory;
  
  // Use RSS percent from health endpoint (already calculated against 256MB limit)
  const rssPercent = memory?.rssPercent || memory?.percent || 0;

  // Get RSS bytes for formatting
  const rssBytes = status?.memory?.rss || 0;

  // Format RSS in MB
  const rssMB = useMemo(() => {
    return (rssBytes / 1024 / 1024).toFixed(2);
  }, [rssBytes]);

  // Format Heap in MB
  const heapUsedBytes = status?.memory?.heapUsed || 0;
  const heapTotalBytes = status?.memory?.heapTotal || 0;
  const heapUsedMB = useMemo(() => {
    return (heapUsedBytes / 1024 / 1024).toFixed(2);
  }, [heapUsedBytes]);

  const heapTotalMB = useMemo(() => {
    return (heapTotalBytes / 1024 / 1024).toFixed(2);
  }, [heapTotalBytes]);

  const ramLimitMB = 256;

  // Use RSS percent as the primary health indicator (not heap)
  const primaryMemoryHealthData = useMemo(() => 
    getMemoryHealth(rssPercent),
    [rssPercent]
  );

  const heapHealthData = useMemo(() => {
    const heapUsedBytes = status?.memory?.heapUsed || 0;
    const heapTotalBytes = status?.memory?.heapTotal || 0;
    const heapPercent = heapTotalBytes > 0 
      ? Math.round((heapUsedBytes / heapTotalBytes) * 100) 
      : 0;
    return getMemoryHealth(heapPercent);
  }, [status?.memory?.heapUsed, status?.memory?.heapTotal]);

  const primaryMemoryStatus = useMemo(() => 
    getProgressStatus(primaryMemoryHealthData.status),
    [primaryMemoryHealthData.status]
  );

  const heapStatus = useMemo(() => 
    getProgressStatus(heapHealthData.status),
    [heapHealthData.status]
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
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        height: '100%'
      }}
    >
      <Row gutter={24}>
        {/* Primary: RAM Usage (RSS) - Used for health calculations */}
        <Col xs={24} lg={12}>
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '14px' }}>RAM Usage (RSS) 🎯</Text>
              <Text strong style={{ color: primaryMemoryHealthData.color, fontSize: '16px' }}>
                {rssPercent}%
              </Text>
            </div>
            <Progress 
              percent={rssPercent} 
              status={primaryMemoryStatus}
              strokeWidth={16}
              showInfo={false}
            />
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                {rssMB} MB / {ramLimitMB} MB
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                {(ramLimitMB - parseFloat(rssMB)).toFixed(2)} MB available
              </Text>
            </div>
          </div>
        </Col>

        {/* Secondary: Heap Memory - For reference only */}
        <Col xs={24} lg={12}>
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '14px' }}>Heap Memory (V8)</Text>
              <Text strong style={{ color: heapHealthData.color, fontSize: '16px' }}>
                {heapHealthData.displayPercent || 0}%
              </Text>
            </div>
            <Progress 
              percent={heapHealthData.displayPercent || 0} 
              status={heapStatus}
              strokeWidth={16}
              showInfo={false}
            />
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                {heapUsedMB} MB / {heapTotalMB} MB
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                {(parseFloat(heapTotalMB) - parseFloat(heapUsedMB)).toFixed(2)} MB available
              </Text>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
});
