import { Card, Row, Col, Typography, Tag, Badge, Tooltip, Progress, Empty, Space } from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  ExperimentOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import type { DeviceWithReadings } from '../../../../schemas';
import { SensorHealthIndicator } from '../../../../components';

const { Text, Title } = Typography;

interface DeviceCardProps {
  device: DeviceWithReadings;
}

// Helper to get quality status for a parameter
const getQualityStatus = (
  param: 'ph' | 'tds' | 'turbidity',
  value: number
): { status: 'success' | 'warning' | 'error'; text: string } => {
  switch (param) {
    case 'ph':
      if (value >= 6.5 && value <= 8.5) return { status: 'success', text: 'Optimal' };
      if (value >= 6.0 && value <= 9.0) return { status: 'warning', text: 'Acceptable' };
      return { status: 'error', text: 'Critical' };
    case 'tds':
      if (value <= 300) return { status: 'success', text: 'Excellent' };
      if (value <= 500) return { status: 'warning', text: 'Good' };
      if (value <= 1000) return { status: 'warning', text: 'Fair' };
      return { status: 'error', text: 'Poor' };
    case 'turbidity':
      if (value <= 1) return { status: 'success', text: 'Excellent' };
      if (value <= 5) return { status: 'warning', text: 'Good' };
      return { status: 'error', text: 'Poor' };
    default:
      return { status: 'success', text: 'Normal' };
  }
};

// Get progress color based on parameter
const getProgressColor = (param: 'ph' | 'tds' | 'turbidity', value: number): string => {
  const quality = getQualityStatus(param, value);
  switch (quality.status) {
    case 'success':
      return '#52c41a';
    case 'warning':
      return '#faad14';
    case 'error':
      return '#ff4d4f';
  }
};

// Calculate progress percentage for visual representation
const getProgressPercent = (param: 'ph' | 'tds' | 'turbidity', value: number): number => {
  switch (param) {
    case 'ph':
      return Math.min((value / 14) * 100, 100);
    case 'tds':
      return Math.min((value / 1500) * 100, 100);
    case 'turbidity':
      return Math.min((value / 10) * 100, 100);
    default:
      return 0;
  }
};

export const DeviceCard = memo(({ device }: DeviceCardProps) => {
  const { latestReading, activeAlerts, severityLevel } = device;

  // Determine card border color based on severity
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
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Badge.Ribbon
      text={activeAlerts.length > 0 ? `${activeAlerts.length} Alert${activeAlerts.length > 1 ? 's' : ''}` : undefined}
      color={severityLevel === 'critical' ? 'red' : severityLevel === 'warning' ? 'orange' : undefined}
    >
      <Card
        hoverable
        style={{
          borderLeft: `6px solid ${getBorderColor()}`,
          height: '100%',
        }}
        styles={{
          body: { padding: '20px' },
        }}
      >
        {/* Header */}
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
                {device.name}
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {device.deviceId}
              </Text>
            </div>
            <div style={{ textAlign: 'right' }}>
              {getStatusBadge()}
              {severityLevel === 'critical' && (
                <div style={{ marginTop: 4 }}>
                  <Tag color="red" icon={<WarningOutlined />}>
                    URGENT
                  </Tag>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {device.metadata?.location && (
            <div>
              <EnvironmentOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              <Text type="secondary">
                {device.metadata.location.building}, {device.metadata.location.floor}
              </Text>
            </div>
          )}

          {/* Readings */}
          {latestReading ? (
            <>
              <Row gutter={[8, 12]}>
                {/* pH Level */}
                <Col span={24}>
                  <div
                    style={{
                      background: '#fafafa',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong>
                        <ExperimentOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                        pH Level
                      </Text>
                      <Space>
                        <Text strong style={{ fontSize: '16px' }}>
                          {typeof (latestReading.pH ?? latestReading.ph) === 'number' 
                            ? (latestReading.pH ?? latestReading.ph)!.toFixed(2) 
                            : '-'}
                        </Text>
                        {typeof (latestReading.pH ?? latestReading.ph) === 'number' && latestReading.pH_valid !== false ? (
                          <Tag color={getQualityStatus('ph', latestReading.pH ?? latestReading.ph!)!.status}>
                            {getQualityStatus('ph', latestReading.pH ?? latestReading.ph!)!.text}
                          </Tag>
                        ) : (
                          <SensorHealthIndicator 
                            sensor="pH" 
                            value={latestReading.pH ?? latestReading.ph} 
                            valid={latestReading.pH_valid}
                            mode="tag"
                          />
                        )}
                      </Space>
                    </div>
                    {typeof (latestReading.pH ?? latestReading.ph) === 'number' && latestReading.pH_valid !== false ? (
                      <>
                        <Progress
                          percent={getProgressPercent('ph', latestReading.pH ?? latestReading.ph!)}
                          strokeColor={getProgressColor('ph', latestReading.pH ?? latestReading.ph!)}
                          showInfo={false}
                          size="small"
                        />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          Optimal: 6.5 - 8.5
                        </Text>
                      </>
                    ) : (
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Sensor needs attention
                      </Text>
                    )}
                  </div>
                </Col>

                {/* TDS */}
                <Col span={24}>
                  <div
                    style={{
                      background: '#fafafa',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong>
                        <ExperimentOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                        TDS
                      </Text>
                      <Space>
                        <Text strong style={{ fontSize: '16px' }}>
                          {typeof latestReading.tds === 'number' ? `${latestReading.tds.toFixed(0)} ppm` : '-'}
                        </Text>
                        {typeof latestReading.tds === 'number' && latestReading.tds_valid !== false ? (
                          <Tag color={getQualityStatus('tds', latestReading.tds).status}>
                            {getQualityStatus('tds', latestReading.tds).text}
                          </Tag>
                        ) : (
                          <SensorHealthIndicator 
                            sensor="tds" 
                            value={latestReading.tds} 
                            valid={latestReading.tds_valid}
                            mode="tag"
                          />
                        )}
                      </Space>
                    </div>
                    {typeof latestReading.tds === 'number' && latestReading.tds_valid !== false ? (
                      <>
                        <Progress
                          percent={getProgressPercent('tds', latestReading.tds)}
                          strokeColor={getProgressColor('tds', latestReading.tds)}
                          showInfo={false}
                          size="small"
                        />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          Optimal: {'<'} 300 ppm
                        </Text>
                      </>
                    ) : (
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Sensor needs attention
                      </Text>
                    )}
                  </div>
                </Col>

                {/* Turbidity */}
                <Col span={24}>
                  <div
                    style={{
                      background: '#fafafa',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text strong>
                        <ExperimentOutlined style={{ marginRight: 6, color: '#13c2c2' }} />
                        Turbidity
                      </Text>
                      <Space>
                        <Text strong style={{ fontSize: '16px' }}>
                          {typeof latestReading.turbidity === 'number' ? `${latestReading.turbidity.toFixed(2)} NTU` : '-'}
                        </Text>
                        {typeof latestReading.turbidity === 'number' && latestReading.turbidity_valid !== false ? (
                          <Tag color={getQualityStatus('turbidity', latestReading.turbidity).status}>
                            {getQualityStatus('turbidity', latestReading.turbidity).text}
                          </Tag>
                        ) : (
                          <SensorHealthIndicator 
                            sensor="turbidity" 
                            value={latestReading.turbidity} 
                            valid={latestReading.turbidity_valid}
                            mode="tag"
                          />
                        )}
                      </Space>
                    </div>
                    {typeof latestReading.turbidity === 'number' && latestReading.turbidity_valid !== false ? (
                      <>
                        <Progress
                          percent={getProgressPercent('turbidity', latestReading.turbidity)}
                          strokeColor={getProgressColor('turbidity', latestReading.turbidity)}
                          showInfo={false}
                          size="small"
                        />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          Optimal: {'<'} 1 NTU
                        </Text>
                      </>
                    ) : (
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Sensor needs attention
                      </Text>
                    )}
                  </div>
                </Col>
              </Row>

              {/* Timestamp */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 8 }}>
                <Tooltip title={formatTimestamp(latestReading.timestamp)}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <ClockCircleOutlined style={{ marginRight: 6 }} />
                    Last update: {new Date(latestReading.timestamp).toLocaleTimeString()}
                  </Text>
                </Tooltip>
              </div>

              {/* Active Alerts */}
              {activeAlerts.length > 0 && (
                <div
                  style={{
                    background: severityLevel === 'critical' ? '#fff2e8' : '#fffbe6',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${severityLevel === 'critical' ? '#ffbb96' : '#ffe58f'}`,
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <AlertOutlined
                      style={{
                        marginRight: 6,
                        color: severityLevel === 'critical' ? '#ff4d4f' : '#faad14',
                      }}
                    />
                    <Text strong>Active Alerts:</Text>
                  </div>
                  {activeAlerts.slice(0, 2).map((alert) => (
                    <div key={alert.alertId as string} style={{ marginBottom: 4 }}>
                      <Tag color={(alert.severity as string) === 'Critical' ? 'red' : 'orange'} style={{ marginBottom: 4 }}>
                        {alert.severity as string}
                      </Tag>
                      <Text style={{ fontSize: '12px' }}>{(alert.message as string) || 'Alert detected'}</Text>
                    </div>
                  ))}
                  {activeAlerts.length > 2 && (
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      +{activeAlerts.length - 2} more alert{activeAlerts.length - 2 > 1 ? 's' : ''}
                    </Text>
                  )}
                </div>
              )}
            </>
          ) : (
            <Empty
              description="No sensor data available"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '20px 0' }}
            />
          )}
        </Space>
      </Card>
    </Badge.Ribbon>
  );
});

DeviceCard.displayName = 'DeviceCard';
