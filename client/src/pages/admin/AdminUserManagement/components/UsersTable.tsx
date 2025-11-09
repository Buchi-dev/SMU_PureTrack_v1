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
  Dropdown,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import {
  SearchOutlined,
  EditOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { UserListData, UserRole, UserStatus } from '../../../../schemas';
import dayjs from 'dayjs';

const { Text } = Typography;

interface UsersTableProps {
  users: UserListData[];
  loading: boolean;
  onEdit: (user: UserListData) => void;
  onQuickStatusChange: (userId: string, status: UserStatus) => void;
  onQuickRoleChange: (userId: string, role: UserRole) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading,
  onEdit,
  onQuickStatusChange,
  onQuickRoleChange,
}) => {
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
        user.firstname.toLowerCase().includes(searchLower) ||
        user.lastname.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.department.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'All' || user.status === statusFilter;

      // Role filter
      const matchesRole = roleFilter === 'All' || user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchText, statusFilter, roleFilter]);

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleOutlined />;
      case 'Pending':
        return <ClockCircleOutlined />;
      case 'Suspended':
        return <StopOutlined />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: UserRole) => {
    return role === 'Admin' ? 'blue' : 'default';
  };

  const getInitials = (firstname: string, lastname: string) => {
    return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase();
  };

  const columns: ColumnsType<UserListData> = [
    {
      title: 'User',
      key: 'user',
      width: 280,
      fixed: 'left',
      sorter: (a, b) => a.lastname.localeCompare(b.lastname),
      render: (_, record) => (
        <Space size="middle">
          <Avatar
            style={{
              backgroundColor: record.role === 'Admin' ? '#1890ff' : '#52c41a',
              verticalAlign: 'middle',
            }}
            size="large"
          >
            {getInitials(record.firstname, record.lastname)}
          </Avatar>
          <div>
            <div>
              <Text strong>
                {record.firstname} {record.middlename} {record.lastname}
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
      sorter: (a, b) => a.department.localeCompare(b.department),
      render: (department) => <Text>{department}</Text>,
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 140,
      render: (phone) => <Text>{phone || 'N/A'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Approved', value: 'Approved' },
        { text: 'Pending', value: 'Pending' },
        { text: 'Suspended', value: 'Suspended' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: UserStatus) => (
        <Tag icon={getStatusIcon(status)} color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      filters: [
        { text: 'Admin', value: 'Admin' },
        { text: 'Staff', value: 'Staff' },
      ],
      onFilter: (value, record) => record.role === value,
      render: (role: UserRole) => (
        <Tag color={getRoleColor(role)}>{role}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
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
      width: 120,
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
      width: 120,
      fixed: 'right',
      render: (_, record) => {
        const menuItems = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit User',
            onClick: () => onEdit(record),
          },
          { type: 'divider' as const },
          {
            key: 'status',
            label: 'Change Status',
            children: [
              {
                key: 'approve',
                label: 'Approve',
                icon: <CheckCircleOutlined />,
                disabled: record.status === 'Approved',
                onClick: () => onQuickStatusChange(record.id, 'Approved'),
              },
              {
                key: 'suspend',
                label: 'Suspend',
                icon: <StopOutlined />,
                disabled: record.status === 'Suspended',
                onClick: () => onQuickStatusChange(record.id, 'Suspended'),
              },
            ],
          },
          {
            key: 'role',
            label: 'Change Role',
            children: [
              {
                key: 'admin',
                label: 'Make Admin',
                disabled: record.role === 'Admin',
                onClick: () => onQuickRoleChange(record.id, 'Admin'),
              },
              {
                key: 'staff',
                label: 'Make Staff',
                disabled: record.role === 'Staff',
                onClick: () => onQuickRoleChange(record.id, 'Staff'),
              },
            ],
          },
        ];

        return (
          <Space size="small">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              size="small"
            >
              Edit
            </Button>
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button icon={<MoreOutlined />} size="small" />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const handleTableChange = (
    newPagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    _sorter: SorterResult<UserListData> | SorterResult<UserListData>[]
  ) => {
    setPagination(newPagination);
  };

  return (
    <div>
      {/* Filters Section */}
      <Space size="middle" style={{ marginBottom: 16, width: '100%', flexWrap: 'wrap' }}>
        <Input
          placeholder="Search by name, email, or department..."
          prefix={<SearchOutlined />}
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          size="large"
        />
        <Select
          placeholder="Filter by Status"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          size="large"
        >
          <Select.Option value="All">All Statuses</Select.Option>
          <Select.Option value="Approved">Approved</Select.Option>
          <Select.Option value="Pending">Pending</Select.Option>
          <Select.Option value="Suspended">Suspended</Select.Option>
        </Select>
        <Select
          placeholder="Filter by Role"
          value={roleFilter}
          onChange={setRoleFilter}
          style={{ width: 150 }}
          size="large"
        >
          <Select.Option value="All">All Roles</Select.Option>
          <Select.Option value="Admin">Admin</Select.Option>
          <Select.Option value="Staff">Staff</Select.Option>
        </Select>
      </Space>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredUsers}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        rowKey="id"
        scroll={{ x: 1400 }}
        bordered
      />
    </div>
  );
};
