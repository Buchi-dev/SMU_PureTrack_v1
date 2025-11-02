/**
 * REDESIGNED ADMIN SETTINGS - ENHANCED UI/UX
 * 
 * Maximizes Ant Design v5 Components:
 * - Collapse for settings sections
 * - Switch for toggles
 * - Slider for numeric values
 * - Segmented for choices
 * - Descriptions for settings info
 * - Card for organized sections
 */

import { AdminLayout } from '../../../components/layouts';
import { 
  Typography, 
  Card,
  Collapse,
  Switch,
  Slider,
  Segmented,
  Descriptions,
  Divider,
  Space,
  Flex,
  Alert,
  Tag,
  Tooltip,
  Button,
} from 'antd';
import type { SegmentedValue } from 'antd/es/segmented';
import { 
  BellOutlined,
  SettingOutlined,
  SafetyOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import NotificationSettings from './NotificationSettings';
import { useResponsiveToken } from '../../../theme';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

export const AdminSettings = () => {
  return (
    <AdminLayout>
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
    </AdminLayout>
  );
};

