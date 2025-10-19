import { AdminLayout } from '../../components/layouts';
import { Card, Typography, Space } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Reports = () => {
  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <FileTextOutlined /> Reports
          </Title>
          <Paragraph type="secondary">
            Generate and view system reports
          </Paragraph>
        </div>

        <Card>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FileTextOutlined style={{ fontSize: '64px', color: '#001f3f', marginBottom: '20px' }} />
            <Title level={3}>Reports System</Title>
            <Paragraph type="secondary">
              Report generation features coming soon...
            </Paragraph>
          </div>
        </Card>
      </Space>
    </AdminLayout>
  );
};

export default Reports;
