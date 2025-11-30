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
  BugOutlined,
} from "@ant-design/icons";
import { useUsers, useUserMutations } from "../../../hooks";
import { UsersTable } from "./components/UsersTable";
import { UserActionsDrawer } from "./components/UserActionsDrawer";
import { UsersStatistics } from "./components/UsersStatistics";
import type { UserListData, UserRole, UserStatus } from "../../../schemas";

import { AdminLayout } from "../../../components/layouts/AdminLayout";
import { useAuth } from "../../../contexts";
import { diagnoseAndPrint } from "../../../utils/authDiagnostics";
import { getErrorMessage } from "../../../utils/errorHelpers";

const { Title, Text } = Typography;
const { Content } = Layout;

export const AdminUserManagement: React.FC = () => {
  const { token } = theme.useToken();
  const { user: userProfile, refetchUser, loading: authLoading } = useAuth();
  
  // Global READ hook - Real-time user data
  const { 
    users, 
    isLoading: loading, 
    error: realtimeError,
    refetch 
  } = useUsers({ 
    pollInterval: 15000,
    enabled: !authLoading && !!userProfile, // Only fetch when auth is ready
  });

  // Global WRITE hook - User operations
  const {
    updateUserRole,
    updateUserStatus,
    updateUserProfile,
    deleteUser,
    isLoading: refreshing,
    error: writeError,
  } = useUserMutations();

  // Combine errors
  const error = realtimeError?.message || writeError?.message || null;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListData | null>(null);

  /**
   * Auto-logout handler when user changes their own role/status
   * (No longer needed - updateResult removed from useUserMutations)
   */
  // Removed auto-logout effect - handled by backend responses

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
      firstName: string;
      middleName: string;
      lastName: string;
      department: string;
      phoneNumber: string;
    }
  ) => {
    try {
      await updateUserProfile(userId, profileData);
      message.success('User profile updated successfully');
      // Update selected user with new data
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          ...profileData,
        });
      }
      await refetch();
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      message.error(errorMsg);
      console.error('[AdminUserManagement] Update profile error:', errorMsg);
      throw error; // Re-throw to prevent drawer from closing
    }
  };

  // Handle quick status change
  const handleQuickStatusChange = async (
    userId: string,
    status: UserStatus
  ) => {
    try {
      await updateUserStatus(userId, { status });
      message.success(`User status updated to ${status}`);
      
      // If admin changed their own status, sync auth state
      if (userId === userProfile?.id) {
        console.log('[AdminUserManagement] Admin changed own status, syncing auth...');
        await refetchUser();
      }
      
      await refetch();
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      message.error(errorMsg);
      console.error('[AdminUserManagement] Update status error:', errorMsg);
      throw error; // Re-throw for drawer to handle
    }
  };

  // Handle quick role change
  const handleQuickRoleChange = async (userId: string, role: UserRole) => {
    try {
      await updateUserRole(userId, { role });
      message.success(`User role updated to ${role}`);
      
      // If admin changed their own role, sync auth state
      if (userId === userProfile?.id) {
        console.log('[AdminUserManagement] Admin changed own role, syncing auth...');
        await refetchUser();
      }
      
      await refetch();
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      message.error(errorMsg);
      console.error('[AdminUserManagement] Update role error:', errorMsg);
      throw error; // Re-throw for drawer to handle
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      await deleteUser(userId);
      message.success(`User "${userName}" deleted successfully`);
      await refetch(); // Refetch to update the list
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      message.error(errorMsg);
      console.error('[AdminUserManagement] Delete user error:', errorMsg);
      throw error; // Re-throw for drawer to handle
    }
  };

  // Handle diagnostic check
  const handleRunDiagnostics = async () => {
    message.info('Running authentication diagnostics... Check browser console for results.');
    const result = await diagnoseAndPrint();
    
    if (result.success) {
      message.success('Authentication is working correctly!');
    } else {
      message.error(`Authentication issues found: ${result.diagnostics.summary.issues} issue(s)`);
    }
  };

  // Show loading screen while auth is initializing
  if (authLoading) {
    return (
      <AdminLayout>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          background: token.colorBgLayout
        }}>
          <Spin size="large" />
        </div>
      </AdminLayout>
    );
  }

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
            <Card variant="borderless">
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
                    {import.meta.env.DEV && (
                      <Button
                        icon={<BugOutlined />}
                        onClick={handleRunDiagnostics}
                        title="Run authentication diagnostics"
                      >
                        Debug Auth
                      </Button>
                    )}
                    <Button
                      icon={<ReloadOutlined spin={refreshing} />}
                      onClick={() => refetch()}
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
                message={
                  error.includes('Authentication') || error.includes('401') || error.includes('Unauthorized')
                    ? "🔐 Session Expired"
                    : "Error Loading Users"
                }
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>{error}</Text>
                    {(error.includes('Authentication') || error.includes('401') || error.includes('Unauthorized')) && (
                      <>
                        <Text type="secondary">
                          Your authentication token has expired. Firebase tokens expire after 1 hour for security.
                        </Text>
                        <Text strong style={{ color: '#1890ff' }}>
                          Please refresh your session by clicking the button below:
                        </Text>
                        <Space>
                          <Button 
                            size="small" 
                            type="primary"
                            onClick={async () => {
                              message.loading('Refreshing your session...', 0.5);
                              await refetchUser();
                              await refetch();
                              message.success('Authentication refreshed');
                            }}
                          >
                            Refresh Authentication
                          </Button>
                          <Button 
                            size="small"
                            onClick={() => {
                              window.location.reload();
                            }}
                          >
                            Reload Page
                          </Button>
                          {import.meta.env.DEV && (
                            <Button 
                              size="small"
                              icon={<BugOutlined />}
                              onClick={handleRunDiagnostics}
                            >
                              Debug
                            </Button>
                          )}
                        </Space>
                      </>
                    )}
                  </Space>
                }
                type="error"
                showIcon
                closable
              />
            )}

            {/* Statistics Cards */}
            <UsersStatistics users={users} loading={loading} />

            {/* Users Table */}
            <Card
              variant="borderless"
              styles={{ body: { padding: 24 } }}
              title={
                <Space>
                  <UserOutlined />
                  <span>All Users ({users.length})</span>
                </Space>
              }
            >
              {loading && users.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <Spin size="large" />
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
