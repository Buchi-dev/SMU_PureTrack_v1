import { Space, Card, Progress, Typography } from 'antd';
import { 
  CloudServerOutlined,
  DashboardOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import { memo, useMemo, useState, useEffect } from 'react';
import { LiveMetricIndicator } from './LiveMetricIndicator';
import { RecentAlertsList } from './RecentAlertsList';
import { Row, Col } from 'antd';
import type { SystemHealthMetrics } from '../../../../services/health.Service';
import type { WaterQualityAlert } from '../../../../schemas';
import {
  calculateServerHealthScore,
  HEALTH_COLORS,
} from '../config/healthThresholds';
import { calculateSystemHealth, getSystemHealthColor, getSystemHealthDescription } from '../utils';
import { ALERT_STATUS, ALERT_SEVERITY } from '../../../../constants';

const { Text, Title } = Typography;

const MAX_HISTORY = 30; // Keep 30 data points for mini graphs

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
  alerts: WaterQualityAlert[];
  systemHealth: SystemHealthMetrics | null; // Express server health from /health endpoint
  loading: boolean;
}

export const DashboardSummary = memo<DashboardSummaryProps>(({ 
  deviceStats, 
  alerts,
  systemHealth,
  loading 
}) => {
  // Real-time metrics state for live indicators
  const [healthHistory, setHealthHistory] = useState<number[]>([]);

  // Calculate Express server health score using RSS and CPU
  const serverScore: number = useMemo(() => {
    if (!systemHealth?.memory || !systemHealth?.database) return 0;
    
    // Convert memory usage from GB to bytes
    const rssBytes = systemHealth.memory.usedGB * 1024 * 1024 * 1024;
    const cpuPercent = systemHealth.cpu.usagePercent;
    
    // Determine health status from systemHealth
    const healthStatus = systemHealth.overallStatus === 'ok' ? 'healthy' : systemHealth.overallStatus === 'warning' ? 'degraded' : 'unhealthy';
    
    return calculateServerHealthScore(
      rssBytes,
      cpuPercent,
      systemHealth.database.connectionStatus === 'connected',
      healthStatus
    );
  }, [systemHealth]);

  // Calculate overall system health using the new dynamic calculator
  const overallSystemHealth = useMemo(() => {
    return calculateSystemHealth(
      serverScore,            // Express server score (0-100) - 60% weight
      deviceStats.online,     // Online devices
      deviceStats.total,      // Total devices - 20% weight
      alerts                  // All alerts array - 20% weight
    );
  }, [serverScore, deviceStats.online, deviceStats.total, alerts]);

  // Track server health history for sparkline
  useEffect(() => {
    if (serverScore > 0) {
      setHealthHistory(prev => [...prev, serverScore].slice(-MAX_HISTORY));
    }
  }, [serverScore]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Main Metrics Layout: 1 Left | Overall Health Center | 3 Right */}
      <Row gutter={[16, 16]} align="stretch">
        {/* LEFT SIDE - Recent Alerts Only */}
        <Col xs={24} lg={7}>
          <div style={{ height: '100%' }}>
            {/* Recent Alerts List - Full Height */}
            <RecentAlertsList
              alerts={alerts}
              loading={loading}
              maxItems={10}
            />
          </div>
        </Col>

        {/* CENTER - Overall System Health (Larger) */}
        <Col xs={24} lg={10}>
          <Card 
            loading={loading}
            variant="outlined"
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              height: '100%',
              minHeight: '480px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${getSystemHealthColor(overallSystemHealth.status)}15 0%, ${getSystemHealthColor(overallSystemHealth.status)}05 100%)`
            }}
            styles={{
              body: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '32px',
                textAlign: 'center'
              }
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Header */}
              <div>
                <DashboardOutlined style={{ fontSize: '48px', color: getSystemHealthColor(overallSystemHealth.status) }} />
                <Title level={3} style={{ margin: '12px 0 4px 0' }}>Overall System Health</Title>
                <Text type="secondary" style={{ fontSize: '14px' }}>{getSystemHealthDescription(overallSystemHealth.status)}</Text>
              </div>

              {/* Large Health Gauge */}
              <div style={{ margin: '16px 0' }}>
                <Progress
                  type="dashboard"
                  percent={overallSystemHealth.overallScore}
                  strokeColor={getSystemHealthColor(overallSystemHealth.status)}
                  strokeWidth={10}
                  format={(percent) => (
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: '56px', color: getSystemHealthColor(overallSystemHealth.status), lineHeight: 1 }}>
                        {percent}%
                      </Text>
                      <Text type="secondary" style={{ fontSize: '18px', fontWeight: 500, marginTop: '8px' }}>
                        {overallSystemHealth.status}
                      </Text>
                    </Space>
                  )}
                  size={220}
                />
              </div>

              {/* Component Breakdown */}
              <div style={{ textAlign: 'left', width: '100%', marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  COMPONENT BREAKDOWN
                </Text>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {/* Express Server */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text style={{ fontSize: '13px' }}>Express Server</Text>
                      <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
                        ({Math.round(overallSystemHealth.components.expressServer.weight * 100)}% weight)
                      </Text>
                    </div>
                    <Text strong style={{ fontSize: '14px' }}>
                      {overallSystemHealth.components.expressServer.score}% → +{overallSystemHealth.components.expressServer.contribution}
                    </Text>
                  </div>

                  {/* Devices */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text style={{ fontSize: '13px' }}>Devices</Text>
                      <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
                        ({overallSystemHealth.components.devices.online}/{overallSystemHealth.components.devices.total} online, {Math.round(overallSystemHealth.components.devices.weight * 100)}% weight)
                      </Text>
                    </div>
                    <Text strong style={{ fontSize: '14px' }}>
                      {overallSystemHealth.components.devices.score}% → +{overallSystemHealth.components.devices.contribution}
                    </Text>
                  </div>

                  {/* Alerts */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text style={{ fontSize: '13px' }}>Alerts</Text>
                      <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
                        ({overallSystemHealth.components.alerts.breakdown.totalAlerts} total, {Math.round(overallSystemHealth.components.alerts.weight * 100)}% weight)
                      </Text>
                    </div>
                    <Text strong style={{ fontSize: '14px' }}>
                      {overallSystemHealth.components.alerts.score}% → +{overallSystemHealth.components.alerts.contribution}
                    </Text>
                  </div>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>

        {/* RIGHT SIDE - Server & System Metrics */}
        <Col xs={24} lg={7}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            height: '100%' 
          }}>
            {/* Server Health */}
            <div style={{ flex: 1 }}>
              <LiveMetricIndicator
                title="Server Health"
                currentValue={serverScore}
                totalValue={100}
                icon={<CloudServerOutlined />}
                color={
                  serverScore >= 80 ? HEALTH_COLORS.EXCELLENT :
                  serverScore >= 60 ? HEALTH_COLORS.GOOD :
                  serverScore >= 40 ? HEALTH_COLORS.WARNING :
                  HEALTH_COLORS.CRITICAL
                }
                unit="%"
                subtitle={
                  systemHealth?.memory
                    ? `${systemHealth.memory.usedGB.toFixed(2)}GB RAM`
                    : systemHealth?.database?.connectionStatus === 'connected' ? 'Connected' : 'Disconnected'
                }
                dataHistory={healthHistory}
                tooltip={
                  systemHealth
                    ? `Status: ${systemHealth.overallStatus}\nDatabase: ${systemHealth.database?.connectionStatus || 'Unknown'}\nCPU: ${systemHealth.cpu?.usagePercent || 0}%\nMemory: ${systemHealth.memory?.usedGB.toFixed(2) || 0}GB\nHealth Score: ${serverScore}%`
                    : `Express Server: unknown`
                }
                loading={loading}
              />
            </div>
            
            {/* Devices Online */}
            <div style={{ flex: 1 }}>
              <LiveMetricIndicator
                title="Devices Online"
                currentValue={deviceStats.online}
                totalValue={deviceStats.total}
                icon={<DashboardOutlined />}
                color={
                  deviceStats.total > 0 && (deviceStats.online / deviceStats.total) >= 0.8 ? HEALTH_COLORS.EXCELLENT :
                  deviceStats.total > 0 && (deviceStats.online / deviceStats.total) >= 0.5 ? HEALTH_COLORS.WARNING :
                  HEALTH_COLORS.CRITICAL
                }
                subtitle={`${deviceStats.total} total devices`}
                tooltip={`${deviceStats.online} of ${deviceStats.total} devices are online (${deviceStats.total > 0 ? Math.round((deviceStats.online / deviceStats.total) * 100) : 0}%)`}
                loading={loading}
              />
            </div>
            
            {/* Active Alerts */}
            <div style={{ flex: 1 }}>
              <LiveMetricIndicator
                title="Active Alerts"
                currentValue={alerts.filter(a => a.status === ALERT_STATUS.UNACKNOWLEDGED).length}
                totalValue={alerts.length}
                icon={<ArrowUpOutlined />}
                color={
                  alerts.filter(a => a.status === ALERT_STATUS.UNACKNOWLEDGED && a.severity === ALERT_SEVERITY.CRITICAL).length > 0 ? HEALTH_COLORS.ERROR :
                  alerts.filter(a => a.status === ALERT_STATUS.UNACKNOWLEDGED && a.severity === ALERT_SEVERITY.WARNING).length > 0 ? HEALTH_COLORS.WARNING :
                  HEALTH_COLORS.EXCELLENT
                }
                subtitle={`${alerts.length} total alerts`}
                tooltip={`${alerts.filter(a => a.status === ALERT_STATUS.UNACKNOWLEDGED).length} active alerts out of ${alerts.length} total`}
                loading={loading}
              />
            </div>
          </div>
        </Col>
      </Row>
    </Space>
  );
});

DashboardSummary.displayName = 'DashboardSummary';
