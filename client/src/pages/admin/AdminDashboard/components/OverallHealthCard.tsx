import { Card, Row, Col, Progress, Typography, Space, Statistic } from 'antd';
import { DashboardOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { SystemHealth } from '../../../../services/health.Service';
import type { WaterQualityAlert } from '../../../../schemas';
import {
  calculateServerHealthScore,
  HEALTH_COLORS,
} from '../config/healthThresholds';
import { calculateSystemHealth, getSystemHealthColor, getSystemHealthDescription } from '../utils';

const { Text, Title } = Typography;

interface OverallHealthCardProps {
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
  alerts: WaterQualityAlert[];
  systemHealth: SystemHealth | null;
  loading: boolean;
}

export const OverallHealthCard = memo<OverallHealthCardProps>(({ 
  deviceStats,
  alertStats,
  alerts,
  systemHealth,
  loading 
}) => {
  // Calculate Express server health score
  const serverScore: number = useMemo(() => {
    if (!systemHealth?.checks?.memory || !systemHealth?.checks?.database) return 0;
    
    const rssBytes = systemHealth.checks.memory.usage.rss * 1024 * 1024;
    const cpuPercent = 0;
    const healthStatus = systemHealth.status === 'OK' ? 'healthy' : systemHealth.status === 'DEGRADED' ? 'degraded' : 'unhealthy';
    
    return calculateServerHealthScore(
      rssBytes,
      cpuPercent,
      systemHealth.checks.database.status === 'OK',
      healthStatus
    );
  }, [systemHealth]);

  // Calculate overall system health
  const overallSystemHealth = useMemo(() => {
    return calculateSystemHealth(
      serverScore,
      deviceStats.online,
      deviceStats.total,
      alerts
    );
  }, [serverScore, deviceStats.online, deviceStats.total, alerts]);

  const healthColor = getSystemHealthColor(overallSystemHealth.status);
  const deviceAvailability = deviceStats.total > 0 
    ? Math.round((deviceStats.online / deviceStats.total) * 100) 
    : 0;

  return (
    <Row gutter={16}>
      {/* Overall System Health - Left (60%) */}
      <Col xs={24} lg={14}>
        <Card
          loading={loading}
          bordered={false}
          style={{
            background: `linear-gradient(135deg, ${healthColor}20 0%, ${healthColor}05 100%)`,
            borderRadius: 12,
            height: '100%',
            minHeight: 280,
          }}
        >
          <Row gutter={24} align="middle" style={{ height: '100%' }}>
            {/* Left side - Progress Circle */}
            <Col xs={24} md={10} style={{ textAlign: 'center' }}>
              <Progress
                type="dashboard"
                percent={overallSystemHealth.overallScore}
                strokeColor={healthColor}
                strokeWidth={12}
                size={200}
                format={(percent) => (
                  <div>
                    <div style={{ fontSize: 48, fontWeight: 'bold', color: healthColor }}>
                      {percent}%
                    </div>
                    <div style={{ fontSize: 16, color: '#666', marginTop: 8 }}>
                      {overallSystemHealth.status}
                    </div>
                  </div>
                )}
              />
            </Col>

            {/* Right side - Info */}
            <Col xs={24} md={14}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Space>
                    <DashboardOutlined style={{ fontSize: 32, color: healthColor }} />
                    <div>
                      <Title level={3} style={{ margin: 0 }}>
                        Overall System Health
                      </Title>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        {getSystemHealthDescription(overallSystemHealth.status)}
                      </Text>
                    </div>
                  </Space>
                </div>

                {/* Component Breakdown */}
                <div
                  style={{
                    padding: 16,
                    background: 'rgba(255,255,255,0.6)',
                    borderRadius: 8,
                  }}
                >
                  <Text strong style={{ fontSize: 12, color: '#666', textTransform: 'uppercase' }}>
                    Component Breakdown
                  </Text>
                  <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 12 }}>
                    <Row justify="space-between">
                      <Text>Express Server</Text>
                      <Space>
                        <Text strong style={{ color: healthColor }}>
                          {overallSystemHealth.components.expressServer.score}%
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          (60% weight)
                        </Text>
                      </Space>
                    </Row>
                    <Row justify="space-between">
                      <Text>Devices</Text>
                      <Space>
                        <Text strong style={{ color: healthColor }}>
                          {overallSystemHealth.components.devices.score}%
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ({deviceStats.online}/{deviceStats.total} online, 20% weight)
                        </Text>
                      </Space>
                    </Row>
                    <Row justify="space-between">
                      <Text>Alerts</Text>
                      <Space>
                        <Text strong style={{ color: healthColor }}>
                          {overallSystemHealth.components.alerts.score}%
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ({alertStats.total} total, 20% weight)
                        </Text>
                      </Space>
                    </Row>
                  </Space>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      </Col>

      {/* Quick Metrics - Right (40%) */}
      <Col xs={24} lg={10}>
        <Row gutter={[16, 16]}>
          {/* Server Uptime */}
          <Col xs={12} lg={12}>
            <Card bordered={false} style={{ height: '100%' }}>
              <Statistic
                title="Server Uptime"
                value={systemHealth ? Math.floor(systemHealth.uptime / 60) : 0}
                suffix="min"
                prefix={<ArrowUpOutlined style={{ color: HEALTH_COLORS.EXCELLENT }} />}
                valueStyle={{ color: HEALTH_COLORS.EXCELLENT, fontSize: 28 }}
              />
            </Card>
          </Col>

          {/* Response Time */}
          <Col xs={12} lg={12}>
            <Card bordered={false} style={{ height: '100%' }}>
              <Statistic
                title="API Response"
                value={systemHealth?.responseTime || 'N/A'}
                valueStyle={{ fontSize: 28 }}
              />
            </Card>
          </Col>

          {/* Device Availability */}
          <Col xs={12} lg={12}>
            <Card bordered={false} style={{ height: '100%' }}>
              <Statistic
                title="Device Availability"
                value={deviceAvailability}
                suffix="%"
                prefix={
                  deviceAvailability >= 80 
                    ? <ArrowUpOutlined style={{ color: HEALTH_COLORS.EXCELLENT }} />
                    : <ArrowDownOutlined style={{ color: HEALTH_COLORS.ERROR }} />
                }
                valueStyle={{ 
                  color: deviceAvailability >= 80 
                    ? HEALTH_COLORS.EXCELLENT 
                    : deviceAvailability >= 50 
                    ? HEALTH_COLORS.WARNING 
                    : HEALTH_COLORS.ERROR,
                  fontSize: 28
                }}
              />
            </Card>
          </Col>

          {/* Critical Alerts */}
          <Col xs={12} lg={12}>
            <Card bordered={false} style={{ height: '100%' }}>
              <Statistic
                title="Critical Alerts"
                value={alertStats.critical}
                suffix={`/ ${alertStats.active}`}
                prefix={
                  alertStats.critical > 0 
                    ? <ArrowDownOutlined style={{ color: HEALTH_COLORS.ERROR }} />
                    : <ArrowUpOutlined style={{ color: HEALTH_COLORS.EXCELLENT }} />
                }
                valueStyle={{ 
                  color: alertStats.critical > 0 ? HEALTH_COLORS.ERROR : HEALTH_COLORS.EXCELLENT,
                  fontSize: 28
                }}
              />
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  );
});

OverallHealthCard.displayName = 'OverallHealthCard';
