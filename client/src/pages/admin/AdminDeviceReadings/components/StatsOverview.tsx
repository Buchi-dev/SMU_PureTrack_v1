import { Row, Col } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import { StatsCard } from '../../../../components/staff';
import { useThemeToken } from '../../../../theme';

interface StatsOverviewProps {
  stats: {
    total: number;
    online: number;
    offline: number;
    critical: number;
    warning: number;
    normal: number;
  };
}

export const StatsOverview = memo(({ stats }: StatsOverviewProps) => {
  const token = useThemeToken();
  
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8} lg={4} xl={4}>
        <StatsCard
          title="Total Devices"
          value={stats.total}
          icon={<DashboardOutlined />}
          color={token.colorInfo}
          description="All devices"
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4} xl={4}>
        <StatsCard
          title="Online"
          value={stats.online}
          icon={<CheckCircleOutlined />}
          color={token.colorSuccess}
          description="Active devices"
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4} xl={4}>
        <StatsCard
          title="Offline"
          value={stats.offline}
          icon={<DisconnectOutlined />}
          color={token.colorTextSecondary}
          description="Inactive devices"
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4} xl={4}>
        <StatsCard
          title="Critical"
          value={stats.critical}
          icon={<CloseCircleOutlined />}
          color={token.colorError}
          description="Requires attention"
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4} xl={4}>
        <StatsCard
          title="Warning"
          value={stats.warning}
          icon={<WarningOutlined />}
          color={token.colorWarning}
          description="Monitor closely"
          size="small"
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4} xl={4}>
        <StatsCard
          title="Normal"
          value={stats.normal}
          icon={<CheckCircleOutlined />}
          color={token.colorSuccess}
          description="Operating well"
          size="small"
        />
      </Col>
    </Row>
  );
});

StatsOverview.displayName = 'StatsOverview';
