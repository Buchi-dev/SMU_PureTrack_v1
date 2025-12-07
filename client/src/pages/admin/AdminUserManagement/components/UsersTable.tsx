/**
 * Users Table Component
 * Displays users in a table with filtering, sorting, and actions
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Typography,
  Tooltip,
  Avatar,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  SearchOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { UserListData, UserRole, UserStatus } from '../../../../schemas';
import { useTableScroll } from '../../../../hooks';
import { useResponsive } from '../../../../hooks/useResponsive';
import dayjs from 'dayjs';

const { Text } = Typography;

interface UsersTableProps {
  users: UserListData[];
  loading: boolean;
  onViewUser: (user: UserListData) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading,
  onViewUser,
}) => {
  const tableScroll = useTableScroll({ offsetHeight: 450 });
  const { isMobile } = useResponsive();
  
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'All'>('All');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `Total ${total} users`,
  });

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const searchLower = searchText.toLowerCase();
      const matchesSearch =
        !searchText ||
        (user.firstName?.toLowerCase().includes(searchLower) ?? false) ||
        (user.lastName?.toLowerCase().includes(searchLower) ?? false) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.department?.toLowerCase().includes(searchLower) ?? false);

      // Status filter
      const matchesStatus = statusFilter === 'All' || user.status === statusFilter;

      // Role filter
      const matchesRole = roleFilter === 'All' || user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchText, statusFilter, roleFilter]);

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircleOutlined />;
      case 'pending':
        return <ClockCircleOutlined />;
      case 'suspended':
        return <StopOutlined />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: UserRole) => {
    return role === 'admin' ? 'red' : 'blue';
  };

  const getInitials = (firstname: string, lastname: string) => {
    return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase();
  };

  // Mobile-optimized columns (3 columns)
  const mobileColumns: ColumnsType<UserListData> = [
    {
      title: 'User',
      key: 'user',
      ellipsis: false,
      render: (_, record) => {
        const fullName = [record.firstName, record.middleName, record.lastName]
          .filter(Boolean)
          .join(' ') || 'Unknown User';
        
        return (
          <Space size={8} style={{ width: '100%' }}>
            <Avatar
              style={{
                backgroundColor: record.role === 'admin' ? '#ff4d4f' : '#1890ff',
                flexShrink: 0,
              }}
              size={40}
            >
              {getInitials(record.firstName || '', record.lastName || '')}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text 
                strong 
                style={{ 
                  fontSize: '13px', 
                  display: 'block', 
                  wordBreak: 'break-word',
                  lineHeight: 1.3,
                }}
              >
                {fullName}
              </Text>
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: '11px', 
                  display: 'block',
                  wordBreak: 'break-all',
                  lineHeight: 1.2,
                }}
              >
                {record.email}
              </Text>
              {record.department && (
                <Text 
                  type="secondary" 
                  style={{ 
                    fontSize: '10px', 
                    display: 'block',
                    marginTop: 2,
                  }}
                >
                  {record.department}
                </Text>
              )}
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 50,
      align: 'center',
      render: (_, record) => (
        <Tooltip title={`${record.status === 'active' ? 'Active' : record.status === 'pending' ? 'Pending' : 'Suspended'} • ${record.role === 'admin' ? 'Admin' : 'Staff'}`}>
          <Space direction="vertical" size={2} align="center">
            <div style={{ fontSize: '24px', color: getStatusColor(record.status) === 'success' ? '#52c41a' : getStatusColor(record.status) === 'warning' ? '#faad14' : '#ff4d4f' }}>
              {getStatusIcon(record.status)}
            </div>
            <Tag 
              color={getRoleColor(record.role)}
              style={{ 
                fontSize: '9px',
                padding: '0 4px',
                margin: 0,
                lineHeight: '16px',
              }}
            >
              {record.role === 'admin' ? 'ADM' : 'STF'}
            </Tag>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => onViewUser(record)}
          size="small"
          block
          style={{ fontSize: '11px', height: '32px' }}
        >
          View
        </Button>
      ),
    },
  ];

  const columns: ColumnsType<UserListData> = [
    {
      title: 'User',
      key: 'user',
      width: 280,
      fixed: 'left',
      sorter: (a, b) => (a.lastName || '').localeCompare(b.lastName || ''),
      render: (_, record) => (
        <Space size="middle">
          <Avatar
            style={{
              backgroundColor: record.role === 'admin' ? '#ff4d4f' : '#1890ff',
              verticalAlign: 'middle',
            }}
            size="large"
          >
            {getInitials(record.firstName || '', record.lastName || '')}
          </Avatar>
          <div>
            <div>
              <Text strong>
                {[record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ') || 'Unknown User'}
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      align: 'center',
      sorter: (a, b) => (a.department || '').localeCompare(b.department || ''),
      render: (department) => <Text>{department || 'N/A'}</Text>,
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 150,
      align: 'center',
      render: (phone) => <Text>{phone || 'N/A'}</Text>,
    },
    {
      title: 'Status & Role',
      key: 'statusRole',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Tag 
            icon={getStatusIcon(record.status)} 
            color={getStatusColor(record.status)}
            style={{ 
              width: '100%', 
              textAlign: 'center',
              fontSize: '13px',
              padding: '4px 8px',
              margin: 0,
            }}
          >
            {record.status === 'active' ? 'Active' : record.status === 'pending' ? 'Pending' : 'Suspended'}
          </Tag>
          <Tag 
            color={getRoleColor(record.role)}
            style={{ 
              width: '100%', 
              textAlign: 'center',
              fontSize: '12px',
              padding: '2px 8px',
              margin: 0,
            }}
          >
            {record.role === 'admin' ? 'Admin' : 'Staff'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      align: 'center',
      sorter: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      render: (date: Date) => (
        <Tooltip title={dayjs(date).format('MMM DD, YYYY h:mm A')}>
          <Text type="secondary">{dayjs(date).format('MMM DD, YYYY')}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      width: 130,
      align: 'center',
      sorter: (a, b) => {
        if (!a.lastLogin) return 1;
        if (!b.lastLogin) return -1;
        return a.lastLogin.getTime() - b.lastLogin.getTime();
      },
      render: (date?: Date) =>
        date ? (
          <Tooltip title={dayjs(date).format('MMM DD, YYYY h:mm A')}>
            <Text type="secondary">{dayjs(date).format('MMM DD, YYYY')}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">Never</Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => onViewUser(record)}
          size="middle"
        >
          View
        </Button>
      ),
    },
  ];

  const handleTableChange = (
    newPagination: TablePaginationConfig,
  ) => {
    setPagination(newPagination);
  };

  return (
    <div>
      {/* Filters Section */}
      <Space size="middle" style={{ marginBottom: 16, width: '100%', flexWrap: 'wrap' }}>
        <Input
          placeholder={isMobile ? "Search users..." : "Search by name, email, or department..."}
          prefix={<SearchOutlined />}
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: isMobile ? '100%' : 300 }}
          size={isMobile ? 'middle' : 'large'}
        />
        <Select
          placeholder="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: isMobile ? 'calc(50% - 6px)' : 150 }}
          size={isMobile ? 'middle' : 'large'}
        >
          <Select.Option value="All">All Statuses</Select.Option>
          <Select.Option value="active">Active</Select.Option>
          <Select.Option value="pending">Pending</Select.Option>
          <Select.Option value="suspended">Suspended</Select.Option>
        </Select>
        <Select
          placeholder="Role"
          value={roleFilter}
          onChange={setRoleFilter}
          style={{ width: isMobile ? 'calc(50% - 6px)' : 150 }}
          size={isMobile ? 'middle' : 'large'}
        >
          <Select.Option value="All">All Roles</Select.Option>
          <Select.Option value="admin">Admin</Select.Option>
          <Select.Option value="staff">Staff</Select.Option>
        </Select>
      </Space>

      {/* Table */}
      <Table
        columns={isMobile ? mobileColumns : columns}
        dataSource={filteredUsers}
        loading={loading}
        pagination={{
          ...pagination,
          pageSize: isMobile ? 5 : pagination.pageSize,
          simple: isMobile,
          showSizeChanger: !isMobile,
        }}
        onChange={handleTableChange}
        rowKey="id"
        scroll={isMobile ? undefined : tableScroll}
        bordered={!isMobile}
        size={isMobile ? 'small' : 'middle'}
      />
    </div>
  );
};
