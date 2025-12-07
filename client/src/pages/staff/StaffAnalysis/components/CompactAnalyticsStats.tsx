/**
 * CompactAnalyticsStats - Mobile-optimized 3-column grid layout for analytics statistics
 */

import { Card, Row, Col, Space, Typography } from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useResponsive } from '../../../../hooks/useResponsive';
import { useThemeToken } from '../../../../theme';

const { Text } = Typography;

interface AnalyticsStats {
  avgPh: number;
  avgTds: number;
  avgTurbidity: number;
}

interface CompactAnalyticsStatsProps {
  stats: AnalyticsStats;
}

interface MetricCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  suffix: string;
}

const MetricCard = ({ icon, value, label, color, suffix }: MetricCardProps) => {
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
        <Space size={4} align="center">
          <Text
            strong
            style={{
              fontSize: isMobile ? '24px' : '28px',
              lineHeight: 1.2,
            }}
          >
            {value}
          </Text>
          <Text
            type="secondary"
            style={{
              fontSize: isMobile ? '11px' : '12px',
            }}
          >
            {suffix}
          </Text>
        </Space>
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

export default function CompactAnalyticsStats({ stats }: CompactAnalyticsStatsProps) {
  const token = useThemeToken();

  const metrics = [
    {
      icon: <RiseOutlined />,
      value: stats.avgPh,
      label: 'Average pH',
      color: token.colorSuccess,
      suffix: 'units',
    },
    {
      icon: <LineChartOutlined />,
      value: stats.avgTds,
      label: 'Avg TDS',
      color: token.colorInfo,
      suffix: 'ppm',
    },
    {
      icon: <FallOutlined />,
      value: stats.avgTurbidity,
      label: 'Avg Turbidity',
      color: token.colorWarning,
      suffix: 'NTU',
    },
  ];

  return (
    <Row gutter={[12, 12]}>
      {metrics.map((metric, index) => (
        <Col key={index} xs={8} sm={8} md={8} lg={8} xl={8}>
          <MetricCard {...metric} />
        </Col>
      ))}
    </Row>
  );
}
