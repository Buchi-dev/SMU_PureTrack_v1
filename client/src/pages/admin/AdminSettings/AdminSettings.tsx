/**
 * AdminSettings Page
 * 
 * Settings management for administrators.
 * Currently focuses on notification preferences.
 * 
 * Uses global hooks for all data operations following architecture guidelines.
 * 
 * @module pages/admin/AdminSettings
 */
import { Layout } from 'antd';
import { SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { PageHeader } from '../../../components/PageHeader';
import NotificationSettings from './NotificationSettings';

const { Content } = Layout;

/**
 * Admin settings page with notification preferences
 */
export const AdminSettings = () => {
  return (
    <AdminLayout>
      <Content style={{ padding: '24px' }}>
        <PageHeader
          title="Settings"
          icon={<SettingOutlined />}
          description="Manage notification preferences and system settings"
          breadcrumbItems={[
            { title: 'Settings', icon: <SettingOutlined /> }
          ]}
          actions={[
            {
              key: 'refresh',
              label: 'Refresh',
              icon: <ReloadOutlined />,
              onClick: () => window.location.reload(),
            }
          ]}
        />

        <div style={{ marginTop: 24 }}>
          <NotificationSettings />
        </div>
      </Content>
    </AdminLayout>
  );
};

