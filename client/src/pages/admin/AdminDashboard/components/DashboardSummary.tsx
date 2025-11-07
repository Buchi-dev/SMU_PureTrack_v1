import { Card, Row, Col, Statistic, Progress, Space, Typography, Divider } from 'antd';
import { 
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BellOutlined,
  CloudServerOutlined,
  ExperimentOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { memo, useMemo } from 'react';

const { Text, Title } = Typography;

interface DashboardSummaryProps {
  deviceStats: {
    total: number;
    online: number;
    offline: number;
    withReadings: number;
  };
  alertStats: {
    total: number;
    active: number;
    critical: number;
    warning: number;
    advisory: number;
  };
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

export const DashboardSummary = memo<DashboardSummaryProps>(({ 
  deviceStats, 
  alertStats, 
  mqttHealth,
  loading 
}) => {
  // DEFENSIVE: Validate input data before calculations
  // Prevent 0% flashes when data is temporarily null/undefined
  const safeDeviceStats = useMemo(() => ({
    total: deviceStats?.total ?? 0,
    online: deviceStats?.online ?? 0,
    offline: deviceStats?.offline ?? 0,
    withReadings: deviceStats?.withReadings ?? 0,
  }), [deviceStats]);

  const safeAlertStats = useMemo(() => ({
    total: alertStats?.total ?? 0,
    active: alertStats?.active ?? 0,
    critical: alertStats?.critical ?? 0,
    warning: alertStats?.warning ?? 0,
    advisory: alertStats?.advisory ?? 0,
  }), [alertStats]);

  // Calculate health percentages with defensive checks
  const deviceHealthPercent = useMemo(() => {
    if (!safeDeviceStats || safeDeviceStats.total === 0) return 0;
    return Math.round((safeDeviceStats.online / safeDeviceStats.total) * 100);
  }, [safeDeviceStats]);

  const alertHealthPercent = useMemo(() => {
    if (!safeAlertStats) return 100; // No data = assume healthy
    if (safeAlertStats.total === 0) return 100; // No alerts is good
    return Math.max(0, 100 - Math.round((safeAlertStats.active / safeAlertStats.total) * 100));
  }, [safeAlertStats]);

  const mqttHealthPercent = useMemo(() => {
    if (!mqttHealth) return 0;
    return mqttHealth.status === 'healthy' && mqttHealth.connected ? 100 : 0;
  }, [mqttHealth]);

  // Overall system health - defensive calculation
  const overallHealth = useMemo(() => {
    // Don't calculate if we have no valid data at all
    if (!safeDeviceStats || !safeAlertStats || !mqttHealth) return 0;
    return Math.round((deviceHealthPercent + alertHealthPercent + mqttHealthPercent) / 3);
  }, [deviceHealthPercent, alertHealthPercent, mqttHealthPercent, safeDeviceStats, safeAlertStats, mqttHealth]);

  const getHealthColor = (percent: number) => {
    if (percent >= 80) return '#52c41a'; // Green
    if (percent >= 50) return '#faad14'; // Yellow
    return '#ff4d4f'; // Red
  };

  const getHealthStatus = (percent: number) => {
    if (percent >= 80) return 'Excellent';
    if (percent >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Overall System Health */}
      <Card loading={loading}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={12}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Title level={3} style={{ margin: 0 }}>Overall System Health</Title>
              <Text type="secondary">Real-time monitoring across all systems</Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="dashboard"
                percent={overallHealth}
                strokeColor={getHealthColor(overallHealth)}
                format={(percent) => (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: '32px' }}>{percent}%</Text>
                    <Text type="secondary">{getHealthStatus(percent || 0)}</Text>
                  </Space>
                )}
                size={180}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Detailed Stats Grid */}
      <Row gutter={[16, 16]}>
        {/* Device Statistics */}
        <Col xs={24} md={8}>
          <Card 
            title={
              <Space>
                <DatabaseOutlined />
                <span>Device Status</span>
              </Space>
            }
            loading={loading}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Statistic
                title="Total Devices"
                value={safeDeviceStats.total}
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <Divider style={{ margin: '8px 0' }} />
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Online"
                    value={safeDeviceStats.online}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Offline"
                    value={safeDeviceStats.offline}
                    prefix={<CloseCircleOutlined />}
                    valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
                  />
                </Col>
              </Row>
              <Progress 
                percent={deviceHealthPercent} 
                strokeColor={getHealthColor(deviceHealthPercent)}
                format={(percent) => `${percent}% Healthy`}
              />
            </Space>
          </Card>
        </Col>

        {/* Alert Statistics */}
        <Col xs={24} md={8}>
          <Card 
            title={
              <Space>
                <BellOutlined />
                <span>Alert Status</span>
              </Space>
            }
            loading={loading}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Statistic
                title="Total Alerts"
                value={safeAlertStats.total}
                prefix={<BellOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <Divider style={{ margin: '8px 0' }} />
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Critical"
                    value={safeAlertStats.critical}
                    valueStyle={{ color: '#cf1322', fontSize: '18px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Warning"
                    value={safeAlertStats.warning}
                    valueStyle={{ color: '#faad14', fontSize: '18px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Advisory"
                    value={safeAlertStats.advisory}
                    valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                  />
                </Col>
              </Row>
              <Progress 
                percent={alertHealthPercent} 
                strokeColor={getHealthColor(alertHealthPercent)}
                status={safeAlertStats.active > 0 ? 'exception' : 'success'}
                format={() => `${safeAlertStats.active} Active`}
              />
            </Space>
          </Card>
        </Col>

        {/* MQTT Bridge Statistics */}
        <Col xs={24} md={8}>
          <Card 
            title={
              <Space>
                <CloudServerOutlined />
                <span>MQTT Bridge</span>
              </Space>
            }
            loading={loading}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Statistic
                title="Status"
                value={mqttHealth?.status || 'Unknown'}
                valueStyle={{ 
                  color: mqttHealth?.status === 'healthy' ? '#52c41a' : '#ff4d4f',
                  textTransform: 'capitalize'
                }}
              />
              <Divider style={{ margin: '8px 0' }} />
              {mqttHealth?.metrics && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Received"
                      value={mqttHealth.metrics.received}
                      prefix={<ThunderboltOutlined />}
                      valueStyle={{ fontSize: '18px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Published"
                      value={mqttHealth.metrics.published}
                      prefix={<ExperimentOutlined />}
                      valueStyle={{ fontSize: '18px' }}
                    />
                  </Col>
                </Row>
              )}
              <Progress 
                percent={mqttHealthPercent} 
                strokeColor={getHealthColor(mqttHealthPercent)}
                status={mqttHealth?.connected ? 'success' : 'exception'}
                format={() => mqttHealth?.connected ? 'Connected' : 'Disconnected'}
              />
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
});

DashboardSummary.displayName = 'DashboardSummary';
