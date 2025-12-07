/**
 * Compact Users Statistics Component
 * Mobile-optimized 3x2 grid layout for user statistics
 */

import React, { useMemo } from 'react';
import { Card, Row, Col, Typography } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CrownOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import { useResponsive } from '../../../../hooks';
import type { UserListData } from '../../../../schemas';

const { Text } = Typography;

interface CompactUsersStatisticsProps {
  users: UserListData[];
  loading?: boolean;
}

interface MetricCardProps {
  icon: React.ReactNode;
  value: number;
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

export const CompactUsersStatistics: React.FC<CompactUsersStatisticsProps> = ({ 
  users, 
  loading = false 
}) => {
  const token = useThemeToken();
  const { isMobile } = useResponsive();
  
  const stats = useMemo(() => {
    const total = users.length;
    const approved = users.filter((u) => u.status === 'active').length;
    const pending = users.filter((u) => u.status === 'pending').length;
    const suspended = users.filter((u) => u.status === 'suspended').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const staff = users.filter((u) => u.role === 'staff').length;

    return {
      total,
      approved,
      pending,
      suspended,
      admins,
      staff,
    };
  }, [users]);

  const metrics = [
    {
      key: 'total',
      icon: <UserOutlined />,
      label: 'Total Users',
      value: stats.total,
      color: token.colorInfo,
    },
    {
      key: 'approved',
      icon: <CheckCircleOutlined />,
      label: 'Active',
      value: stats.approved,
      color: token.colorSuccess,
    },
    {
      key: 'pending',
      icon: <ClockCircleOutlined />,
      label: 'Pending',
      value: stats.pending,
      color: token.colorWarning,
    },
    {
      key: 'suspended',
      icon: <StopOutlined />,
      label: 'Suspended',
      value: stats.suspended,
      color: token.colorError,
    },
    {
      key: 'admins',
      icon: <CrownOutlined />,
      label: 'Admins',
      value: stats.admins,
      color: '#722ed1',
    },
    {
      key: 'staff',
      icon: <TeamOutlined />,
      label: 'Staff',
      value: stats.staff,
      color: '#13c2c2',
    },
  ];

  if (loading) {
    return (
      <Card loading={true} style={{ marginBottom: 16 }}>
        <div style={{ height: 150 }} />
      </Card>
    );
  }

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

export default CompactUsersStatistics;
