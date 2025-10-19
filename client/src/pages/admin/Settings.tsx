import { AdminLayout } from '../../components/layouts';
import { Card, Typography, Space, Tabs } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

const Settings = () => {
  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <SettingOutlined /> Settings
          </Title>
          <Paragraph type="secondary">
            Configure system settings and preferences
          </Paragraph>
        </div>

        <Card>
          <Tabs defaultActiveKey="general">
            <TabPane tab="General" key="general">
              <div style={{ padding: '20px' }}>
                <Title level={4}>General Settings</Title>
                <Paragraph type="secondary">
                  General settings configuration coming soon...
                </Paragraph>
              </div>
            </TabPane>
            <TabPane tab="Security" key="security">
              <div style={{ padding: '20px' }}>
                <Title level={4}>Security Settings</Title>
                <Paragraph type="secondary">
                  Security settings configuration coming soon...
                </Paragraph>
              </div>
            </TabPane>
            <TabPane tab="Notifications" key="notifications">
              <div style={{ padding: '20px' }}>
                <Title level={4}>Notification Settings</Title>
                <Paragraph type="secondary">
                  Notification settings configuration coming soon...
                </Paragraph>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </Space>
    </AdminLayout>
  );
};

export default Settings;
