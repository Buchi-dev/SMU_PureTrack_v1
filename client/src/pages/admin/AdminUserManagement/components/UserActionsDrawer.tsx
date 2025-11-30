/**
 * User Actions Drawer Component
 * Displays user details and available actions in a drawer panel
 * Includes inline editing mode for user profile
 */

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Space,
  Button,
  Descriptions,
  Tag,
  Avatar,
  Typography,
  Divider,
  Modal,
  Form,
  Input,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
  SwapOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  CloseOutlined,
  PhoneOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import type { UserListData, UserRole, UserStatus } from '../../../../schemas';
import dayjs from 'dayjs';
import { getErrorMessage } from '../../../../utils/errorHelpers';
import { message as antMessage } from 'antd';

const { Title, Text } = Typography;

interface UserActionsDrawerProps {
  open: boolean;
  user: UserListData | null;
  currentUserId: string; // ID of the logged-in user
  onClose: () => void;
  onSaveProfile: (
    userId: string,
    profileData: {
      firstName: string;
      middleName: string;
      lastName: string;
      department: string;
      phoneNumber: string;
    }
  ) => Promise<void>;
  onQuickStatusChange: (userId: string, status: UserStatus) => Promise<void>;
  onQuickRoleChange: (userId: string, role: UserRole) => Promise<void>;
  onDelete: (userId: string, userName: string) => Promise<void>;
  loading?: boolean;
}

interface FormValues {
  firstName: string;
  middleName: string;
  lastName: string;
  department: string;
  phoneNumber: string;
}

/**
 * Get status tag color based on user status
 */
const getStatusColor = (status: UserStatus): string => {
  const colors: Record<UserStatus, string> = {
    active: 'success',
    pending: 'warning',
    suspended: 'error',
  };
  return colors[status] || 'default';
};

/**
 * Get status icon based on user status
 */
const getStatusIcon = (status: UserStatus) => {
  const icons: Record<UserStatus, React.ReactNode> = {
    active: <CheckCircleOutlined />,
    pending: <ExclamationCircleOutlined />,
    suspended: <StopOutlined />,
  };
  return icons[status] || null;
};

/**
 * Get role tag color based on user role
 */
const getRoleColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    admin: 'red',
    staff: 'blue',
  };
  return colors[role] || 'default';
};

export const UserActionsDrawer: React.FC<UserActionsDrawerProps> = ({
  open,
  user,
  currentUserId,
  onClose,
  onSaveProfile,
  onQuickStatusChange,
  onQuickRoleChange,
  onDelete,
  loading = false,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  
  // Local state to track current user data for instant updates
  const [currentUser, setCurrentUser] = useState<UserListData | null>(user);
  
  // Check if viewing own profile
  const isOwnProfile = currentUser?.id === currentUserId;

  // Update current user when prop changes
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // Reset edit mode when drawer closes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
      setIsDeleting(false);
      setIsChangingStatus(false);
      setIsChangingRole(false);
      form.resetFields();
    }
  }, [open]);

  // Update form when current user changes
  useEffect(() => {
    if (currentUser) {
      form.setFieldsValue({
        firstName: currentUser.firstName || '',
        middleName: currentUser.middleName || '',
        lastName: currentUser.lastName || '',
        department: currentUser.department || '',
        phoneNumber: currentUser.phoneNumber || '',
      });
    }
  }, [currentUser, form]);

  if (!currentUser) return null;

  // Join name parts conditionally to avoid extra whitespace
  const userName = [currentUser.firstName, currentUser.middleName, currentUser.lastName]
    .filter(Boolean)
    .join(' ') || 'Unknown User';

  /**
   * Handle delete user with confirmation
   */
  const handleDeleteClick = () => {
    Modal.confirm({
      title: 'Delete User Account',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>Are you sure you want to delete this user account?</p>
          <p><strong>User:</strong> {userName}</p>
          <p><strong>Email:</strong> {currentUser.email}</p>
          <p style={{ color: '#ff4d4f', marginTop: 12 }}>
            ⚠️ <strong>Warning:</strong> This action will:
          </p>
          <ul style={{ color: '#666', marginLeft: 20 }}>
            <li>Delete the user from Firebase Authentication</li>
            <li>Delete all user data from the database</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>
      ),
      okText: 'Delete User',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setIsDeleting(true);
        try {
          await onDelete(currentUser.id, userName);
          // Only close drawer on successful deletion
          onClose();
        } catch (error) {
          const errorMsg = getErrorMessage(error);
          antMessage.error(errorMsg);
          console.error('[UserActionsDrawer] Delete failed:', errorMsg);
          // Keep drawer open on failure
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  /**
   * Handle edit mode toggle
   */
  const handleEditClick = () => {
    setIsEditMode(true);
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Reset form to original values
    if (currentUser) {
      form.setFieldsValue({
        firstName: currentUser.firstName || '',
        middleName: currentUser.middleName || '',
        lastName: currentUser.lastName || '',
        department: currentUser.department || '',
        phoneNumber: currentUser.phoneNumber || '',
      });
    }
  };

  /**
   * Handle save profile
   */
  const handleSaveProfile = async () => {
    try {
      const values = await form.validateFields();
      await onSaveProfile(currentUser.id, values);
      // Update local state with new profile data
      setCurrentUser({
        ...currentUser,
        ...values,
      });
      setIsEditMode(false);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  /**
   * Handle status change with error handling and rollback
   */
  const handleStatusChange = async (status: UserStatus) => {
    const previousStatus = currentUser.status;
    
    // Warn if changing own status
    if (isOwnProfile) {
      Modal.confirm({
        title: 'Change Your Own Status?',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: (
          <div>
            <p>You are about to change your own account status.</p>
            <p style={{ color: '#faad14', marginTop: 12 }}>
              ⚠️ <strong>Warning:</strong> This action will:
            </p>
            <ul style={{ color: '#666', marginLeft: 20 }}>
              <li>Log you out immediately after the change</li>
              <li>You will need to log back in</li>
              {status === 'suspended' && <li style={{ color: '#ff4d4f' }}><strong>Suspend your own account</strong> - you won't be able to log back in!</li>}
            </ul>
            <p style={{ marginTop: 12 }}>Are you sure you want to continue?</p>
          </div>
        ),
        okText: 'Yes, Change Status',
        okType: status === 'suspended' ? 'danger' : 'primary',
        cancelText: 'Cancel',
        onOk: async () => {
          setIsChangingStatus(true);
          // Optimistic update
          setCurrentUser({
            ...currentUser,
            status,
          });
          
          try {
            await onQuickStatusChange(currentUser.id, status);
          } catch (error) {
            // Rollback on failure
            setCurrentUser({
              ...currentUser,
              status: previousStatus,
            });
            const errorMsg = getErrorMessage(error);
            antMessage.error(errorMsg);
            console.error('[UserActionsDrawer] Status change failed:', errorMsg);
          } finally {
            setIsChangingStatus(false);
          }
        },
      });
    } else {
      // Not own profile, update with error handling
      setIsChangingStatus(true);
      // Optimistic update
      setCurrentUser({
        ...currentUser,
        status,
      });
      
      try {
        await onQuickStatusChange(currentUser.id, status);
      } catch (error) {
        // Rollback on failure
        setCurrentUser({
          ...currentUser,
          status: previousStatus,
        });
        const errorMsg = getErrorMessage(error);
        antMessage.error(errorMsg);
        console.error('[UserActionsDrawer] Status change failed:', errorMsg);
      } finally {
        setIsChangingStatus(false);
      }
    }
  };

  /**
   * Handle role change with error handling and rollback
   */
  const handleRoleChange = async (role: UserRole) => {
    const previousRole = currentUser.role;
    
    // Warn if changing own role
    if (isOwnProfile) {
      Modal.confirm({
        title: 'Change Your Own Role?',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: (
          <div>
            <p>You are about to change your own user role.</p>
            <p style={{ color: '#faad14', marginTop: 12 }}>
              ⚠️ <strong>Warning:</strong> This action will:
            </p>
            <ul style={{ color: '#666', marginLeft: 20 }}>
              <li>Log you out immediately after the change</li>
              <li>Update your access permissions</li>
              <li>You will need to log back in</li>
              {role === 'staff' && <li style={{ color: '#ff4d4f' }}><strong>Remove your Admin privileges</strong></li>}
            </ul>
            <p style={{ marginTop: 12 }}>Are you sure you want to continue?</p>
          </div>
        ),
        okText: 'Yes, Change Role',
        okType: 'primary',
        cancelText: 'Cancel',
        onOk: async () => {
          setIsChangingRole(true);
          // Optimistic update
          setCurrentUser({
            ...currentUser,
            role,
          });
          
          try {
            await onQuickRoleChange(currentUser.id, role);
          } catch (error) {
            // Rollback on failure
            setCurrentUser({
              ...currentUser,
              role: previousRole,
            });
            const errorMsg = getErrorMessage(error);
            antMessage.error(errorMsg);
            console.error('[UserActionsDrawer] Role change failed:', errorMsg);
          } finally {
            setIsChangingRole(false);
          }
        },
      });
    } else {
      // Not own profile, update with error handling
      setIsChangingRole(true);
      // Optimistic update
      setCurrentUser({
        ...currentUser,
        role,
      });
      
      try {
        await onQuickRoleChange(currentUser.id, role);
      } catch (error) {
        // Rollback on failure
        setCurrentUser({
          ...currentUser,
          role: previousRole,
        });
        const errorMsg = getErrorMessage(error);
        antMessage.error(errorMsg);
        console.error('[UserActionsDrawer] Role change failed:', errorMsg);
      } finally {
        setIsChangingRole(false);
      }
    }
  };

  return (
    <Drawer
      title={
        <Space>
          {isEditMode && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleCancelEdit}
              style={{ marginRight: 8 }}
            />
          )}
          <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
            {(currentUser.firstName?.[0] || '')}{(currentUser.lastName?.[0] || '')}
          </Avatar>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              {isEditMode ? 'Edit Profile' : userName}
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>{currentUser.email}</Text>
          </div>
        </Space>
      }
      placement="right"
      width={isEditMode ? 680 : 560}
      onClose={onClose}
      open={open}
      styles={{
        body: { padding: '24px' }
      }}
      footer={
        isEditMode ? (
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancelEdit} icon={<CloseOutlined />}>
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSaveProfile}
              loading={loading}
              icon={<SaveOutlined />}
            >
              Save Changes
            </Button>
          </Space>
        ) : null
      }
    >
      {isEditMode ? (
        // EDIT MODE - Show Edit Form
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            firstName: currentUser.firstName || '',
            middleName: currentUser.middleName || '',
            lastName: currentUser.lastName || '',
            department: currentUser.department || '',
            phoneNumber: currentUser.phoneNumber || '',
          }}
        >
          <div>
              {/* Current Read-Only Info */}
              <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  Account Information (Read-only)
                </Text>
                <Row gutter={[16, 8]}>
                  <Col span={24}>
                    <Text type="secondary">Email: </Text>
                    <Text strong>{currentUser.email}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Status: </Text>
                    <Tag icon={getStatusIcon(currentUser.status)} color={getStatusColor(currentUser.status)}>
                      {currentUser.status === 'active' ? 'Active' : currentUser.status === 'pending' ? 'Pending' : 'Suspended'}
                    </Tag>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Role: </Text>
                    <Tag color={getRoleColor(currentUser.role)}>
                      {currentUser.role === 'admin' ? 'Admin' : 'Staff'}
                    </Tag>
                  </Col>
                </Row>
              </div>            <Divider orientation="left">Name Information</Divider>

            {/* Name Fields */}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="firstName"
                  label="First Name"
                  rules={[
                    { required: true, message: 'First name is required' },
                    { min: 2, message: 'Min 2 characters' },
                    { max: 50, message: 'Max 50 characters' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="First name"
                    size="large"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="middleName"
                  label="Middle Name"
                  rules={[
                    { max: 50, message: 'Max 50 characters' },
                  ]}
                >
                  <Input
                    placeholder="Middle name"
                    size="large"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="lastName"
                  label="Last Name"
                  rules={[
                    { required: true, message: 'Last name is required' },
                    { min: 2, message: 'Min 2 characters' },
                    { max: 50, message: 'Max 50 characters' },
                  ]}
                >
                  <Input
                    placeholder="Last name"
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Contact Information</Divider>

            {/* Department Field */}
            <Form.Item
              name="department"
              label="Department"
              rules={[
                { required: true, message: 'Department is required' },
                { min: 2, message: 'Min 2 characters' },
                { max: 100, message: 'Max 100 characters' },
              ]}
            >
              <Input
                prefix={<TeamOutlined />}
                placeholder="Enter department"
                size="large"
              />
            </Form.Item>

            {/* Phone Number Field */}
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[
                { required: true, message: 'Phone number is required' },
                { 
                  pattern: /^\d{11}$/,
                  message: 'Phone number must be exactly 11 digits'
                },
              ]}
              extra="Must be exactly 11 digits (e.g., 09171234567)"
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="09171234567"
                maxLength={11}
                size="large"
                onChange={(e) => {
                  // Auto-strip non-digits
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  form.setFieldsValue({ phoneNumber: digitsOnly });
                }}
              />
            </Form.Item>
          </div>
        </Form>
      ) : (
        // VIEW MODE - Show User Details and Actions
        <>
          {/* User Details Section */}
          <div style={{ marginBottom: 28 }}>
            <Title level={5} style={{ marginBottom: 16, fontSize: 18 }}>User Information</Title>
            
            {/* Account Status Card */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0f5ff',
                borderRadius: '8px',
                marginBottom: 16,
                border: '1px solid #d6e4ff',
              }}
            >
              <Row gutter={[16, 12]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    Account Status
                  </Text>
                  <Tag 
                    icon={getStatusIcon(currentUser.status)} 
                    color={getStatusColor(currentUser.status)}
                    style={{ marginTop: 4, fontSize: 13, padding: '4px 12px' }}
                  >
                    {currentUser.status}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    User Role
                  </Text>
                  <Tag 
                    color={getRoleColor(currentUser.role)}
                    style={{ marginTop: 4, fontSize: 13, padding: '4px 12px' }}
                  >
                    {currentUser.role}
                  </Tag>
                </Col>
              </Row>
            </div>

            <Descriptions 
              column={1} 
              bordered 
              size="middle"
              labelStyle={{ 
                fontWeight: 600, 
                width: '35%',
                backgroundColor: '#fafafa',
              }}
              contentStyle={{
                backgroundColor: 'white',
              }}
            >
              <Descriptions.Item label="Full Name">
                <Text strong style={{ fontSize: 14 }}>{userName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <Text copyable style={{ fontSize: 14 }}>{currentUser.email}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                <Text style={{ fontSize: 14 }}>{currentUser.department}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Phone Number">
                <Text copyable={!!currentUser.phoneNumber} style={{ fontSize: 14 }}>
                  {currentUser.phoneNumber || <Text type="secondary">Not provided</Text>}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Account Created">
                <Text style={{ fontSize: 14 }}>
                  {dayjs(currentUser.createdAt).format('MMM DD, YYYY h:mm A')}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Last Login">
                <Text style={{ fontSize: 14 }}>
                  {currentUser.lastLogin 
                    ? dayjs(currentUser.lastLogin).format('MMM DD, YYYY h:mm A') 
                    : <Text type="secondary">Never</Text>}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider style={{ margin: '24px 0' }} />

          {/* Actions Section */}
          <div>
            <Title level={5} style={{ marginBottom: 20, fontSize: 18 }}>Available Actions</Title>
            
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Primary Action - Edit Profile */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#fafafa',
                  borderRadius: '12px',
                  border: '1px solid #e8e8e8',
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
                      <EditOutlined /> Edit User Profile
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Modify user's name, department, and contact information
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    size="large"
                    block
                    onClick={handleEditClick}
                    style={{
                      fontWeight: 500,
                      height: 44,
                    }}
                  >
                    Edit Profile
                  </Button>
                </Space>
              </div>

              {/* Change Status Section */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#fafafa',
                  borderRadius: '12px',
                  border: '1px solid #e8e8e8',
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
                      Change User Status
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Approve or suspend user access
                    </Text>
                  </div>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Button
                        icon={<CheckCircleOutlined />}
                        disabled={currentUser.status === 'active' || isChangingStatus || loading}
                        loading={isChangingStatus}
                        onClick={() => handleStatusChange('active')}
                        size="large"
                        block
                        style={{ 
                          backgroundColor: currentUser.status === 'active' ? undefined : '#f6ffed',
                          borderColor: currentUser.status === 'active' ? undefined : '#52c41a',
                          color: currentUser.status === 'active' ? undefined : '#52c41a',
                          fontWeight: 500,
                          height: 44,
                        }}
                      >
                        Approve
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Button
                        icon={<StopOutlined />}
                        disabled={currentUser.status === 'suspended' || isChangingStatus || loading}
                        loading={isChangingStatus}
                        onClick={() => handleStatusChange('suspended')}
                        danger={currentUser.status !== 'suspended'}
                        size="large"
                        block
                        style={{
                          fontWeight: 500,
                          height: 44,
                        }}
                      >
                        Suspend
                      </Button>
                    </Col>
                  </Row>
                </Space>
              </div>

              {/* Change Role Section */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: '#fafafa',
                  borderRadius: '12px',
                  border: '1px solid #e8e8e8',
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
                      <SwapOutlined /> Change User Role
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Assign administrative or staff privileges
                    </Text>
                  </div>
                  <Row gutter={12}>
                    <Col span={12}>
                      <Button
                        disabled={currentUser.role === 'admin' || isChangingRole || loading}
                        loading={isChangingRole}
                        onClick={() => handleRoleChange('admin')}
                        size="large"
                        block
                        style={{ 
                          backgroundColor: currentUser.role === 'admin' ? undefined : '#fff1f0',
                          borderColor: currentUser.role === 'admin' ? undefined : '#ff4d4f',
                          color: currentUser.role === 'admin' ? undefined : '#ff4d4f',
                          fontWeight: 500,
                          height: 44,
                        }}
                      >
                        Make Admin
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Button
                        disabled={currentUser.role === 'staff' || isChangingRole || loading}
                        loading={isChangingRole}
                        onClick={() => handleRoleChange('staff')}
                        size="large"
                        block
                        style={{ 
                          backgroundColor: currentUser.role === 'staff' ? undefined : '#e6f7ff',
                          borderColor: currentUser.role === 'staff' ? undefined : '#1890ff',
                          color: currentUser.role === 'staff' ? undefined : '#1890ff',
                          fontWeight: 500,
                          height: 44,
                        }}
                      >
                        Make Staff
                      </Button>
                    </Col>
                  </Row>
                </Space>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Danger Zone - Delete User */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: isOwnProfile ? '#f5f5f5' : '#fff1f0',
                  borderRadius: '12px',
                  border: isOwnProfile ? '1px solid #d9d9d9' : '1px solid #ffccc7',
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong style={{ fontSize: 15, color: isOwnProfile ? '#8c8c8c' : '#cf1322', display: 'block', marginBottom: 4 }}>
                      <ExclamationCircleOutlined /> Danger Zone
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {isOwnProfile 
                        ? 'You cannot delete your own account for security reasons'
                        : 'Permanently delete this user account and all associated data'}
                    </Text>
                  </div>
                  <Tooltip 
                    title={isOwnProfile ? "You cannot delete your own account. Please contact another administrator." : ""}
                    placement="top"
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      size="large"
                      block
                      onClick={handleDeleteClick}
                      disabled={isOwnProfile || isDeleting || loading}
                      loading={isDeleting}
                      style={{
                        fontWeight: 600,
                        height: 44,
                      }}
                    >
                      Delete User Account
                    </Button>
                  </Tooltip>
                </Space>
              </div>
            </Space>
          </div>
        </>
      )}
    </Drawer>
  );
};
