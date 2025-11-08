import { Card, Space, Typography, Row, Col, Progress, Tooltip, Statistic } from 'antd';
import { 
  DashboardOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  HddOutlined
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import {
  calculateAlertHealthScore,
  calculateRAMHealthScore,
  calculateOverallSystemHealth,
  getOverallHealth,
  HEALTH_COLORS,
} from '../config';

const { Text, Title } = Typography;

interface SystemHealthCardProps {
  deviceStats: {
    total: number;
    online: number;
    offline: number;
  };
  alertStats: {
    total: number;
    active: number;
    critical: number;
  };
  mqttHealth: {
    status: 'healthy' | 'unhealthy';
    connected: boolean;
  } | null;
  ramUsage?: {
    used: number;
    total: number;
    percent: number;
  } | null;
  loading: boolean;
}

export const SystemHealthCard = memo<SystemHealthCardProps>(({ 
  deviceStats, 
  alertStats, 
  mqttHealth,
  ramUsage,
  loading 
}) => {
  // Calculate component health scores using centralized functions
  const deviceHealth = useMemo(() => {
    if (!deviceStats || deviceStats.total === 0) return 100;
    return Math.round((deviceStats.online / deviceStats.total) * 100);
  }, [deviceStats]);

  const alertHealth = useMemo(() => 
    calculateAlertHealthScore(
      alertStats?.total ?? 0,
      alertStats?.active ?? 0,
      alertStats?.critical ?? 0
    ),
    [alertStats]
  );

  const mqttHealth_score = useMemo(() => {
    if (!mqttHealth) return 0;
    if (mqttHealth.status === 'healthy' && mqttHealth.connected) return 100;
    if (mqttHealth.connected) return 50;
    return 0;
  }, [mqttHealth]);

  const ramHealth = useMemo(() => {
    if (!ramUsage) return 100;
    return calculateRAMHealthScore(ramUsage.used, ramUsage.total);
  }, [ramUsage]);

  // Overall health calculation using centralized function
  const overallHealthScore = useMemo(() => 
    calculateOverallSystemHealth(
      deviceHealth,
      alertHealth,
      mqttHealth_score,
      ramHealth
    ),
    [deviceHealth, alertHealth, mqttHealth_score, ramHealth]
  );

  // Get health data using centralized function
  const overallHealthData = useMemo(() => 
    getOverallHealth(overallHealthScore),
    [overallHealthScore]
  );

  const getHealthColor = (percent: number) => {
    if (percent >= 80) return HEALTH_COLORS.EXCELLENT;
    if (percent >= 60) return HEALTH_COLORS.GOOD;
    if (percent >= 40) return HEALTH_COLORS.CRITICAL;
    return HEALTH_COLORS.ERROR;
  };

  const formatBytes = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  return (
    <Card 
      loading={loading}
      bordered={false}
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size="small">
            <DashboardOutlined style={{ fontSize: '28px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Overall System Health</Title>
            <Text type="secondary">Real-time monitoring across all systems</Text>
          </Space>
        </div>

        {/* Main Health Gauge */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Progress
            type="dashboard"
            percent={overallHealthScore}
            strokeColor={overallHealthData.color}
            strokeWidth={12}
            format={(percent) => (
              <Space direction="vertical" size={0}>
                <Text strong style={{ fontSize: '48px', color: overallHealthData.color }}>
                  {percent}%
                </Text>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  {overallHealthData.statusText}
                </Text>
              </Space>
            )}
            size={220}
          />
        </div>

        {/* Component Health Breakdown */}
        <Row gutter={[16, 16]}>
          {/* Device Health */}
          <Col xs={24} sm={12}>
            <Tooltip title={`${deviceStats.online} of ${deviceStats.total} devices online`}>
              <Card 
                size="small"
                style={{ 
                  backgroundColor: '#fafafa',
                  borderLeft: `4px solid ${getHealthColor(deviceHealth)}`
                }}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <DatabaseOutlined style={{ fontSize: '20px', color: getHealthColor(deviceHealth) }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Devices</Text>
                      <div>
                        <Text strong style={{ fontSize: '16px' }}>{deviceHealth}%</Text>
                      </div>
                    </div>
                  </Space>
                  <Progress 
                    type="circle" 
                    percent={deviceHealth} 
                    strokeColor={getHealthColor(deviceHealth)}
                    width={40}
                    format={() => ''}
                  />
                </Space>
              </Card>
            </Tooltip>
          </Col>

          {/* Alert Health */}
          <Col xs={24} sm={12}>
            <Tooltip title={`${alertStats.active} active alerts (${alertStats.critical} critical)`}>
              <Card 
                size="small"
                style={{ 
                  backgroundColor: '#fafafa',
                  borderLeft: `4px solid ${getHealthColor(alertHealth)}`
                }}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <ThunderboltOutlined style={{ fontSize: '20px', color: getHealthColor(alertHealth) }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Alerts</Text>
                      <div>
                        <Text strong style={{ fontSize: '16px' }}>{alertHealth}%</Text>
                      </div>
                    </div>
                  </Space>
                  <Progress 
                    type="circle" 
                    percent={alertHealth} 
                    strokeColor={getHealthColor(alertHealth)}
                    width={40}
                    format={() => ''}
                  />
                </Space>
              </Card>
            </Tooltip>
          </Col>

          {/* MQTT Health */}
          <Col xs={24} sm={12}>
            <Tooltip title={`MQTT Bridge: ${mqttHealth?.status || 'unknown'} - ${mqttHealth?.connected ? 'connected' : 'disconnected'}`}>
              <Card 
                size="small"
                style={{ 
                  backgroundColor: '#fafafa',
                  borderLeft: `4px solid ${getHealthColor(mqttHealth_score)}`
                }}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <CloudServerOutlined style={{ fontSize: '20px', color: getHealthColor(mqttHealth_score) }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>MQTT Bridge</Text>
                      <div>
                        <Text strong style={{ fontSize: '16px' }}>{mqttHealth_score}%</Text>
                      </div>
                    </div>
                  </Space>
                  <Progress 
                    type="circle" 
                    percent={mqttHealth_score} 
                    strokeColor={getHealthColor(mqttHealth_score)}
                    width={40}
                    format={() => ''}
                  />
                </Space>
              </Card>
            </Tooltip>
          </Col>

          {/* RAM Health */}
          <Col xs={24} sm={12}>
            <Tooltip 
              title={
                ramUsage 
                  ? `RAM: ${formatBytes(ramUsage.used)}MB / ${formatBytes(ramUsage.total)}MB (${ramUsage.percent}%)`
                  : 'RAM usage data not available'
              }
            >
              <Card 
                size="small"
                style={{ 
                  backgroundColor: '#fafafa',
                  borderLeft: `4px solid ${getHealthColor(ramHealth)}`
                }}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <HddOutlined style={{ fontSize: '20px', color: getHealthColor(ramHealth) }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>RAM Usage</Text>
                      <div>
                        <Text strong style={{ fontSize: '16px' }}>
                          {ramUsage ? `${ramUsage.percent}%` : 'N/A'}
                        </Text>
                      </div>
                    </div>
                  </Space>
                  <Progress 
                    type="circle" 
                    percent={ramUsage?.percent || 0} 
                    strokeColor={getHealthColor(ramHealth)}
                    width={40}
                    format={() => ''}
                  />
                </Space>
              </Card>
            </Tooltip>
          </Col>
        </Row>

        {/* Detailed RAM Stats */}
        {ramUsage && (
          <Card 
            size="small" 
            style={{ backgroundColor: '#f0f5ff' }}
            title={<Text strong><HddOutlined /> Memory Details</Text>}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Used"
                  value={formatBytes(ramUsage.used)}
                  suffix="MB"
                  valueStyle={{ fontSize: '16px', color: getHealthColor(100 - ramUsage.percent) }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Total"
                  value={formatBytes(ramUsage.total)}
                  suffix="MB"
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Available"
                  value={formatBytes(ramUsage.total - ramUsage.used)}
                  suffix="MB"
                  valueStyle={{ fontSize: '16px', color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        )}
      </Space>
    </Card>
  );
});

SystemHealthCard.displayName = 'SystemHealthCard';
