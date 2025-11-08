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
  const memoryPercent = memory?.percent || 0;

  // Calculate RSS memory percentage (RSS / RAM limit of 256MB)
  const rssBytes = status?.memory?.rss || 0;
  const RAM_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB in bytes
  const rssPercent = useMemo(() => {
    if (rssBytes === 0) return 0;
    return Math.min(Math.round((rssBytes / RAM_LIMIT_BYTES) * 100), 100);
  }, [rssBytes]);

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

  // Use centralized health calculators
  const memoryHealthData = useMemo(() => 
    getMemoryHealth(memoryPercent),
    [memoryPercent]
  );

  const rssHealthData = useMemo(() => 
    getMemoryHealth(rssPercent),
    [rssPercent]
  );

  const memoryStatus = useMemo(() => 
    getProgressStatus(memoryHealthData.status),
    [memoryHealthData.status]
  );

  const rssStatus = useMemo(() => 
    getProgressStatus(rssHealthData.status),
    [rssHealthData.status]
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
        {/* Overall Memory (Heap) */}
        <Col xs={24} lg={12}>
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '14px' }}>Overall Memory (Heap)</Text>
              <Text strong style={{ color: memoryHealthData.color, fontSize: '16px' }}>
                {memoryPercent}%
              </Text>
            </div>
            <Progress 
              percent={memoryPercent} 
              status={memoryStatus}
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

        {/* Memory Usage (RSS) */}
        <Col xs={24} lg={12}>
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '14px' }}>Memory Usage (RSS)</Text>
              <Text strong style={{ color: rssHealthData.color, fontSize: '16px' }}>
                {rssPercent}%
              </Text>
            </div>
            <Progress 
              percent={rssPercent} 
              status={rssStatus}
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
      </Row>
    </Card>
  );
});
