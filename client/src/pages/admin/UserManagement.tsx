import { AdminLayout } from '../../components/layouts';
import { Card, Typography, Space } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const UserManagement = () => {
  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <TeamOutlined /> User Management
          </Title>
          <Paragraph type="secondary">
            Manage users, roles, and permissions
          </Paragraph>
        </div>

        <Card>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <TeamOutlined style={{ fontSize: '64px', color: '#001f3f', marginBottom: '20px' }} />
            <Title level={3}>User Management</Title>
            <Paragraph type="secondary">
              User management features coming soon...
            </Paragraph>
          </div>
        </Card>
      </Space>
    </AdminLayout>
  );
};

export default UserManagement;
