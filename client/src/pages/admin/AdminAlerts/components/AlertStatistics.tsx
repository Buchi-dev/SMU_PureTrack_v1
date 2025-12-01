import { Row, Col } from 'antd';
import {
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { StatsCard } from '../../../../components/staff';
import { useThemeToken } from '../../../../theme';
import type { AlertStats } from '../hooks';

interface AlertStatisticsProps {
  stats: AlertStats;
}

/**
 * Alert Statistics Cards Component
 * Displays key metrics about alerts with modern responsive design
 */
const AlertStatistics: React.FC<AlertStatisticsProps> = ({ stats }) => {
  const token = useThemeToken();

  const resolutionRate = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
  const criticalRate = stats.total > 0 ? (stats.critical / stats.total) * 100 : 0;

  return (
    <>
      {/* Main Alert Statistics */}
      <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        {/* Total Alerts */}
        <Col xs={24} sm={12} md={8} lg={6} xl={6}>
          <StatsCard
            title="Total Alerts"
            value={stats.total}
            icon={<BellOutlined />}
            color={token.colorInfo}
            description="All time"
            hoverable
          />
        </Col>

        {/* Active Alerts - Primary action area */}
        <Col xs={24} sm={12} md={8} lg={6} xl={6}>
          <StatsCard
            title="Active Alerts"
            value={stats.active}
            icon={<ExclamationCircleOutlined />}
            color={stats.active > 0 ? token.colorError : token.colorSuccess}
            description={stats.active > 0 ? "Requires attention" : "No active alerts"}
            hoverable
          />
        </Col>

        {/* Critical Alerts */}
        <Col xs={24} sm={12} md={8} lg={6} xl={6}>
          <StatsCard
            title="Critical Alerts"
            value={stats.critical}
            icon={<WarningOutlined />}
            color={token.colorError}
            description={`${criticalRate.toFixed(1)}% of total`}
            progress={Math.round(criticalRate)}
            hoverable
          />
        </Col>

        {/* Resolved Alerts */}
        <Col xs={24} sm={12} md={8} lg={6} xl={6}>
          <StatsCard
            title="Resolved"
            value={stats.resolved}
            icon={<CheckCircleOutlined />}
            color={token.colorSuccess}
            description={`${resolutionRate.toFixed(1)}% resolution rate`}
            progress={Math.round(resolutionRate)}
            hoverable
          />
        </Col>
      </Row>

      {/* Secondary Alert Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Acknowledged Alerts */}
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <StatsCard
            title="Acknowledged"
            value={stats.acknowledged}
            icon={<ClockCircleOutlined />}
            color={token.colorWarning}
            description="In progress"
            size="small"
          />
        </Col>

        {/* Warning Alerts */}
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <StatsCard
            title="Warning"
            value={stats.warning}
            icon={<WarningOutlined />}
            color="#d46b08"
            description="Medium priority"
            size="small"
          />
        </Col>

        {/* Advisory Alerts */}
        <Col xs={24} sm={12} md={8} lg={8} xl={8}>
          <StatsCard
            title="Advisory"
            value={stats.advisory}
            icon={<InfoCircleOutlined />}
            color="#096dd9"
            description="Low priority"
            size="small"
          />
        </Col>
      </Row>
    </>
  );
};

export default AlertStatistics;
