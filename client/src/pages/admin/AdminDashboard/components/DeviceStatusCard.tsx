import { Card, Space, Typography, Row, Col, Tag, Tooltip, Progress } from 'antd';
import { 
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  SignalFilled
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import { getDeviceHealth } from '../config';

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

  // Use centralized device health calculator
  const deviceHealthData = useMemo(() => 
    getDeviceHealth(healthPercent, safeDeviceStats.total > 0),
    [healthPercent, safeDeviceStats.total]
  );

  const statusIcon = useMemo(() => {
    if (safeDeviceStats.total === 0) return <DatabaseOutlined />;
    if (deviceHealthData.status === 'excellent' || deviceHealthData.status === 'good') {
      return <CheckCircleOutlined />;
    }
    if (deviceHealthData.status === 'warning') return <WarningOutlined />;
    return <CloseCircleOutlined />;
  }, [deviceHealthData.status, safeDeviceStats.total]);

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <DatabaseOutlined style={{ fontSize: '18px' }} />
          <span style={{ fontSize: '16px', fontWeight: 500 }}>Device Status</span>
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
            color: deviceHealthData.color,
            marginBottom: '12px',
            lineHeight: 1,
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {statusIcon}
          </div>
          <Title level={3} style={{ margin: '12px 0 8px 0', color: deviceHealthData.color, fontSize: '24px' }}>
            {deviceHealthData.statusText}
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            {safeDeviceStats.online} of {safeDeviceStats.total} devices online
          </Text>
        </div>

        {/* Device Breakdown - 2x2 Grid */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Tooltip title="Devices currently online and transmitting">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: safeDeviceStats.online > 0 ? '#52c41a' : '#e8e8e8',
                  backgroundColor: safeDeviceStats.online > 0 ? '#f6ffed' : '#fafafa',
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
                  <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Online</Text>
                  <Text strong style={{ fontSize: '20px', color: '#52c41a' }}>
                    {safeDeviceStats.online}
                  </Text>
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
                  borderColor: safeDeviceStats.offline > 0 ? '#ff4d4f' : '#e8e8e8',
                  backgroundColor: safeDeviceStats.offline > 0 ? '#fff1f0' : '#fafafa',
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
                  <CloseCircleOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Offline</Text>
                  <Text strong style={{ fontSize: '20px', color: '#ff4d4f' }}>
                    {safeDeviceStats.offline}
                  </Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
          <Col span={12}>
            <Tooltip title="Total number of registered devices">
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
                  <DatabaseOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Total Devices</Text>
                  <Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
                    {safeDeviceStats.total}
                  </Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
          <Col span={12}>
            <Tooltip title="Devices with active sensor readings">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: '#722ed1',
                  backgroundColor: '#f9f0ff',
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
                  <SignalFilled style={{ fontSize: '32px', color: '#722ed1' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>With Readings</Text>
                  <Text strong style={{ fontSize: '20px', color: '#722ed1' }}>
                    {safeDeviceStats.withReadings}
                  </Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
        </Row>

        {/* Health Progress Bar */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: deviceHealthData.status === 'excellent' || deviceHealthData.status === 'good' 
            ? '#f6ffed' 
            : deviceHealthData.status === 'warning' ? '#fffbe6' : '#fff1f0',
          borderRadius: '8px',
          border: `1px solid ${
            deviceHealthData.status === 'excellent' || deviceHealthData.status === 'good'
              ? '#b7eb8f' 
              : deviceHealthData.status === 'warning' ? '#ffe58f' : '#ffccc7'
          }`
        }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>Overall Health</Text>
              <Text strong style={{ 
                fontSize: '18px',
                color: deviceHealthData.color
              }}>
                {healthPercent}%
              </Text>
            </div>
            <Progress 
              percent={healthPercent}
              strokeColor={deviceHealthData.color}
              showInfo={false}
              strokeWidth={10}
            />
          </Space>
        </div>

        {/* Summary Tags */}
        <div style={{ textAlign: 'center' }}>
          <Space wrap size="small">
            <Tag 
              icon={<CheckCircleOutlined />} 
              color={safeDeviceStats.online > 0 ? 'success' : 'default'}
              style={{ padding: '4px 12px', fontSize: '13px' }}
            >
              {safeDeviceStats.online} Online
            </Tag>
            <Tag 
              icon={<DatabaseOutlined />} 
              color="blue"
              style={{ padding: '4px 12px', fontSize: '13px' }}
            >
              {safeDeviceStats.total} Total
            </Tag>
          </Space>
        </div>
      </Space>
    </Card>
  );
});

DeviceStatusCard.displayName = 'DeviceStatusCard';
