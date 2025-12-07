import { Card, Row, Col, Typography } from 'antd';
import {
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import { useResponsive } from '../../../../hooks';
import type { AlertStats } from '../hooks';

const { Text } = Typography;

interface CompactAlertStatisticsProps {
  stats: AlertStats;
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

const CompactAlertStatistics: React.FC<CompactAlertStatisticsProps> = ({ stats }) => {
  const token = useThemeToken();
  const { isMobile } = useResponsive();

  const metrics = [
    {
      key: 'total',
      icon: <BellOutlined />,
      label: 'Total Alert',
      value: stats.total,
      color: token.colorPrimary,
    },
    {
      key: 'active',
      icon: <ExclamationCircleOutlined />,
      label: 'Active',
      value: stats.active,
      color: stats.active > 0 ? token.colorError : token.colorSuccess,
    },
    {
      key: 'critical',
      icon: <WarningOutlined />,
      label: 'Critical',
      value: stats.critical,
      color: token.colorError,
    },
    {
      key: 'resolved',
      icon: <CheckCircleOutlined />,
      label: 'Resolved',
      value: stats.resolved,
      color: token.colorSuccess,
    },
    {
      key: 'acknowledged',
      icon: <ClockCircleOutlined />,
      label: 'Acknowledged',
      value: stats.acknowledged,
      color: token.colorWarning,
    },
    {
      key: 'warning',
      icon: <WarningOutlined />,
      label: 'Warning',
      value: stats.warning,
      color: '#d46b08',
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

export default CompactAlertStatistics;
