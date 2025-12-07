import { Card, Row, Col, Typography } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  DashboardOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import { useResponsive } from '../../../../hooks';

const { Text } = Typography;

interface CompactDeviceMetricsProps {
  stats: {
    total: number;
    online: number;
    offline: number;
    registered: number;
    unregistered: number;
    deleted?: number;
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

export const CompactDeviceMetrics = ({ stats }: CompactDeviceMetricsProps) => {
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
      icon: <CloseCircleFilled />,
      label: 'Offline',
      value: stats.offline,
      color: token.colorTextSecondary,
    },
    {
      key: 'registered',
      icon: <CheckCircleOutlined />,
      label: 'Registered',
      value: stats.registered,
      color: '#52c41a',
    },
    {
      key: 'unregistered',
      icon: <InfoCircleOutlined />,
      label: 'Unregistered',
      value: stats.unregistered,
      color: token.colorWarning,
    },
    {
      key: 'deleted',
      icon: <CloseCircleOutlined />,
      label: 'Deleted',
      value: stats.deleted || 0,
      color: token.colorError,
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
};
