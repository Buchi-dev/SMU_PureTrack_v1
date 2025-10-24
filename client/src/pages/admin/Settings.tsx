import { AdminLayout } from '../../components/layouts';
import { Card, Typography, Space, Tabs } from 'antd';
import { SettingOutlined, BellOutlined, SafetyOutlined, LockOutlined, ControlOutlined } from '@ant-design/icons';
import AlertConfiguration from './Settings/AlertConfiguration';
import NotificationSettings from './Settings/NotificationSettings';

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
          <Tabs defaultActiveKey="notifications">
            <TabPane tab={<span><ControlOutlined /> General</span>} key="general">
              <div style={{ padding: '20px' }}>
                <Title level={4}>General Settings</Title>
                <Paragraph type="secondary">
                  General settings configuration coming soon...
                </Paragraph>
              </div>
            </TabPane>
            <TabPane tab={<span><SafetyOutlined /> Alerts</span>} key="alerts">
              <div style={{ padding: '20px' }}>
                <AlertConfiguration />
              </div>
            </TabPane>
            <TabPane tab={<span><BellOutlined /> Notifications</span>} key="notifications">
              <NotificationSettings />
            </TabPane>
            <TabPane tab={<span><LockOutlined /> Security</span>} key="security">
              <div style={{ padding: '20px' }}>
                <Title level={4}>Security Settings</Title>
                <Paragraph type="secondary">
                  Security settings configuration coming soon...
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
