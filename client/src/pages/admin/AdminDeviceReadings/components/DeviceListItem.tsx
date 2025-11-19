import { List, Space, Typography, Tag, Badge, Tooltip, Row, Col, Statistic } from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import type { DeviceWithReadings } from '../../../../schemas';

const { Text } = Typography;

interface DeviceListItemProps {
  device: DeviceWithReadings;
}

// Helper to get quality status for a parameter
const getQualityColor = (
  param: 'ph' | 'tds' | 'turbidity',
  value: number
): 'success' | 'warning' | 'error' => {
  switch (param) {
    case 'ph':
      if (value >= 6.5 && value <= 8.5) return 'success';
      if (value >= 6.0 && value <= 9.0) return 'warning';
      return 'error';
    case 'tds':
      if (value <= 300) return 'success';
      if (value <= 1000) return 'warning';
      return 'error';
    case 'turbidity':
      if (value <= 1) return 'success';
      if (value <= 5) return 'warning';
      return 'error';
    default:
      return 'success';
  }
};

export const DeviceListItem = memo(({ device }: DeviceListItemProps) => {
  const { latestReading, activeAlerts, severityLevel } = device;

  // Determine border color based on severity
  const getBorderColor = () => {
    switch (severityLevel) {
      case 'critical':
        return '#ff4d4f';
      case 'warning':
        return '#faad14';
      case 'normal':
        return '#52c41a';
      case 'offline':
        return '#d9d9d9';
    }
  };

  // Status badge
  const getStatusBadge = () => {
    if (device.status === 'offline' || !latestReading) {
      return <Badge status="default" text="Offline" />;
    }
    switch (severityLevel) {
      case 'critical':
        return <Badge status="error" text="Critical" />;
      case 'warning':
        return <Badge status="warning" text="Warning" />;
      case 'normal':
        return <Badge status="success" text="Normal" />;
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <List.Item
      style={{
        borderLeft: `4px solid ${getBorderColor()}`,
        padding: '16px 20px',
        background: '#fff',
      }}
    >
      <List.Item.Meta
        title={
          <Space size="middle" style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '15px' }}>
              {device.name}
            </Text>
            {getStatusBadge()}
            {activeAlerts.length > 0 && (
              <Tag color={severityLevel === 'critical' ? 'red' : 'orange'} icon={<AlertOutlined />}>
                {activeAlerts.length} Alert{activeAlerts.length > 1 ? 's' : ''}
              </Tag>
            )}
          </Space>
        }
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space size="middle" wrap>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ID: {device.deviceId}
              </Text>
              {device.metadata?.location && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                  {device.metadata.location.building}, {device.metadata.location.floor}
                </Text>
              )}
              {latestReading && (
                <Tooltip title={new Date(latestReading.timestamp).toLocaleString()}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {formatTimestamp(latestReading.timestamp)}
                  </Text>
                </Tooltip>
              )}
            </Space>

            {latestReading ? (
              <Row gutter={24} style={{ marginTop: 8 }}>
                <Col xs={8} sm={8} md={6} lg={4}>
                  <Statistic
                    title="pH"
                    value={latestReading.ph.toFixed(2)}
                    prefix={<ExperimentOutlined style={{ fontSize: '14px' }} />}
                    valueStyle={{
                      fontSize: '18px',
                      color:
                        getQualityColor('ph', latestReading.ph) === 'success'
                          ? '#52c41a'
                          : getQualityColor('ph', latestReading.ph) === 'warning'
                          ? '#faad14'
                          : '#ff4d4f',
                    }}
                  />
                </Col>
                <Col xs={8} sm={8} md={6} lg={4}>
                  <Statistic
                    title="TDS"
                    value={latestReading.tds.toFixed(0)}
                    suffix="ppm"
                    prefix={<ExperimentOutlined style={{ fontSize: '14px' }} />}
                    valueStyle={{
                      fontSize: '18px',
                      color:
                        getQualityColor('tds', latestReading.tds) === 'success'
                          ? '#52c41a'
                          : getQualityColor('tds', latestReading.tds) === 'warning'
                          ? '#faad14'
                          : '#ff4d4f',
                    }}
                  />
                </Col>
                <Col xs={8} sm={8} md={6} lg={4}>
                  <Statistic
                    title="Turbidity"
                    value={latestReading.turbidity.toFixed(2)}
                    suffix="NTU"
                    prefix={<ExperimentOutlined style={{ fontSize: '14px' }} />}
                    valueStyle={{
                      fontSize: '18px',
                      color:
                        getQualityColor('turbidity', latestReading.turbidity) === 'success'
                          ? '#52c41a'
                          : getQualityColor('turbidity', latestReading.turbidity) === 'warning'
                          ? '#faad14'
                          : '#ff4d4f',
                    }}
                  />
                </Col>
              </Row>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                No sensor data available
              </Text>
            )}

            {activeAlerts.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Space size={4} wrap>
                  {activeAlerts.slice(0, 3).map((alert) => (
                    <Tag
                      key={alert.alertId}
                      color={alert.severity === 'Critical' ? 'red' : 'orange'}
                      style={{ fontSize: '11px', margin: 0 }}
                    >
                      {alert.parameter.toUpperCase()}: {alert.message || 'Alert'}
                    </Tag>
                  ))}
                  {activeAlerts.length > 3 && (
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      +{activeAlerts.length - 3} more
                    </Text>
                  )}
                </Space>
              </div>
            )}
          </Space>
        }
      />
    </List.Item>
  );
});

DeviceListItem.displayName = 'DeviceListItem';
