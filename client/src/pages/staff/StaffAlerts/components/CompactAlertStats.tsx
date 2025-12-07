/**
 * CompactAlertStats - Mobile-optimized 3x2 grid layout for alert statistics
 */

import { Card, Row, Col, Space, Typography } from 'antd';
import {
  BellOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AlertOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useResponsive } from '../../../../hooks/useResponsive';
import { useThemeToken } from '../../../../theme';

const { Text } = Typography;

interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  warning: number;
  advisory: number;
}

interface CompactAlertStatsProps {
  stats: AlertStats;
}

interface MetricCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}

const MetricCard = ({ icon, value, label, color }: MetricCardProps) => {
  const { isMobile } = useResponsive();

  return (
    <Card
      bordered={false}
      style={{
        textAlign: 'center',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.02)',
      }}
      bodyStyle={{ padding: isMobile ? '12px 8px' : '16px 12px' }}
    >
      <Space direction="vertical" size={isMobile ? 4 : 8} style={{ width: '100%' }}>
        <div style={{ fontSize: isMobile ? '32px' : '36px', color }}>
          {icon}
        </div>
        <Text
          strong
          style={{
            fontSize: isMobile ? '24px' : '28px',
            display: 'block',
            lineHeight: 1.2,
          }}
        >
          {value}
        </Text>
        <Text
          type="secondary"
          style={{
            fontSize: isMobile ? '12px' : '13px',
            display: 'block',
            wordBreak: 'break-word',
          }}
        >
          {label}
        </Text>
      </Space>
    </Card>
  );
};

export default function CompactAlertStats({ stats }: CompactAlertStatsProps) {
  const token = useThemeToken();

  const metrics = [
    {
      icon: <BellOutlined />,
      value: stats.total,
      label: 'Total Alerts',
      color: token.colorInfo,
    },
    {
      icon: <ExclamationCircleOutlined />,
      value: stats.active,
      label: 'Active',
      color: token.colorError,
    },
    {
      icon: <CheckCircleOutlined />,
      value: stats.acknowledged,
      label: 'Acknowledged',
      color: token.colorWarning,
    },
    {
      icon: <CloseCircleOutlined />,
      value: stats.resolved,
      label: 'Resolved',
      color: token.colorSuccess,
    },
    {
      icon: <AlertOutlined />,
      value: stats.critical,
      label: 'Critical',
      color: '#cf1322',
    },
    {
      icon: <WarningOutlined />,
      value: stats.warning,
      label: 'Warning',
      color: '#d46b08',
    },
  ];

  return (
    <Row gutter={[12, 12]}>
      {metrics.map((metric, index) => (
        <Col key={index} xs={8} sm={8} md={8} lg={4} xl={4}>
          <MetricCard {...metric} />
        </Col>
      ))}
    </Row>
  );
}
