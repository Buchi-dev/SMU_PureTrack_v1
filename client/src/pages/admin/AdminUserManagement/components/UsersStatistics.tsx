/**
 * Users Statistics Component
 * Displays user statistics in cards
 */

import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress, Space } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import type { UserListData } from '../../../../schemas';

interface UsersStatisticsProps {
  users: UserListData[];
  loading?: boolean;
}

export const UsersStatistics: React.FC<UsersStatisticsProps> = ({ users, loading = false }) => {
  const stats = useMemo(() => {
    const total = users.length;
    const approved = users.filter((u) => u.status === 'Approved').length;
    const pending = users.filter((u) => u.status === 'Pending').length;
    const suspended = users.filter((u) => u.status === 'Suspended').length;
    const admins = users.filter((u) => u.role === 'Admin').length;
    const staff = users.filter((u) => u.role === 'Staff').length;

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
    <Row gutter={[16, 16]}>
      {/* Total Users */}
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} loading={loading}>
          <Statistic
            title="Total Users"
            value={stats.total}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>

      {/* Approved Users */}
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} loading={loading}>
          <Statistic
            title="Approved"
            value={stats.approved}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
            suffix={
              <Space direction="vertical" size={0} style={{ marginTop: 8 }}>
                <Progress
                  percent={Math.round(stats.approvedPercent)}
                  size="small"
                  showInfo={false}
                  strokeColor="#52c41a"
                />
              </Space>
            }
          />
        </Card>
      </Col>

      {/* Pending Users */}
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} loading={loading}>
          <Statistic
            title="Pending Approval"
            value={stats.pending}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>

      {/* Suspended Users */}
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} loading={loading}>
          <Statistic
            title="Suspended"
            value={stats.suspended}
            prefix={<StopOutlined />}
            valueStyle={{ color: '#f5222d' }}
          />
        </Card>
      </Col>

      {/* Admins */}
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} loading={loading}>
          <Statistic
            title="Administrators"
            value={stats.admins}
            prefix={<CrownOutlined />}
            valueStyle={{ color: '#722ed1' }}
            suffix={
              <Space direction="vertical" size={0} style={{ marginTop: 8 }}>
                <Progress
                  percent={Math.round(stats.adminPercent)}
                  size="small"
                  showInfo={false}
                  strokeColor="#722ed1"
                />
              </Space>
            }
          />
        </Card>
      </Col>

      {/* Staff */}
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} loading={loading}>
          <Statistic
            title="Staff Members"
            value={stats.staff}
            prefix={<TeamOutlined />}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
      </Col>
    </Row>
  );
};
