/**
 * User Edit Modal Component
 * Modal for editing user details (status and role)
 */

import React, { useEffect } from 'react';
import { Modal, Form, Select, Space, Typography, Divider, Row, Col, Tag } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, TeamOutlined } from '@ant-design/icons';
import type { UserListData, UserRole, UserStatus } from '../../../../schemas';

const { Text } = Typography;

interface UserEditModalProps {
  visible: boolean;
  user: UserListData | null;
  onCancel: () => void;
  onSave: (userId: string, status?: UserStatus, role?: UserRole) => Promise<void>;
  loading?: boolean;
}

interface FormValues {
  status: UserStatus;
  role: UserRole;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  visible,
  user,
  onCancel,
  onSave,
  loading = false,
}) => {
  const [form] = Form.useForm<FormValues>();

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        status: user.status,
        role: user.role,
      });
    }
  }, [user, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (user) {
        await onSave(user.id, values.status, values.role);
        onCancel();
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

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

  const getRoleColor = (role: UserRole) => {
    return role === 'Admin' ? 'blue' : 'default';
  };

  return (
    <Modal
      title="Edit User"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      width={600}
      okText="Save Changes"
      cancelText="Cancel"
    >
      {user && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* User Information Section */}
          <div>
            <Text strong style={{ fontSize: 16 }}>User Information</Text>
            <Divider style={{ margin: '12px 0' }} />
            
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Space>
                    <UserOutlined style={{ color: '#1890ff' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Full Name</Text>
                      <div>
                        <Text strong>
                          {user.firstname} {user.middlename} {user.lastname}
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space>
                    <TeamOutlined style={{ color: '#52c41a' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Department</Text>
                      <div>
                        <Text strong>{user.department}</Text>
                      </div>
                    </div>
                  </Space>
                </Col>
              </Row>

              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <Space>
                    <MailOutlined style={{ color: '#fa8c16' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Email</Text>
                      <div>
                        <Text strong>{user.email}</Text>
                      </div>
                    </div>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space>
                    <PhoneOutlined style={{ color: '#13c2c2' }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Phone</Text>
                      <div>
                        <Text strong>{user.phoneNumber || 'N/A'}</Text>
                      </div>
                    </div>
                  </Space>
                </Col>
              </Row>

              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Current Status</Text>
                    <div style={{ marginTop: 4 }}>
                      <Tag color={getStatusColor(user.status)}>{user.status}</Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Current Role</Text>
                    <div style={{ marginTop: 4 }}>
                      <Tag color={getRoleColor(user.role)}>{user.role}</Tag>
                    </div>
                  </div>
                </Col>
              </Row>
            </Space>
          </div>

          {/* Edit Form Section */}
          <div>
            <Text strong style={{ fontSize: 16 }}>Update User Settings</Text>
            <Divider style={{ margin: '12px 0' }} />
            
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                status: user.status,
                role: user.role,
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: 'Please select a status' }]}
                  >
                    <Select size="large">
                      <Select.Option value="Pending">
                        <Tag color="warning">Pending</Tag> - Awaiting approval
                      </Select.Option>
                      <Select.Option value="Approved">
                        <Tag color="success">Approved</Tag> - Active user
                      </Select.Option>
                      <Select.Option value="Suspended">
                        <Tag color="error">Suspended</Tag> - Account disabled
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="role"
                    label="Role"
                    rules={[{ required: true, message: 'Please select a role' }]}
                  >
                    <Select size="large">
                      <Select.Option value="Staff">
                        <Tag>Staff</Tag> - Standard access
                      </Select.Option>
                      <Select.Option value="Admin">
                        <Tag color="blue">Admin</Tag> - Full access
                      </Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        </Space>
      )}
    </Modal>
  );
};
