import { AdminLayout } from '../../components/layouts';
import { Card, Typography, Space } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Analytics = () => {
  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <BarChartOutlined /> Analytics
          </Title>
          <Paragraph type="secondary">
            View analytics and insights about your IoT devices
          </Paragraph>
        </div>

        <Card>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BarChartOutlined style={{ fontSize: '64px', color: '#001f3f', marginBottom: '20px' }} />
            <Title level={3}>Analytics Dashboard</Title>
            <Paragraph type="secondary">
              Analytics features coming soon...
            </Paragraph>
          </div>
        </Card>
      </Space>
    </AdminLayout>
  );
};

export default Analytics;
