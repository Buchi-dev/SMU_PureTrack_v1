import { Row, Col, Progress, Typography, Space } from 'antd';
import { DashboardOutlined } from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { SystemHealthMetrics } from '../../../../services/health.Service';
import type { WaterQualityAlert } from '../../../../schemas';
import { HEALTH_COLORS } from '../config/healthThresholds';
import { calculateSystemHealth, getSystemHealthColor } from '../utils';
import { ResponsiveCard } from '../../../../components';
import { useResponsive } from '../../../../hooks';

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
  systemHealth: SystemHealthMetrics | null;
  loading: boolean;
}

export const OverallHealthCard = memo<OverallHealthCardProps>(({ 
  deviceStats,
  alertStats,
  alerts,
  systemHealth,
  loading 
}) => {
  const { isMobile } = useResponsive();
  // Calculate Express server health score using the new SystemHealthMetrics
  const serverScore: number = useMemo(() => {
    if (!systemHealth?.memory || !systemHealth?.database || !systemHealth?.cpu) return 0;
    
    // Calculate component scores
    const cpuScore = systemHealth.cpu.status === 'ok' ? 100 : 
                     systemHealth.cpu.status === 'warning' ? 70 : 
                     systemHealth.cpu.status === 'critical' ? 30 : 0;
    
    const memoryScore = systemHealth.memory.status === 'ok' ? 100 : 
                        systemHealth.memory.status === 'warning' ? 70 : 
                        systemHealth.memory.status === 'critical' ? 30 : 0;
    
    const storageScore = systemHealth.storage.status === 'ok' ? 100 : 
                         systemHealth.storage.status === 'warning' ? 70 : 
                         systemHealth.storage.status === 'critical' ? 30 : 0;
    
    const databaseScore = systemHealth.database.connectionStatus === 'connected' ? 100 : 0;
    
    // Weighted average: CPU(30%), Memory(30%), Storage(20%), Database(20%)
    const weightedScore = (cpuScore * 0.3) + (memoryScore * 0.3) + (storageScore * 0.2) + (databaseScore * 0.2);
    
    return Math.round(weightedScore);
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

  // Generate critical issues description
  const criticalIssuesText = useMemo(() => {
    const issues: string[] = [];
    
    if (systemHealth) {
      if (systemHealth.cpu.status === 'critical' || systemHealth.cpu.status === 'error') {
        issues.push('High CPU usage');
      }
      if (systemHealth.memory.status === 'critical' || systemHealth.memory.status === 'error') {
        issues.push('High memory usage');
      }
      if (systemHealth.storage.status === 'critical' || systemHealth.storage.status === 'error') {
        issues.push('Low storage space');
      }
      if (systemHealth.database.connectionStatus === 'disconnected') {
        issues.push('Database disconnected');
      }
    }
    
    if (deviceStats.offline > 0) {
      issues.push(`${deviceStats.offline} device${deviceStats.offline > 1 ? 's' : ''} offline`);
    }
    
    if (alertStats.critical > 0) {
      issues.push(`${alertStats.critical} critical alert${alertStats.critical > 1 ? 's' : ''}`);
    }
    
    if (issues.length === 0) {
      return 'All systems operational';
    }
    
    return issues.join(', ');
  }, [systemHealth, deviceStats, alertStats]);

  return (
    <ResponsiveCard
      loading={loading}
      bordered={false}
      compactMobile
      style={{
        background: `linear-gradient(135deg, ${healthColor}20 0%, ${healthColor}05 100%)`,
        borderRadius: 12,
        height: '100%',
      }}
    >
      <Row gutter={isMobile ? [8, 16] : [24, 24]} align="middle">
        {/* Left side - Progress Circle */}
        <Col xs={24} md={8} style={{ textAlign: 'center' }}>
          <Progress
            type="dashboard"
            percent={overallSystemHealth.overallScore}
            strokeColor={healthColor}
            strokeWidth={isMobile ? 10 : 12}
            size={isMobile ? 160 : 200}
            format={(percent) => (
              <div>
                <div style={{ fontSize: isMobile ? 36 : 48, fontWeight: 'bold', color: healthColor }}>
                  {percent}%
                </div>
                <div style={{ fontSize: isMobile ? 13 : 16, color: '#666', marginTop: isMobile ? 4 : 8 }}>
                  {overallSystemHealth.status}
                </div>
              </div>
            )}
          />
        </Col>

        {/* Right side - Info & Component Breakdown */}
        <Col xs={24} md={16}>
          <Space direction="vertical" size={isMobile ? 'small' : 'middle'} style={{ width: '100%' }}>
            <div>
              <Space align="start">
                <DashboardOutlined style={{ fontSize: isMobile ? 24 : 32, color: healthColor }} />
                <div>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0, lineHeight: 1.2 }}>
                    Overall System Health
                  </Title>
                  <Text 
                    type={overallSystemHealth.status === 'Healthy' ? 'secondary' : 'warning'} 
                    style={{ 
                      fontSize: isMobile ? 12 : 13,
                      display: 'block',
                      marginTop: 4,
                      color: overallSystemHealth.status === 'Healthy' ? '#52c41a' : 
                             overallSystemHealth.status === 'Degraded' ? '#faad14' : '#ff4d4f'
                    }}
                  >
                    {criticalIssuesText}
                  </Text>
                </div>
              </Space>
            </div>

                {/* Component Breakdown */}
                <div
                  style={{
                    padding: isMobile ? 12 : 20,
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <Space direction="vertical" size={isMobile ? 'small' : 'middle'} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text strong style={{ fontSize: isMobile ? 11 : 13, color: '#595959', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Component Breakdown
                      </Text>
                      <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                        Weighted Calculation
                      </Text>
                    </div>
                    
                    {/* Express Server */}
                    <div style={{ 
                      padding: isMobile ? '8px 10px' : '12px 14px', 
                      background: '#fafafa', 
                      borderRadius: 8,
                      border: '1px solid #f0f0f0'
                    }}>
                      <Row justify="space-between" align="middle" style={{ marginBottom: isMobile ? 4 : 8 }}>
                        <Col>
                          <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>Express Server</Text>
                        </Col>
                        <Col>
                          <Space size="small">
                            <Text strong style={{ color: healthColor, fontSize: isMobile ? 14 : 18 }}>
                              {overallSystemHealth.components.expressServer.score}%
                            </Text>
                            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11 }}>
                              (60%)
                            </Text>
                          </Space>
                        </Col>
                      </Row>
                      {systemHealth && (
                        <Row gutter={isMobile ? 4 : 8} style={{ marginTop: isMobile ? 4 : 8 }}>
                          <Col span={6}>
                            <div style={{ textAlign: 'center', padding: isMobile ? 4 : 6, background: '#fff', borderRadius: 6 }}>
                              <Text type="secondary" style={{ fontSize: isMobile ? 9 : 10, display: 'block' }}>CPU</Text>
                              <Text strong style={{ fontSize: isMobile ? 11 : 12, color: systemHealth.cpu.status === 'ok' ? HEALTH_COLORS.EXCELLENT : HEALTH_COLORS.WARNING }}>
                                {systemHealth.cpu.usagePercent.toFixed(0)}%
                              </Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div style={{ textAlign: 'center', padding: isMobile ? 4 : 6, background: '#fff', borderRadius: 6 }}>
                              <Text type="secondary" style={{ fontSize: isMobile ? 9 : 10, display: 'block' }}>RAM</Text>
                              <Text strong style={{ fontSize: isMobile ? 11 : 12, color: systemHealth.memory.status === 'ok' ? HEALTH_COLORS.EXCELLENT : HEALTH_COLORS.WARNING }}>
                                {systemHealth.memory.usagePercent.toFixed(0)}%
                              </Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div style={{ textAlign: 'center', padding: isMobile ? 4 : 6, background: '#fff', borderRadius: 6 }}>
                              <Text type="secondary" style={{ fontSize: isMobile ? 9 : 10, display: 'block' }}>Disk</Text>
                              <Text strong style={{ fontSize: isMobile ? 11 : 12, color: systemHealth.storage.status === 'ok' ? HEALTH_COLORS.EXCELLENT : HEALTH_COLORS.WARNING }}>
                                {systemHealth.storage.usagePercent.toFixed(0)}%
                              </Text>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div style={{ textAlign: 'center', padding: isMobile ? 4 : 6, background: '#fff', borderRadius: 6 }}>
                              <Text type="secondary" style={{ fontSize: isMobile ? 9 : 10, display: 'block' }}>DB</Text>
                              <Text strong style={{ fontSize: isMobile ? 11 : 12, color: systemHealth.database.connectionStatus === 'connected' ? HEALTH_COLORS.EXCELLENT : HEALTH_COLORS.ERROR }}>
                                {systemHealth.database.connectionStatus === 'connected' ? '✓' : '✗'}
                              </Text>
                            </div>
                          </Col>
                        </Row>
                      )}
                    </div>
                    
                    {/* Devices */}
                    <div style={{ 
                      padding: isMobile ? '8px 10px' : '12px 14px', 
                      background: '#fafafa', 
                      borderRadius: 8,
                      border: '1px solid #f0f0f0'
                    }}>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>Devices</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                            {deviceStats.online}/{deviceStats.total} online
                          </Text>
                        </Col>
                        <Col>
                          <Space size="small">
                            <Text strong style={{ color: healthColor, fontSize: isMobile ? 14 : 18 }}>
                              {overallSystemHealth.components.devices.score}%
                            </Text>
                            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11 }}>
                              (20%)
                            </Text>
                          </Space>
                        </Col>
                      </Row>
                      <Progress 
                        percent={overallSystemHealth.components.devices.score} 
                        strokeColor={healthColor}
                        showInfo={false}
                        size="small"
                        style={{ marginTop: isMobile ? 4 : 8 }}
                      />
                    </div>
                    
                    {/* Alerts */}
                    <div style={{ 
                      padding: isMobile ? '8px 10px' : '12px 14px', 
                      background: '#fafafa', 
                      borderRadius: 8,
                      border: '1px solid #f0f0f0'
                    }}>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Text strong style={{ fontSize: isMobile ? 12 : 14 }}>Alerts</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                            {alertStats.critical} critical, {alertStats.active} active
                          </Text>
                        </Col>
                        <Col>
                          <Space size="small">
                            <Text strong style={{ color: healthColor, fontSize: isMobile ? 14 : 18 }}>
                              {overallSystemHealth.components.alerts.score}%
                            </Text>
                            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 11 }}>
                              (20%)
                            </Text>
                          </Space>
                        </Col>
                      </Row>
                      <Progress 
                        percent={overallSystemHealth.components.alerts.score} 
                        strokeColor={healthColor}
                        showInfo={false}
                        size="small"
                        style={{ marginTop: isMobile ? 4 : 8 }}
                      />
                    </div>
                  </Space>
                </div>
              </Space>
            </Col>
          </Row>
        </ResponsiveCard>
  );
});

OverallHealthCard.displayName = 'OverallHealthCard';
