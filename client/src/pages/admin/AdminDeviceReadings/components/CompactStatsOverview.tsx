import { Card, Row, Col, Typography } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { memo } from 'react';
import { useThemeToken } from '../../../../theme';
import { useResponsive } from '../../../../hooks';

const { Text } = Typography;

interface CompactStatsOverviewProps {
  stats: {
    total: number;
    online: number;
    offline: number;
    critical: number;
    warning: number;
    normal: number;
  };
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  isMobile?: boolean;
}

const MetricCard = ({ icon, label, value, color, isMobile }: MetricCardProps) => {
  return (
    <Card
      style={{
        height: '100%',
        borderLeft: `4px solid ${color}`,
        padding: 0,
      }}
      bodyStyle={{
        padding: isMobile ? '16px 12px' : '20px 16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: isMobile ? '32px' : '36px',
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: isMobile ? '8px' : '10px',
        }}
      >
        {icon}
      </div>
      <div style={{ width: '100%' }}>
        <Text
          strong
          style={{
            fontSize: isMobile ? '24px' : '28px',
            color: color,
            display: 'block',
            lineHeight: 1.2,
            fontWeight: 600,
            marginBottom: '4px',
          }}
        >
          {value}
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: isMobile ? '12px' : '13px',
            display: 'block',
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {label}
        </Text>
      </div>
    </Card>
  );
};

export const CompactStatsOverview = memo(({ stats }: CompactStatsOverviewProps) => {
  const token = useThemeToken();
  const { isMobile } = useResponsive();

  const metrics = [
    {
      key: 'total',
      icon: <DashboardOutlined />,
      label: 'Total Device',
      value: stats.total,
      color: token.colorPrimary,
    },
    {
      key: 'online',
      icon: <CheckCircleFilled />,
      label: 'Online',
      value: stats.online,
      color: token.colorSuccess,
    },
    {
      key: 'offline',
      icon: <DisconnectOutlined />,
      label: 'Offline',
      value: stats.offline,
      color: token.colorTextSecondary,
    },
    {
      key: 'critical',
      icon: <CloseCircleOutlined />,
      label: 'Critical',
      value: stats.critical,
      color: token.colorError,
    },
    {
      key: 'warning',
      icon: <WarningOutlined />,
      label: 'Warning',
      value: stats.warning,
      color: token.colorWarning,
    },
    {
      key: 'normal',
      icon: <CheckCircleOutlined />,
      label: 'Normal',
      value: stats.normal,
      color: '#52c41a',
    },
  ];

  return (
    <Row gutter={isMobile ? [8, 8] : [12, 12]}>
      {metrics.map((metric) => (
        <Col key={metric.key} xs={8} sm={8} md={8} lg={4} xl={4}>
          <MetricCard
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            color={metric.color}
            isMobile={isMobile}
          />
        </Col>
      ))}
    </Row>
  );
});

CompactStatsOverview.displayName = 'CompactStatsOverview';
