/**
 * KeyMetrics Component
 * 
 * Displays key system metrics in card format:
 * - Total Devices
 * - System Health (synchronized with AdminDashboard)
 * - Total Readings
 * - Active Alerts
 */
import { Row, Col, Card, Statistic, Typography, Progress } from 'antd';
import {
  ApiOutlined,
  DashboardOutlined,
  LineChartOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import { useThemeToken } from '../../../../theme';
import type { DeviceStats, AlertStats, WaterQualityMetrics, SystemHealth } from '../hooks';

const { Text } = Typography;

interface KeyMetricsProps {
  systemHealth: SystemHealth;
  deviceStats: DeviceStats;
  alertStats: AlertStats;
  waterQualityMetrics: WaterQualityMetrics;
  loading?: boolean;
}

export const KeyMetrics = memo<KeyMetricsProps>(({ 
  systemHealth, 
  deviceStats, 
  alertStats,
  waterQualityMetrics,
  loading = false 
}) => {
  const token = useThemeToken();

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <Card loading={loading}>
          <Statistic
            title="Total Devices"
            value={deviceStats.total}
            prefix={<ApiOutlined />}
            valueStyle={{ color: token.colorInfo }}
          />
          <Text type="secondary">
            {deviceStats.online} online, {deviceStats.offline} offline
          </Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <Card loading={loading}>
          <Statistic
            title="System Health"
            value={systemHealth.overallScore}
            precision={1}
            suffix="%"
            prefix={<DashboardOutlined />}
            valueStyle={{ 
              color: systemHealth.color
            }}
          />
          <Progress 
            percent={systemHealth.overallScore} 
            showInfo={false}
            strokeColor={systemHealth.color}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {systemHealth.status} - Synced with Dashboard
          </Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <Card loading={loading}>
          <Statistic
            title="Total Readings"
            value={waterQualityMetrics.totalReadings}
            prefix={<LineChartOutlined />}
            valueStyle={{ color: token.colorPrimary }}
          />
          <Text type="secondary">From {deviceStats.withReadings} devices</Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <Card loading={loading}>
          <Statistic
            title="Active Alerts"
            value={alertStats.active}
            prefix={<WarningOutlined />}
            valueStyle={{ 
              color: alertStats.active > 0 ? token.colorError : token.colorSuccess 
            }}
          />
          <Text type="secondary">
            {alertStats.critical} critical, {alertStats.warning} warning
          </Text>
        </Card>
      </Col>
    </Row>
  );
});

KeyMetrics.displayName = 'KeyMetrics';
