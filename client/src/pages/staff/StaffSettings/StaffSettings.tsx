import { StaffLayout } from '../../../components/layouts';
import { Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import NotificationSettings from './NotificationSettings';

const { Title, Paragraph } = Typography;

export const StaffSettings = () => {
  return (
    <StaffLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BellOutlined style={{ color: '#1890ff' }} />
            Notification Settings
          </Title>
          <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: 0 }}>
            Manage your notification preferences and alerts for water quality monitoring
          </Paragraph>
        </div>

        <NotificationSettings />
      </div>
    </StaffLayout>
  );
};

export default StaffSettings;
