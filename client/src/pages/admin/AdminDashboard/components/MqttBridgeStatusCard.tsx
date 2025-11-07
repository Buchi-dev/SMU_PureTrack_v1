import { Card, Space, Typography, Row, Col, Tag, Tooltip, Statistic } from 'antd';
import { 
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  SendOutlined,
  WarningOutlined,
  ApiOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { memo, useMemo } from 'react';

const { Text, Title } = Typography;

interface MqttBridgeStatusCardProps {
  mqttHealth: {
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    metrics?: {
      received: number;
      published: number;
      failed: number;
    };
  } | null;
  loading: boolean;
}

export const MqttBridgeStatusCard = memo<MqttBridgeStatusCardProps>(({ mqttHealth, loading }) => {
  const isHealthy = useMemo(() => 
    mqttHealth?.status === 'healthy',
    [mqttHealth]
  );

  const isConnected = useMemo(() => 
    mqttHealth?.connected ?? false,
    [mqttHealth]
  );

  const statusColor = useMemo(() => {
    if (!mqttHealth) return '#d9d9d9';
    if (isHealthy && isConnected) return '#52c41a';
    if (isConnected) return '#faad14';
    return '#ff4d4f';
  }, [mqttHealth, isHealthy, isConnected]);

  const statusText = useMemo(() => {
    if (!mqttHealth) return 'Unknown';
    if (isHealthy && isConnected) return 'Healthy';
    if (isConnected) return 'Degraded';
    return 'Disconnected';
  }, [mqttHealth, isHealthy, isConnected]);

  const statusIcon = useMemo(() => {
    if (!mqttHealth) return <WarningOutlined />;
    if (isHealthy && isConnected) return <CheckCircleOutlined />;
    if (isConnected) return <WarningOutlined />;
    return <CloseCircleOutlined />;
  }, [mqttHealth, isHealthy, isConnected]);

  const metrics = mqttHealth?.metrics;
  const totalProcessed = useMemo(() => 
    (metrics?.received ?? 0) + (metrics?.published ?? 0),
    [metrics]
  );

  const successRate = useMemo(() => {
    if (!metrics || totalProcessed === 0) return 100;
    const successful = totalProcessed - (metrics.failed ?? 0);
    return Math.round((successful / totalProcessed) * 100);
  }, [metrics, totalProcessed]);

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <CloudServerOutlined />
          <span>MQTT Bridge</span>
        </Space>
      }
      bordered={false}
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        height: '100%'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Main Status Display */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ 
            fontSize: '48px', 
            color: statusColor,
            marginBottom: '8px',
            lineHeight: 1
          }}>
            {statusIcon}
          </div>
          <Title level={4} style={{ margin: '8px 0 4px 0', color: statusColor }}>
            {statusText}
          </Title>
          <Text type="secondary">
            {isConnected ? 'Connected and operational' : 'Not connected'}
          </Text>
        </div>

        {/* Connection Status */}
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <Card 
              size="small" 
              style={{ 
                textAlign: 'center',
                borderColor: isConnected ? '#52c41a' : '#ff4d4f',
                backgroundColor: isConnected ? '#f6ffed' : '#fff1f0'
              }}
            >
              {isConnected ? (
                <CheckCircleOutlined style={{ fontSize: '28px', color: '#52c41a' }} />
              ) : (
                <CloseCircleOutlined style={{ fontSize: '28px', color: '#ff4d4f' }} />
              )}
              <div style={{ marginTop: '8px' }}>
                <Text strong style={{ color: isConnected ? '#52c41a' : '#ff4d4f' }}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card 
              size="small" 
              style={{ 
                textAlign: 'center',
                borderColor: isHealthy ? '#52c41a' : '#faad14',
                backgroundColor: isHealthy ? '#f6ffed' : '#fffbe6'
              }}
            >
              <ApiOutlined style={{ 
                fontSize: '28px', 
                color: isHealthy ? '#52c41a' : '#faad14' 
              }} />
              <div style={{ marginTop: '8px' }}>
                <Text strong style={{ color: isHealthy ? '#52c41a' : '#faad14' }}>
                  {isHealthy ? 'Healthy' : 'Degraded'}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Metrics */}
        {metrics && (
          <>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Tooltip title="Messages received from MQTT broker">
                  <Statistic
                    title="Received"
                    value={metrics.received}
                    prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ fontSize: '20px', color: '#1890ff' }}
                  />
                </Tooltip>
              </Col>
              <Col span={12}>
                <Tooltip title="Messages published to Firebase">
                  <Statistic
                    title="Published"
                    value={metrics.published}
                    prefix={<SendOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ fontSize: '20px', color: '#52c41a' }}
                  />
                </Tooltip>
              </Col>
            </Row>

            {/* Performance Metrics */}
            <div style={{ 
              padding: '12px', 
              backgroundColor: metrics.failed > 0 ? '#fff1f0' : '#f6ffed',
              borderRadius: '4px',
              border: `1px solid ${metrics.failed > 0 ? '#ffccc7' : '#b7eb8f'}`
            }}>
              <Row gutter={16} align="middle">
                <Col span={12}>
                  <Space>
                    <SyncOutlined style={{ 
                      fontSize: '16px',
                      color: successRate >= 95 ? '#52c41a' : successRate >= 80 ? '#faad14' : '#ff4d4f'
                    }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Success Rate</Text>
                      <div>
                        <Text strong style={{ 
                          fontSize: '18px',
                          color: successRate >= 95 ? '#52c41a' : successRate >= 80 ? '#faad14' : '#ff4d4f'
                        }}>
                          {successRate}%
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space>
                    <WarningOutlined style={{ 
                      fontSize: '16px',
                      color: metrics.failed > 0 ? '#ff4d4f' : '#52c41a'
                    }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Failed</Text>
                      <div>
                        <Text strong style={{ 
                          fontSize: '18px',
                          color: metrics.failed > 0 ? '#ff4d4f' : '#52c41a'
                        }}>
                          {metrics.failed}
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Col>
              </Row>
            </div>
          </>
        )}

        {/* Summary Tags */}
        <div style={{ textAlign: 'center' }}>
          <Space wrap>
            <Tag 
              icon={isConnected ? <CheckCircleOutlined /> : <CloseCircleOutlined />} 
              color={isConnected ? 'success' : 'error'}
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Tag>
            {metrics && (
              <Tag icon={<ThunderboltOutlined />} color="processing">
                {totalProcessed} messages
              </Tag>
            )}
          </Space>
        </div>
      </Space>
    </Card>
  );
});

MqttBridgeStatusCard.displayName = 'MqttBridgeStatusCard';
