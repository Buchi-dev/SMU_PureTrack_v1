/**
 * Compact Device Statistics Component
 * Mobile-optimized 3x2 grid layout for staff dashboard device stats
 */

import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import { useResponsive } from '../../../../hooks';

const { Text } = Typography;

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  warnings: number;
}

interface CompactDeviceStatsProps {
  stats: DeviceStats;
}

interface MetricCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
  isMobile: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, value, label, color, isMobile }) => {
  return (
    <Card
      bordered={false}
      style={{
        textAlign: 'center',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
      }}
      bodyStyle={{
        padding: isMobile ? '12px 8px' : '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ color, fontSize: isMobile ? '32px' : '36px', marginBottom: isMobile ? '4px' : '8px' }}>
        {icon}
      </div>
      <Text strong style={{ fontSize: isMobile ? '24px' : '28px', display: 'block', lineHeight: 1.2 }}>
        {value}
      </Text>
      <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '13px', marginTop: '4px' }}>
        {label}
      </Text>
    </Card>
  );
};

export const CompactDeviceStats: React.FC<CompactDeviceStatsProps> = ({ stats }) => {
  const token = useThemeToken();
  const { isMobile } = useResponsive();
  
  const uptimePercent = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0;
  
  const metrics = [
    {
      key: 'total',
      icon: <ApiOutlined />,
      label: 'Total Devices',
      value: stats.total,
      color: token.colorInfo,
    },
    {
      key: 'online',
      icon: <CheckCircleOutlined />,
      label: 'Online',
      value: stats.online,
      color: token.colorSuccess,
    },
    {
      key: 'offline',
      icon: <CloseCircleOutlined />,
      label: 'Offline',
      value: stats.offline,
      color: token.colorError,
    },
    {
      key: 'warnings',
      icon: <WarningOutlined />,
      label: 'Warnings',
      value: stats.warnings,
      color: token.colorWarning,
    },
    {
      key: 'uptime',
      icon: <CheckCircleOutlined />,
      label: 'Uptime',
      value: `${uptimePercent}%`,
      color: token.colorSuccess,
    },
    {
      key: 'healthy',
      icon: <CheckCircleOutlined />,
      label: 'Healthy',
      value: stats.total - stats.warnings,
      color: '#52c41a',
    },
  ];

  return (
    <Row gutter={isMobile ? [8, 8] : [12, 12]}>
      {metrics.map((metric) => (
        <Col key={metric.key} xs={8} sm={8} md={8} lg={4} xl={4}>
          <MetricCard
            icon={metric.icon}
            value={metric.value}
            label={metric.label}
            color={metric.color}
            isMobile={isMobile}
          />
        </Col>
      ))}
    </Row>
  );
};

export default CompactDeviceStats;
