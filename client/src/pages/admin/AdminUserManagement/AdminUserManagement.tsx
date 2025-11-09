/**
 * Admin User Management Page
 *
 * Comprehensive user management interface with:
 * - Real-time user data updates
 * - User statistics dashboard
 * - Advanced filtering and search
 * - Quick actions and bulk operations
 * - User editing with role and status management
 *
 * @module pages/admin/AdminUserManagement
 */

import React, { useState } from "react";
import {
  Layout,
  Typography,
  Space,
  Button,
  Card,
  Alert,
  Spin,
  Empty,
  Breadcrumb,
  theme,
  message,
} from "antd";
import {
  UserOutlined,
  ReloadOutlined,
  PlusOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useRealtime_Users, useCall_Users } from "../../../hooks";
import { UsersTable } from "./components/UsersTable";
import { UserEditModal } from "./components/UserEditModal";
import { UsersStatistics } from "./components/UsersStatistics";
import type { UserListData, UserRole, UserStatus } from "../../../schemas";
import { AdminLayout } from "../../../components/layouts/AdminLayout";

const { Title, Text } = Typography;
const { Content } = Layout;

export const AdminUserManagement: React.FC = () => {
  const { token } = theme.useToken();
  
  // Global READ hook - Real-time user data
  const { 
    users, 
    isLoading: loading, 
    error: realtimeError 
  } = useRealtime_Users();

  // Global WRITE hook - User operations
  const {
    updateUser,
    updateUserStatus,
    isLoading: refreshing,
    error: writeError,
  } = useCall_Users();

  // Combine errors
  const error = realtimeError?.message || writeError?.message || null;

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListData | null>(null);

  // Handle edit user
  const handleEdit = (user: UserListData) => {
    setSelectedUser(user);
    setEditModalVisible(true);
  };

  // Handle save user
  const handleSaveUser = async (
    userId: string,
    status?: UserStatus,
    role?: UserRole
  ) => {
    try {
      const result = await updateUser(userId, status, role);
      message.success(result.message || 'User updated successfully');
      setEditModalVisible(false);
      setSelectedUser(null);
    } catch (error: any) {
      message.error(error.message || 'Failed to update user');
    }
  };

  // Handle quick status change
  const handleQuickStatusChange = async (
    userId: string,
    status: UserStatus
  ) => {
    try {
      await updateUserStatus(userId, status);
      message.success(`User status updated to ${status}`);
    } catch (error: any) {
      message.error(error.message || 'Failed to update user status');
    }
  };

  // Handle quick role change
  const handleQuickRoleChange = async (userId: string, role: UserRole) => {
    try {
      await updateUser(userId, undefined, role);
      message.success(`User role updated to ${role}`);
    } catch (error: any) {
      message.error(error.message || 'Failed to update user role');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setSelectedUser(null);
  };

  return (
    <AdminLayout>
      <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
        <Content style={{ padding: "24px 24px" }}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                {
                  href: "/",
                  title: (
                    <>
                      <HomeOutlined />
                      <span>Home</span>
                    </>
                  ),
                },
                {
                  title: (
                    <>
                      <UserOutlined />
                      <span>User Management</span>
                    </>
                  ),
                },
              ]}
            />

            {/* Page Header */}
            <Card bordered={false}>
              <Space
                direction="vertical"
                size="small"
                style={{ width: "100%" }}
              >
                <Space
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <Title level={2} style={{ margin: 0 }}>
                      <UserOutlined style={{ marginRight: 12 }} />
                      User Management
                    </Title>
                    <Text type="secondary">
                      Manage user accounts, roles, and permissions
                    </Text>
                  </div>
                  <Space size="middle">
                    <Button
                      icon={<ReloadOutlined spin={refreshing} />}
                      onClick={() => window.location.reload()}
                      disabled={loading || refreshing}
                    >
                      Refresh
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      disabled
                      title="Users are created through registration"
                    >
                      Add User
                    </Button>
                  </Space>
                </Space>
              </Space>
            </Card>

            {/* Error Alert */}
            {error && (
              <Alert
                message="Error Loading Users"
                description={error}
                type="error"
                showIcon
                closable
              />
            )}

            {/* Statistics Cards */}
            <UsersStatistics users={users} loading={loading} />

            {/* Users Table */}
            <Card
              bordered={false}
              bodyStyle={{ padding: 24 }}
              title={
                <Space>
                  <UserOutlined />
                  <span>All Users ({users.length})</span>
                </Space>
              }
            >
              {loading && users.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <Spin size="large" tip="Loading users..." />
                </div>
              ) : users.length === 0 ? (
                <Empty
                  description="No users found"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <UsersTable
                  users={users}
                  loading={refreshing}
                  onEdit={handleEdit}
                  onQuickStatusChange={handleQuickStatusChange}
                  onQuickRoleChange={handleQuickRoleChange}
                />
              )}
            </Card>
          </Space>

          {/* Edit User Modal */}
          <UserEditModal
            visible={editModalVisible}
            user={selectedUser}
            onCancel={handleCancelEdit}
            onSave={handleSaveUser}
            loading={refreshing}
          />
        </Content>
      </Layout>
    </AdminLayout>
  );
};
