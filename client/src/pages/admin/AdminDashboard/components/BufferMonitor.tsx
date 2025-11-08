import { Card, Progress, Typography, Space, Empty } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { memo, useMemo, useCallback } from 'react';
import type { MqttBridgeHealth } from '../hooks';
import { getBufferHealth } from '../config';

const { Text } = Typography;

interface BufferMonitorProps {
  health: MqttBridgeHealth | null;
  loading: boolean;
}

export const BufferMonitor = memo(({ health, loading }: BufferMonitorProps) => {
  const buffers = health?.checks?.buffers;

  const formatBufferName = useCallback((name: string): string => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const bufferEntries = useMemo(() => 
    buffers ? Object.entries(buffers) : [],
    [buffers]
  );

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <InboxOutlined style={{ fontSize: '20px' }} />
          <span>Message Buffers</span>
        </Space>
      }
      bordered={false}
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      {bufferEntries.length > 0 ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {bufferEntries.map(([bufferName, bufferData]) => {
            const bufferHealth = getBufferHealth(bufferData.utilization);
            
            return (
              <div key={bufferName}>
                <div style={{ 
                  marginBottom: '8px', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center' 
                }}>
                  <Text strong>{formatBufferName(bufferName)}</Text>
                  <Space size="large">
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Messages: <Text strong>{bufferData.messages}</Text>
                    </Text>
                    <Text 
                      strong 
                      style={{ 
                        color: bufferHealth.color,
                        fontSize: '14px'
                      }}
                    >
                      {bufferData.utilization}%
                    </Text>
                  </Space>
                </div>
                <Progress 
                  percent={bufferData.utilization} 
                  strokeColor={bufferHealth.color}
                  strokeWidth={10}
                  showInfo={false}
                />
              </div>
            );
          })}
        </Space>
      ) : (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description="No buffer data available"
        />
      )}
    </Card>
  );
});
