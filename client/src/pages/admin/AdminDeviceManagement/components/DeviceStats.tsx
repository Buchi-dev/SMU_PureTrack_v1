import { Row, Col } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import { StatsCard } from '../../../../components/staff';

interface DeviceStatsProps {
  stats: {
    total: number;
    online: number;
    offline: number;
    registered: number;
    unregistered: number;
  };
}

export const DeviceStats = ({ stats }: DeviceStatsProps) => {
  const token = useThemeToken();

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <StatsCard
          title="Total Devices"
          value={stats.total}
          icon={<DashboardOutlined />}
          color={token.colorInfo}
          description="All devices"
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <StatsCard
          title="Online"
          value={stats.online}
          icon={<CheckCircleOutlined />}
          color={token.colorSuccess}
          description="Active devices"
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <StatsCard
          title="Offline"
          value={stats.offline}
          icon={<CloseCircleOutlined />}
          color={token.colorTextSecondary}
          description="Inactive devices"
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <StatsCard
          title="Registered"
          value={stats.registered}
          icon={<CheckCircleOutlined />}
          color={token.colorSuccess}
          description="Fully registered"
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <StatsCard
          title="Unregistered"
          value={stats.unregistered}
          icon={<InfoCircleOutlined />}
          color={token.colorWarning}
          description="Pending registration"
          size="small"
        />
      </Col>
    </Row>
  );
};
