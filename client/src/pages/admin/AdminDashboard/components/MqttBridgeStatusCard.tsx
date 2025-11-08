import { Card, Space, Typography, Row, Col, Tag, Tooltip, Progress } from 'antd';
import { 
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  SendOutlined,
  WarningOutlined,
  SyncOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import { getSuccessRateHealth } from '../config';

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

  // Use centralized success rate health calculator
  const successRateHealthData = useMemo(() => 
    getSuccessRateHealth(successRate),
    [successRate]
  );

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <CloudServerOutlined style={{ fontSize: '18px' }} />
          <span style={{ fontSize: '16px', fontWeight: 500 }}>MQTT Bridge Health</span>
        </Space>
      }
      bordered={false}
      style={{ 
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        height: '100%',
        minHeight: '400px'
      }}
      bodyStyle={{ 
        padding: '24px',
        height: '100%'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Main Status Display */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ 
            fontSize: '56px', 
            color: statusColor,
            marginBottom: '12px',
            lineHeight: 1,
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {statusIcon}
          </div>
          <Title level={3} style={{ margin: '12px 0 8px 0', color: statusColor, fontSize: '24px' }}>
            {statusText}
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            {isConnected ? 'Connected and operational' : 'Not connected'}
          </Text>
        </div>

        {/* MQTT Status Breakdown - 2x2 Grid */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Tooltip title="MQTT connection status">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: isConnected ? '#52c41a' : '#ff4d4f',
                  backgroundColor: isConnected ? '#f6ffed' : '#fff1f0',
                  borderRadius: '8px',
                  minHeight: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                bodyStyle={{ 
                  padding: '16px 12px',
                  width: '100%'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  {isConnected ? (
                    <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                  ) : (
                    <CloseCircleOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                  )}
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Connection</Text>
                  <Text strong style={{ fontSize: '16px', color: isConnected ? '#52c41a' : '#ff4d4f' }}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
          <Col span={12}>
            <Tooltip title="Overall bridge health status">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: isHealthy ? '#52c41a' : '#faad14',
                  backgroundColor: isHealthy ? '#f6ffed' : '#fffbe6',
                  borderRadius: '8px',
                  minHeight: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                bodyStyle={{ 
                  padding: '16px 12px',
                  width: '100%'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <ApiOutlined style={{ 
                    fontSize: '32px', 
                    color: isHealthy ? '#52c41a' : '#faad14' 
                  }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Health</Text>
                  <Text strong style={{ fontSize: '16px', color: isHealthy ? '#52c41a' : '#faad14' }}>
                    {isHealthy ? 'Healthy' : 'Degraded'}
                  </Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
          {metrics && (
            <>
              <Col span={12}>
                <Tooltip title="Messages received from MQTT broker">
                  <Card 
                    size="small" 
                    style={{ 
                      textAlign: 'center',
                      borderColor: '#1890ff',
                      backgroundColor: '#e6f7ff',
                      borderRadius: '8px',
                      minHeight: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    bodyStyle={{ 
                      padding: '16px 12px',
                      width: '100%'
                    }}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <ThunderboltOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Received</Text>
                      <Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
                        {metrics.received}
                      </Text>
                    </div>
                  </Card>
                </Tooltip>
              </Col>
              <Col span={12}>
                <Tooltip title="Messages published to Firebase">
                  <Card 
                    size="small" 
                    style={{ 
                      textAlign: 'center',
                      borderColor: '#52c41a',
                      backgroundColor: '#f6ffed',
                      borderRadius: '8px',
                      minHeight: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    bodyStyle={{ 
                      padding: '16px 12px',
                      width: '100%'
                    }}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <SendOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Published</Text>
                      <Text strong style={{ fontSize: '20px', color: '#52c41a' }}>
                        {metrics.published}
                      </Text>
                    </div>
                  </Card>
                </Tooltip>
              </Col>
            </>
          )}
        </Row>

        {/* Success Rate Progress */}
        {metrics && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: successRateHealthData.status === 'excellent' 
              ? '#f6ffed' 
              : successRateHealthData.status === 'warning' ? '#fffbe6' : '#fff1f0',
            borderRadius: '8px',
            border: `1px solid ${
              successRateHealthData.status === 'excellent' 
                ? '#b7eb8f' 
                : successRateHealthData.status === 'warning' ? '#ffe58f' : '#ffccc7'
            }`
          }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <SyncOutlined style={{ 
                    fontSize: '16px',
                    color: successRateHealthData.color
                  }} />
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>Success Rate</Text>
                </Space>
                <Text strong style={{ 
                  fontSize: '18px',
                  color: successRateHealthData.color
                }}>
                  {successRate}%
                </Text>
              </div>
              <Progress 
                percent={successRate}
                strokeColor={successRateHealthData.color}
                showInfo={false}
                strokeWidth={10}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {totalProcessed} processed
                </Text>
                <Text type="secondary" style={{ fontSize: '11px', color: metrics.failed > 0 ? '#ff4d4f' : '#52c41a' }}>
                  {metrics.failed} failed
                </Text>
              </div>
            </Space>
          </div>
        )}

        {/* Summary Tags */}
        <div style={{ textAlign: 'center' }}>
          <Space wrap size="small">
            <Tag 
              icon={isConnected ? <CheckCircleOutlined /> : <CloseCircleOutlined />} 
              color={isConnected ? 'success' : 'error'}
              style={{ padding: '4px 12px', fontSize: '13px' }}
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Tag>
            {metrics && (
              <Tag 
                icon={<ThunderboltOutlined />} 
                color="processing"
                style={{ padding: '4px 12px', fontSize: '13px' }}
              >
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
