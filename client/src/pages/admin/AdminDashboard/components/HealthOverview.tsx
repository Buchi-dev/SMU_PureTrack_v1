import { Card, Badge, Typography, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { MqttBridgeHealth } from '../hooks';

const { Title, Text } = Typography;

interface HealthOverviewProps {
  health: MqttBridgeHealth | null;
  loading: boolean;
}

export const HealthOverview = memo(({ health, loading }: HealthOverviewProps) => {
  const isHealthy = health?.status === 'healthy';
  
  const formatUptime = useMemo(() => {
    return (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${hours}h ${minutes}m ${secs}s`;
    };
  }, []);

  const uptimeDisplay = useMemo(() => 
    health ? formatUptime(health.uptime) : '--',
    [health, formatUptime]
  );

  const timestampDisplay = useMemo(() => 
    health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '--',
    [health?.timestamp]
  );

  const cardStyle = useMemo(() => ({
    background: isHealthy 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  }), [isHealthy]);

  return (
    <Card 
      loading={loading}
      style={cardStyle}
      bodyStyle={{ padding: '32px' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0, color: '#fff' }}>
            MQTT Bridge Status
          </Title>
          <Badge 
            status={isHealthy ? 'success' : 'error'} 
            text={
              <Text strong style={{ color: '#fff', fontSize: '18px' }}>
                {health?.status?.toUpperCase() || 'UNKNOWN'}
              </Text>
            }
          />
        </div>

        <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
          <Space direction="vertical" size={4}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              Uptime
            </Text>
            <Title level={3} style={{ margin: 0, color: '#fff' }}>
              {uptimeDisplay}
            </Title>
          </Space>

          <Space direction="vertical" size={4}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>
              {health?.checks.mqtt.connected ? (
                <CheckCircleOutlined style={{ marginRight: 8 }} />
              ) : (
                <CloseCircleOutlined style={{ marginRight: 8 }} />
              )}
              MQTT Connection
            </Text>
            <Title level={3} style={{ margin: 0, color: '#fff' }}>
              {health?.checks.mqtt.connected ? 'Connected' : 'Disconnected'}
            </Title>
            {health?.checks.mqtt.clientId && (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                {health.checks.mqtt.clientId}
              </Text>
            )}
          </Space>

          <Space direction="vertical" size={4}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>
              Last Updated
            </Text>
            <Title level={4} style={{ margin: 0, color: '#fff' }}>
              {timestampDisplay}
            </Title>
          </Space>
        </div>
      </Space>
    </Card>
  );
});
