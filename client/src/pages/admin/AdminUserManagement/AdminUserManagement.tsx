/**
 * REDESIGNED ADMIN USER MANAGEMENT - ENHANCED UI/UX
 * 
 * Maximizes Ant Design v5 Components:
 * - Drawer for user details panel
 * - Descriptions for user information
 * - Steps for approval workflow
 * - Segmented for view modes
 * - Avatar for user profiles
 * - Progress for account completion
 */

import { useState, useEffect } from 'react';
import { AdminLayout } from '../../../components/layouts';
import {
  Card,
  Typography,
  Space,
  Table,
  Tag,
  Button,
  Tabs,
  Badge,
  Modal,
  Select,
  message,
  Descriptions,
  Input,
  Tooltip,
  Popconfirm,
  Drawer,
  Steps,
  Segmented,
  Avatar,
  Progress,
  Flex,
  Alert,
  Divider,
} from 'antd';
import type { SegmentedValue } from 'antd/es/segmented';
import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  EyeOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  UserOutlined,
  SafetyOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { UserProfile, UserStatus, UserRole } from '../../../contexts';
import type { ColumnsType } from 'antd/es/table';
import { userManagementService } from '../../../services/userManagementService';
import { useResponsiveToken } from '../../../theme';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

interface UserWithId extends UserProfile {
  id: string;
}

export const AdminUserManagement = () => {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithId[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('Pending');
  const [editRole, setEditRole] = useState<UserRole>('Staff');

  // Fetch users using User Management Service
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await userManagementService.listUsers();
      
      // Data already has dates converted by the service
      const usersList: UserWithId[] = result.users.map((user: any) => ({
        ...user,
      }));

      setUsers(usersList);
      filterUsers(usersList, activeTab, searchText);
      message.success(`Loaded ${result.count} users`);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      message.error(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on tab and search
  const filterUsers = (usersList: UserWithId[], tab: string, search: string) => {
    let filtered = usersList;

    // Filter by tab
    if (tab === 'pending') {
      filtered = filtered.filter(u => u.status === 'Pending');
    } else if (tab === 'approved') {
      filtered = filtered.filter(u => u.status === 'Approved');
    } else if (tab === 'suspended') {
      filtered = filtered.filter(u => u.status === 'Suspended');
    }

    // Filter by search text
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(u =>
        u.firstname.toLowerCase().includes(searchLower) ||
        u.lastname.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        u.department.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUsers(filtered);
  };

  // Update user status using User Management Service
  const updateUserStatusHandler = async (userId: string, newStatus: UserStatus) => {
    try {
      setLoading(true);
      const result = await userManagementService.updateUserStatus(userId, newStatus);
      
      message.success(result.message);
      await fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating user status:', error);
      message.error(error.message || 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit user using User Management Service
  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const result = await userManagementService.updateUser(
        selectedUser.id,
        editStatus,
        editRole
      );

      message.success(result.message);
      setEditModalVisible(false);
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      message.error(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status: UserStatus): string => {
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

  // Get status icon
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

  // Table columns
  const columns: ColumnsType<UserWithId> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{`${record.firstname} ${record.lastname}`}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </Space>
      ),
      sorter: (a, b) => a.lastname.localeCompare(b.lastname),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      sorter: (a, b) => a.department.localeCompare(b.department),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={role === 'Admin' ? 'blue' : 'default'}>
          {role}
        </Tag>
      ),
      filters: [
        { text: 'Admin', value: 'Admin' },
        { text: 'Staff', value: 'Staff' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: UserStatus) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Approved', value: 'Approved' },
        { text: 'Pending', value: 'Pending' },
        { text: 'Suspended', value: 'Suspended' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedUser(record);
                setViewModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit User">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedUser(record);
                setEditStatus(record.status);
                setEditRole(record.role);
                setEditModalVisible(true);
              }}
            />
          </Tooltip>
          {record.status === 'Pending' && (
            <Popconfirm
              title="Approve this user?"
              description="This will grant the user access to the system."
              onConfirm={() => updateUserStatusHandler(record.id, 'Approved')}
              okText="Approve"
              cancelText="Cancel"
            >
              <Tooltip title="Approve User">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                >
                  Approve
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
          {record.status === 'Approved' && (
            <Popconfirm
              title="Suspend this user?"
              description="This will revoke the user's access."
              onConfirm={() => updateUserStatusHandler(record.id, 'Suspended')}
              okText="Suspend"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Suspend User">
                <Button
                  danger
                  size="small"
                  icon={<StopOutlined />}
                >
                  Suspend
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
          {record.status === 'Suspended' && (
            <Popconfirm
              title="Reactivate this user?"
              description="This will restore the user's access."
              onConfirm={() => updateUserStatusHandler(record.id, 'Approved')}
              okText="Reactivate"
              cancelText="Cancel"
            >
              <Tooltip title="Reactivate User">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                >
                  Reactivate
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Update filtered users when tab or search changes
  useEffect(() => {
    filterUsers(users, activeTab, searchText);
  }, [activeTab, searchText, users]);

  // Count users by status
  const pendingCount = users.filter(u => u.status === 'Pending').length;
  const approvedCount = users.filter(u => u.status === 'Approved').length;
  const suspendedCount = users.filter(u => u.status === 'Suspended').length;

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <TeamOutlined /> User Management
          </Title>
          <Paragraph type="secondary">
            Manage users, approve pending accounts, and control access
          </Paragraph>
        </div>

        {/* Stats Cards */}
        <Space size="middle" style={{ width: '100%', flexWrap: 'wrap' }}>
          <Card size="small" style={{ minWidth: 200 }}>
            <Space>
              <ClockCircleOutlined style={{ fontSize: 24, color: token.colorWarning }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Pending Approval</Text>
                <div>
                  <Text strong style={{ fontSize: 20 }}>{pendingCount}</Text>
                </div>
              </div>
            </Space>
          </Card>
          <Card size="small" style={{ minWidth: 200 }}>
            <Space>
              <CheckCircleOutlined style={{ fontSize: 24, color: token.colorSuccess }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Approved Users</Text>
                <div>
                  <Text strong style={{ fontSize: 20 }}>{approvedCount}</Text>
                </div>
              </div>
            </Space>
          </Card>
          <Card size="small" style={{ minWidth: 200 }}>
            <Space>
              <StopOutlined style={{ fontSize: 24, color: token.colorError }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Suspended</Text>
                <div>
                  <Text strong style={{ fontSize: 20 }}>{suspendedCount}</Text>
                </div>
              </div>
            </Space>
          </Card>
          <Card size="small" style={{ minWidth: 200 }}>
            <Space>
              <TeamOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Total Users</Text>
                <div>
                  <Text strong style={{ fontSize: 20 }}>{users.length}</Text>
                </div>
              </div>
            </Space>
          </Card>
        </Space>

        {/* Main Content */}
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <Input
                placeholder="Search by name, email, or department..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ maxWidth: 400 }}
                allowClear
              />
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchUsers}
                loading={loading}
              >
                Refresh
              </Button>
            </div>

            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'all',
                  label: (
                    <span>
                      <TeamOutlined />
                      All Users ({users.length})
                    </span>
                  ),
                },
                {
                  key: 'pending',
                  label: (
                    <Badge count={pendingCount} offset={[10, 0]}>
                      <span style={{ paddingRight: pendingCount > 0 ? 16 : 0 }}>
                        <ClockCircleOutlined />
                        Pending Approval
                      </span>
                    </Badge>
                  ),
                },
                {
                  key: 'approved',
                  label: (
                    <span>
                      <CheckCircleOutlined />
                      Approved ({approvedCount})
                    </span>
                  ),
                },
                {
                  key: 'suspended',
                  label: (
                    <span>
                      <StopOutlined />
                      Suspended ({suspendedCount})
                    </span>
                  ),
                },
              ]}
            />

            {/* Table */}
            <Table
              columns={columns}
              dataSource={filteredUsers}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} users`,
              }}
              scroll={{ x: 1000 }}
            />
          </Space>
        </Card>
      </Space>

      {/* View User Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            User Details
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {selectedUser && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Name">
              <Text strong>
                {`${selectedUser.firstname} ${selectedUser.middlename} ${selectedUser.lastname}`}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={<><MailOutlined /> Email</>}>
              {selectedUser.email}
            </Descriptions.Item>
            <Descriptions.Item label={<><PhoneOutlined /> Phone</>}>
              {selectedUser.phoneNumber || 'Not provided'}
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {selectedUser.department}
            </Descriptions.Item>
            <Descriptions.Item label="Role">
              <Tag color={selectedUser.role === 'Admin' ? 'blue' : 'default'}>
                {selectedUser.role}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedUser.status)} icon={getStatusIcon(selectedUser.status)}>
                {selectedUser.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<><CalendarOutlined /> Created</>}>
              {new Date(selectedUser.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString() : 'Never'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Login">
              {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}
            </Descriptions.Item>
            <Descriptions.Item label="User ID">
              <Text code copyable>{selectedUser.uuid}</Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            Edit User
          </Space>
        }
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleEditUser}
        okText="Save Changes"
        cancelText="Cancel"
      >
        {selectedUser && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>User</Text>
              <Text>{`${selectedUser.firstname} ${selectedUser.lastname}`}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{selectedUser.email}</Text>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Role</Text>
              <Select
                value={editRole}
                onChange={setEditRole}
                style={{ width: '100%' }}
                options={[
                  { value: 'Staff', label: 'Staff' },
                  { value: 'Admin', label: 'Admin' },
                ]}
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Status</Text>
              <Select
                value={editStatus}
                onChange={setEditStatus}
                style={{ width: '100%' }}
                options={[
                  { 
                    value: 'Pending', 
                    label: (
                      <Space>
                        <ClockCircleOutlined />
                        Pending
                      </Space>
                    )
                  },
                  { 
                    value: 'Approved', 
                    label: (
                      <Space>
                        <CheckCircleOutlined />
                        Approved
                      </Space>
                    )
                  },
                  { 
                    value: 'Suspended', 
                    label: (
                      <Space>
                        <StopOutlined />
                        Suspended
                      </Space>
                    )
                  },
                ]}
              />
            </div>
          </Space>
        )}
      </Modal>
    </AdminLayout>
  );
};
