/**
 * NotificationSettings Component
 * 
 * User notification preferences management for AdminSettings.
 * Uses global hooks for all data operations.
 * Components extracted following "One Component Per File" architecture rule.
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  App,
  Spin,
  Typography,
  Row,
  Col,
} from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useRealtime_Devices, useCall_Users, useRouteContext } from '../../../hooks';
import dayjs from 'dayjs';

// Extracted components
import {
  PreferencesStatusAlert,
  NotificationChannelsCard,
  QuietHoursCard,
  AlertSeveritiesFilter,
  WaterParametersFilter,
  DevicesFilter,
  ScheduledReportsInfo,
  SavePreferencesButton,
} from './components';

const { Text, Paragraph } = Typography;

interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  sendScheduledAlerts: boolean;
  alertSeverities: string[];
  parameters: string[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

/**
 * Notification preferences form component
 */
const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Get route context to enable conditional fetching
  const { needsDevices } = useRouteContext();

  // Global hooks - only fetch when on settings page
  const { devices: devicesWithReadings } = useRealtime_Devices({ enabled: needsDevices });
  const { getUserPreferences, setupPreferences, isLoading: saving } = useCall_Users();

  // Transform devices for select component (using any to avoid type conflicts)
  const devices = devicesWithReadings.map((d: any) => ({
    deviceId: d.deviceId,
    name: d.name,
    status: d.status,
    location: d.metadata?.location 
      ? `${d.metadata.location.building}, ${d.metadata.location.floor}`
      : 'Unknown'
  }));

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log('[NotificationSettings] Loading preferences for user:', user.id);
      
      const userPrefs = await getUserPreferences(user.id);

      console.log('[NotificationSettings] Loaded preferences:', userPrefs);

      if (userPrefs) {
        setPreferences(userPrefs);
        
        const formValues = {
          emailNotifications: userPrefs.emailNotifications,
          pushNotifications: userPrefs.pushNotifications,
          sendScheduledAlerts: userPrefs.sendScheduledAlerts ?? true,
          alertSeverities: userPrefs.alertSeverities || [],
          parameters: userPrefs.parameters || [],
          devices: userPrefs.devices || [],
          quietHoursEnabled: userPrefs.quietHoursEnabled,
          quietHours: userPrefs.quietHoursStart && userPrefs.quietHoursEnd ? [
            dayjs(userPrefs.quietHoursStart, 'HH:mm'),
            dayjs(userPrefs.quietHoursEnd, 'HH:mm'),
          ] : undefined,
        };
        
        form.setFieldsValue(formValues);
      } else {
        console.log('[NotificationSettings] No preferences found, setting defaults');
        form.setFieldsValue({
          emailNotifications: true,
          pushNotifications: false,
          sendScheduledAlerts: true,
          alertSeverities: ['Critical', 'Warning', 'Advisory'],
          parameters: [],
          devices: [],
          quietHoursEnabled: false,
        });
      }
    } catch (error: any) {
      console.error('[NotificationSettings] Error loading preferences:', error);
      message.error(error.message || 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    if (!user || !user.email) return;

    try {
      const quietHoursStart = values.quietHoursEnabled && values.quietHours?.[0]
        ? values.quietHours[0].format('HH:mm')
        : undefined;

      const quietHoursEnd = values.quietHoursEnabled && values.quietHours?.[1]
        ? values.quietHours[1].format('HH:mm')
        : undefined;

      const preferencesPayload = {
        userId: user.id,
        email: user.email,
        emailNotifications: values.emailNotifications ?? false,
        pushNotifications: values.pushNotifications ?? false,
        sendScheduledAlerts: values.sendScheduledAlerts ?? true,
        alertSeverities: values.alertSeverities || ['Critical', 'Warning', 'Advisory'],
        parameters: values.parameters || [],
        devices: values.devices || [],
        quietHoursEnabled: values.quietHoursEnabled ?? false,
        quietHoursStart,
        quietHoursEnd,
      };

      console.log('[NotificationSettings] Saving preferences:', preferencesPayload);

      const savedPreferences = await setupPreferences(preferencesPayload);

      console.log('[NotificationSettings] Preferences saved successfully:', savedPreferences);
      
      message.success('Notification preferences saved successfully');
      setPreferences(savedPreferences);
      
      await loadPreferences();
    } catch (error: any) {
      console.error('[NotificationSettings] Error saving preferences:', error);
      message.error(error.message || 'Failed to save notification preferences');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 20 }}>
          <Text type="secondary" style={{ fontSize: '16px' }}>Loading your notification preferences...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          emailNotifications: true,
          pushNotifications: false,
          sendScheduledAlerts: true,
          alertSeverities: ['Critical', 'Warning', 'Advisory'],
          parameters: [],
          devices: [],
          quietHoursEnabled: false,
        }}
      >
        <PreferencesStatusAlert 
          hasPreferences={!!preferences} 
          userEmail={user?.email ?? undefined} 
        />

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <NotificationChannelsCard />
          </Col>

          <Col xs={24} lg={12}>
            <QuietHoursCard />
          </Col>
        </Row>

        <Card
          title={
            <span>
              <ThunderboltOutlined style={{ fontSize: '20px', color: '#fa8c16', marginRight: '8px' }} />
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Alert Filters</span>
            </span>
          }
          bordered={false}
          style={{ 
            marginTop: '24px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
          }}
        >
          <Paragraph type="secondary" style={{ marginBottom: '24px', fontSize: '14px' }}>
            Customize which alerts you want to receive based on severity, parameters, and devices
          </Paragraph>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={8}>
              <AlertSeveritiesFilter />
            </Col>

            <Col xs={24} lg={8}>
              <WaterParametersFilter />
            </Col>

            <Col xs={24} lg={8}>
              <DevicesFilter devices={devices} />
            </Col>
          </Row>
        </Card>

        <ScheduledReportsInfo />

        <SavePreferencesButton loading={saving} />
      </Form>
    </div>
  );
};

export default NotificationSettings;
