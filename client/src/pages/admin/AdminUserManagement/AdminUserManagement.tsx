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

import React, { useState, useEffect } from "react";
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
  Modal,
} from "antd";
import {
  UserOutlined,
  ReloadOutlined,
  PlusOutlined,
  HomeOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { authService } from "../../../services/auth.Service";
import { useRealtime_Users, useCall_Users } from "../../../hooks";
import { UsersTable } from "./components/UsersTable";
import { UserActionsDrawer } from "./components/UserActionsDrawer";
import { UsersStatistics } from "./components/UsersStatistics";
import type { UserListData, UserRole, UserStatus } from "../../../schemas";
import { AdminLayout } from "../../../components/layouts/AdminLayout";
import { useAuth } from "../../../contexts/AuthContext";

const { Title, Text } = Typography;
const { Content } = Layout;

export const AdminUserManagement: React.FC = () => {
  const { token } = theme.useToken();
  const { user: userProfile } = useAuth();
  const navigate = useNavigate();
  
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
    updateUserProfile,
    deleteUser,
    isLoading: refreshing,
    error: writeError,
    updateResult,
  } = useCall_Users();

  // Combine errors
  const error = realtimeError?.message || writeError?.message || null;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListData | null>(null);

  /**
   * Auto-logout handler when user changes their own role/status
   * Triggers when backend returns requiresLogout: true
   */
  useEffect(() => {
    // Type guard: check if updateResult has requiresLogout property
    const requiresLogout = updateResult && 'requiresLogout' in updateResult 
      ? updateResult.requiresLogout 
      : false;

    if (requiresLogout) {
      // Show logout notification
      Modal.success({
        title: 'Account Updated Successfully',
        content: (
          <div>
            <p>Your account has been updated successfully.</p>
            <p style={{ marginTop: 12 }}>
              <strong>You will be logged out in 3 seconds</strong> to apply the changes.
            </p>
          </div>
        ),
        icon: <LogoutOutlined style={{ color: '#1890ff' }} />,
        okText: 'Logout Now',
        onOk: async () => {
          try {
            await authService.logout();
            message.info('Logged out successfully. Please log in again.');
            navigate('/auth/login');
          } catch (error) {
            console.error('Logout error:', error);
            message.error('Failed to logout. Please refresh the page.');
          }
        },
      });

      // Auto-logout after 3 seconds
      const timer = setTimeout(async () => {
        try {
          await authService.logout();
          message.info('Logged out successfully. Please log in again.');
          navigate('/auth/login');
        } catch (error) {
          console.error('Auto-logout error:', error);
          message.error('Failed to logout. Please refresh the page.');
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [updateResult, navigate]);

  // Handle view user (opens drawer)
  const handleViewUser = (user: UserListData) => {
    setSelectedUser(user);
    setDrawerVisible(true);
  };

  // Handle close drawer
  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setSelectedUser(null);
  };

  // Handle save user profile
  const handleSaveUser = async (
    userId: string,
    profileData: {
      firstname: string;
      middlename: string;
      lastname: string;
      department: string;
      phoneNumber: string;
    }
  ) => {
    try {
      const result = await updateUserProfile(userId, profileData);
      message.success(result.message || 'User profile updated successfully');
      // Update selected user with new data
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          ...profileData,
        });
      }
    } catch (error: any) {
      message.error(error.message || 'Failed to update user profile');
      throw error; // Re-throw to prevent drawer from closing
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

  // Handle delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      await deleteUser(userId);
      message.success(`User "${userName}" deleted successfully`);
    } catch (error: any) {
      message.error(error.message || 'Failed to delete user');
    }
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
                  onViewUser={handleViewUser}
                />
              )}
            </Card>
          </Space>

          {/* User Actions Drawer */}
          <UserActionsDrawer
            open={drawerVisible}
            user={selectedUser}
            currentUserId={userProfile?.id || ''}
            onClose={handleCloseDrawer}
            onSaveProfile={handleSaveUser}
            onQuickStatusChange={handleQuickStatusChange}
            onQuickRoleChange={handleQuickRoleChange}
            onDelete={handleDeleteUser}
            loading={refreshing}
          />
        </Content>
      </Layout>
    </AdminLayout>
  );
};
