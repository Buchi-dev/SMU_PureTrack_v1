import { Card, Descriptions, Tag, Typography, Space } from 'antd';
import { InfoCircleOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { memo, useMemo, useCallback } from 'react';
import type { MqttBridgeStatus } from '../../../../services/mqtt.service';
import { HEALTH_COLORS } from '../config';

const { Text } = Typography;

interface SystemInfoProps {
  status: MqttBridgeStatus | null;
  loading: boolean;
}

export const SystemInfo = memo(({ status, loading }: SystemInfoProps) => {
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  const formatUptime = useCallback((seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '< 1m';
  }, []);

  const uptimeDisplay = useMemo(() => 
    status ? formatUptime(status.uptime) : '--',
    [status, formatUptime]
  );

  const memoryDisplay = useMemo(() => {
    if (!status) return null;
    return {
      rss: formatBytes(status.memory.rss),
      heapTotal: formatBytes(status.memory.heapTotal),
      heapUsed: formatBytes(status.memory.heapUsed)
    };
  }, [status, formatBytes]);

  const bufferEntries = useMemo(() => 
    status?.buffers ? Object.entries(status.buffers) : [],
    [status?.buffers]
  );

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <InfoCircleOutlined style={{ fontSize: '20px' }} />
          <span>System Information</span>
        </Space>
      }
      bordered={false}
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="System Uptime">
          <Space>
            <ThunderboltOutlined style={{ color: HEALTH_COLORS.EXCELLENT }} />
            <Text strong>{uptimeDisplay}</Text>
          </Space>
        </Descriptions.Item>
        
        <Descriptions.Item label="MQTT Status">
          {status?.mqtt.connected ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Connected</Tag>
          ) : (
            <Tag color="error">Disconnected</Tag>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Memory Details">
          {memoryDisplay ? (
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                RSS: <Text strong>{memoryDisplay.rss}</Text>
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Heap Total: <Text strong>{memoryDisplay.heapTotal}</Text>
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Heap Used: <Text strong>{memoryDisplay.heapUsed}</Text>
              </Text>
            </Space>
          ) : (
            <Text type="secondary">--</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Active Buffers">
          {bufferEntries.length > 0 ? (
            <Space direction="vertical" size={4}>
              {bufferEntries.map(([name, count]) => (
                <Text key={name} type="secondary" style={{ fontSize: '12px' }}>
                  {name}: <Tag color={count > 0 ? 'processing' : 'default'}>{count}</Tag>
                </Text>
              ))}
            </Space>
          ) : (
            <Text type="secondary">--</Text>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
});
