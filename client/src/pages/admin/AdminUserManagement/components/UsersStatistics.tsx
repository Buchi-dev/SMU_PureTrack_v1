/**
 * Users Statistics Component
 * Displays user statistics in cards with modern design
 */

import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { StatsCard } from '../../../../components/staff';
import { useThemeToken } from '../../../../theme';
import type { UserListData } from '../../../../schemas';

interface UsersStatisticsProps {
  users: UserListData[];
  loading?: boolean;
}

export const UsersStatistics: React.FC<UsersStatisticsProps> = ({ users, loading = false }) => {
  const token = useThemeToken();
  
  const stats = useMemo(() => {
    const total = users.length;
    const approved = users.filter((u) => u.status === 'active').length;
    const pending = users.filter((u) => u.status === 'pending').length;
    const suspended = users.filter((u) => u.status === 'suspended').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const staff = users.filter((u) => u.role === 'staff').length;

    const approvedPercent = total > 0 ? (approved / total) * 100 : 0;
    const adminPercent = total > 0 ? (admins / total) * 100 : 0;

    return {
      total,
      approved,
      pending,
      suspended,
      admins,
      staff,
      approvedPercent,
      adminPercent,
    };
  }, [users]);

  return (
    <>
      {/* Main User Statistics */}
      <Row gutter={[16, 16]}>
        {/* Total Users */}
        <Col xs={24} sm={12} md={8} lg={6} xl={6}>
          <StatsCard
            title="Total Users"
            value={stats.total}
            icon={<UserOutlined />}
            color={token.colorInfo}
            description="All registered users"
            loading={loading}
          />
        </Col>

        {/* Approved Users */}
        <Col xs={24} sm={12} md={8} lg={6} xl={6}>
          <StatsCard
            title="Approved"
            value={stats.approved}
            icon={<CheckCircleOutlined />}
            color={token.colorSuccess}
            description="Active user accounts"
            loading={loading}
          />
        </Col>

        {/* Pending Users */}
        <Col xs={24} sm={12} md={8} lg={6} xl={6}>
          <StatsCard
            title="Pending Approval"
            value={stats.pending}
            icon={<ClockCircleOutlined />}
            color={token.colorWarning}
            description="Awaiting approval"
            loading={loading}
          />
        </Col>

        {/* Suspended Users */}
        <Col xs={24} sm={12} md={8} lg={6} xl={6}>
          <StatsCard
            title="Suspended"
            value={stats.suspended}
            icon={<StopOutlined />}
            color={token.colorError}
            description="Suspended accounts"
            loading={loading}
          />
        </Col>
      </Row>

      {/* Role Breakdown */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Admins */}
        <Col xs={24} sm={12} md={12} lg={12} xl={12}>
          <StatsCard
            title="Administrators"
            value={stats.admins}
            icon={<CrownOutlined />}
            color="#722ed1"
            description={`${Math.round(stats.adminPercent)}% of total users`}
            loading={loading}
            size="medium"
          />
        </Col>

        {/* Staff */}
        <Col xs={24} sm={12} md={12} lg={12} xl={12}>
          <StatsCard
            title="Staff Members"
            value={stats.staff}
            icon={<TeamOutlined />}
            color="#13c2c2"
            description={`${Math.round((stats.staff / stats.total) * 100 || 0)}% of total users`}
            loading={loading}
            size="medium"
          />
        </Col>
      </Row>
    </>
  );
};
