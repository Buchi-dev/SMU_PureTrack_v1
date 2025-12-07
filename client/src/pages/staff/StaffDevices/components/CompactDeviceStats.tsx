/**
 * CompactDeviceStats - Mobile-optimized 3x2 grid layout for device statistics
 */

import { Card, Row, Col, Space, Typography } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useResponsive } from '../../../../hooks/useResponsive';
import { useThemeToken } from '../../../../theme';

const { Text } = Typography;

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  warning: number;
}

interface CompactDeviceStatsProps {
  stats: DeviceStats;
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

export default function CompactDeviceStats({ stats }: CompactDeviceStatsProps) {
  const token = useThemeToken();

  const metrics = [
    {
      icon: <ApiOutlined />,
      value: stats.total,
      label: 'Total Devices',
      color: token.colorInfo,
    },
    {
      icon: <CheckCircleOutlined />,
      value: stats.online,
      label: 'Online',
      color: token.colorSuccess,
    },
    {
      icon: <WarningOutlined />,
      value: stats.warning,
      label: 'Warnings',
      color: token.colorWarning,
    },
    {
      icon: <ClockCircleOutlined />,
      value: stats.offline,
      label: 'Offline',
      color: '#8c8c8c',
    },
  ];

  return (
    <Row gutter={[12, 12]}>
      {metrics.map((metric, index) => (
        <Col key={index} xs={8} sm={8} md={8} lg={6} xl={6}>
          <MetricCard {...metric} />
        </Col>
      ))}
    </Row>
  );
}
