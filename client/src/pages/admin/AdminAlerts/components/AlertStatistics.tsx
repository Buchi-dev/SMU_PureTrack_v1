import { Card, Statistic, Row, Col, Progress, Typography, Space } from 'antd';
import {
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import type { AlertStats } from '../hooks';

const { Text } = Typography;

interface AlertStatisticsProps {
  stats: AlertStats;
}

/**
 * Alert Statistics Cards Component
 * Displays key metrics about alerts with actionable insights
 */
export const AlertStatistics: React.FC<AlertStatisticsProps> = ({ stats }) => {
  const token = useThemeToken();

  const resolutionRate = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
  const criticalRate = stats.total > 0 ? (stats.critical / stats.total) * 100 : 0;

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
      {/* Total Alerts */}
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable>
          <Statistic
            title="Total Alerts"
            value={stats.total}
            prefix={<BellOutlined />}
            suffix={
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                all time
              </Text>
            }
          />
        </Card>
      </Col>

      {/* Active Alerts - Primary action area */}
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable style={{ borderColor: stats.active > 0 ? token.colorError : undefined }}>
          <Statistic
            title={
              <Space>
                <span>Active Alerts</span>
                {stats.active > 0 && <InfoCircleOutlined style={{ fontSize: 12, color: token.colorError }} />}
              </Space>
            }
            value={stats.active}
            valueStyle={{ color: stats.active > 0 ? token.colorError : token.colorSuccess }}
            prefix={<ExclamationCircleOutlined />}
          />
          {stats.active > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Requires attention
            </Text>
          )}
        </Card>
      </Col>

      {/* Critical Alerts */}
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable style={{ borderColor: stats.critical > 0 ? token.colorError : undefined }}>
          <Statistic
            title="Critical Alerts"
            value={stats.critical}
            valueStyle={{ color: token.colorError }}
            prefix={<WarningOutlined />}
          />
          <Progress
            percent={criticalRate}
            showInfo={false}
            strokeColor={token.colorError}
            size="small"
            style={{ marginTop: 8 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {criticalRate.toFixed(1)}% of total
          </Text>
        </Card>
      </Col>

      {/* Resolved Alerts */}
      <Col xs={24} sm={12} lg={6}>
        <Card hoverable>
          <Statistic
            title="Resolved"
            value={stats.resolved}
            valueStyle={{ color: token.colorSuccess }}
            prefix={<CheckCircleOutlined />}
          />
          <Progress
            percent={resolutionRate}
            showInfo={false}
            strokeColor={token.colorSuccess}
            size="small"
            style={{ marginTop: 8 }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {resolutionRate.toFixed(1)}% resolution rate
          </Text>
        </Card>
      </Col>

      {/* Acknowledged Alerts - Additional insight */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Acknowledged"
            value={stats.acknowledged}
            valueStyle={{ color: token.colorWarning }}
            prefix={<ClockCircleOutlined />}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            In progress
          </Text>
        </Card>
      </Col>

      {/* Warning Alerts */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Warning"
            value={stats.warning}
            valueStyle={{ color: token.colorWarning }}
            prefix={<WarningOutlined />}
          />
        </Card>
      </Col>

      {/* Advisory Alerts */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Advisory"
            value={stats.advisory}
            valueStyle={{ color: token.colorInfo }}
            prefix={<InfoCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};
