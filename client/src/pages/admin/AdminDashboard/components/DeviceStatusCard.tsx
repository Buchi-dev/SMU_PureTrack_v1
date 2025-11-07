import { Card, Space, Typography, Row, Col, Tag, Tooltip, Badge, Progress } from 'antd';
import { 
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { memo, useMemo } from 'react';

const { Text, Title } = Typography;

interface DeviceStatusCardProps {
  deviceStats: {
    total: number;
    online: number;
    offline: number;
    withReadings: number;
  };
  loading: boolean;
}

export const DeviceStatusCard = memo<DeviceStatusCardProps>(({ deviceStats, loading }) => {
  const safeDeviceStats = useMemo(() => ({
    total: deviceStats?.total ?? 0,
    online: deviceStats?.online ?? 0,
    offline: deviceStats?.offline ?? 0,
    withReadings: deviceStats?.withReadings ?? 0,
  }), [deviceStats]);

  const healthPercent = useMemo(() => 
    safeDeviceStats.total > 0 
      ? Math.round((safeDeviceStats.online / safeDeviceStats.total) * 100) 
      : 0,
    [safeDeviceStats]
  );

  const statusColor = useMemo(() => {
    if (safeDeviceStats.total === 0) return '#d9d9d9';
    if (healthPercent === 100) return '#52c41a';
    if (healthPercent >= 80) return '#52c41a';
    if (healthPercent >= 50) return '#faad14';
    return '#ff4d4f';
  }, [healthPercent, safeDeviceStats.total]);

  const statusText = useMemo(() => {
    if (safeDeviceStats.total === 0) return 'No Devices';
    if (healthPercent === 100) return 'All Online';
    if (healthPercent >= 80) return 'Healthy';
    if (healthPercent >= 50) return 'Degraded';
    return 'Critical';
  }, [healthPercent, safeDeviceStats.total]);

  const statusIcon = useMemo(() => {
    if (safeDeviceStats.total === 0) return <DatabaseOutlined />;
    if (healthPercent >= 80) return <CheckCircleOutlined />;
    if (healthPercent >= 50) return <WarningOutlined />;
    return <CloseCircleOutlined />;
  }, [healthPercent, safeDeviceStats.total]);

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <DatabaseOutlined />
          <span>Device Status</span>
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
            {safeDeviceStats.online} of {safeDeviceStats.total} devices online
          </Text>
        </div>

        {/* Device Breakdown */}
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <Tooltip title="Devices currently online and transmitting">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: safeDeviceStats.online > 0 ? '#52c41a' : '#d9d9d9',
                  backgroundColor: safeDeviceStats.online > 0 ? '#f6ffed' : '#fafafa'
                }}
              >
                <Badge count={safeDeviceStats.online} showZero style={{ backgroundColor: '#52c41a' }}>
                  <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                </Badge>
                <div style={{ marginTop: '8px' }}>
                  <Text strong style={{ color: '#52c41a' }}>Online</Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
          <Col span={12}>
            <Tooltip title="Devices currently offline or not responding">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: safeDeviceStats.offline > 0 ? '#ff4d4f' : '#d9d9d9',
                  backgroundColor: safeDeviceStats.offline > 0 ? '#fff1f0' : '#fafafa'
                }}
              >
                <Badge count={safeDeviceStats.offline} showZero style={{ backgroundColor: '#ff4d4f' }}>
                  <CloseCircleOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
                </Badge>
                <div style={{ marginTop: '8px' }}>
                  <Text strong style={{ color: '#ff4d4f' }}>Offline</Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
        </Row>

        {/* Health Progress Bar */}
        <div style={{ 
          padding: '12px', 
          backgroundColor: healthPercent >= 80 ? '#f6ffed' : healthPercent >= 50 ? '#fffbe6' : '#fff1f0',
          borderRadius: '4px',
          border: `1px solid ${healthPercent >= 80 ? '#b7eb8f' : healthPercent >= 50 ? '#ffe58f' : '#ffccc7'}`
        }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Overall Health</Text>
              <Text strong style={{ 
                fontSize: '16px',
                color: statusColor
              }}>
                {healthPercent}%
              </Text>
            </div>
            <Progress 
              percent={healthPercent}
              strokeColor={statusColor}
              showInfo={false}
              strokeWidth={8}
            />
          </Space>
        </div>

        {/* Summary Tags */}
        <div style={{ textAlign: 'center' }}>
          <Space wrap>
            <Tag icon={<DatabaseOutlined />} color="blue">
              {safeDeviceStats.total} Total
            </Tag>
            <Tag 
              icon={<CheckCircleOutlined />} 
              color={safeDeviceStats.online > 0 ? 'success' : 'default'}
            >
              {safeDeviceStats.online} Online
            </Tag>
          </Space>
        </div>
      </Space>
    </Card>
  );
});

DeviceStatusCard.displayName = 'DeviceStatusCard';
