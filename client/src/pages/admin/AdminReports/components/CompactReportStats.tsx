/**
 * Compact Report Statistics Component
 * Mobile-optimized 3x2 grid layout for report generation statistics
 */

import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import {
  DatabaseOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import { useResponsive } from '../../../../hooks';
import type { Device } from '../../../../schemas';

const { Text } = Typography;

interface CompactReportStatsProps {
  devices: Device[];
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

export const CompactReportStats: React.FC<CompactReportStatsProps> = ({ devices }) => {
  const token = useThemeToken();
  const { isMobile } = useResponsive();
  
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const totalSensors = devices.reduce((acc, d) => acc + (d.sensors?.length || 0), 0);
  
  const metrics = [
    {
      key: 'total',
      icon: <DatabaseOutlined />,
      label: 'Total Devices',
      value: totalDevices,
      color: token.colorInfo,
    },
    {
      key: 'online',
      icon: <CheckCircleOutlined />,
      label: 'Online',
      value: onlineDevices,
      color: token.colorSuccess,
    },
    {
      key: 'offline',
      icon: <DatabaseOutlined />,
      label: 'Offline',
      value: totalDevices - onlineDevices,
      color: token.colorTextTertiary,
    },
    {
      key: 'sensors',
      icon: <ExperimentOutlined />,
      label: 'Total Sensors',
      value: totalSensors,
      color: token.colorPrimary,
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
      value: 0,
      color: '#722ed1',
    },
    {
      key: 'available',
      icon: <CheckCircleOutlined />,
      label: 'Available',
      value: onlineDevices,
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

export default CompactReportStats;
