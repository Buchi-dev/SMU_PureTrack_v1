import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Switch,
  Select,
  TimePicker,
  Button,
  message,
  Spin,
  Typography,
  Divider,
  Alert,
  Space,
  Tag,
} from 'antd';
import {
  BellOutlined,
  MailOutlined,
  MobileOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  alertSeverities: string[];
  parameters: string[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [devices, setDevices] = useState<any[]>([]);

  const CLOUD_FUNCTIONS_URL = 'https://us-central1-my-app-da530.cloudfunctions.net';

  useEffect(() => {
    loadPreferences();
    loadDevices();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Try to get existing preferences
      const response = await fetch(`${CLOUD_FUNCTIONS_URL}/listNotificationPreferences`);
      const data = await response.json();

      if (data.success && data.data) {
        // Find preferences for current user
        const userPrefs = data.data.find((p: any) => p.userId === user.uid);

        if (userPrefs) {
          setPreferences(userPrefs);
          form.setFieldsValue({
            emailNotifications: userPrefs.emailNotifications,
            pushNotifications: userPrefs.pushNotifications,
            alertSeverities: userPrefs.alertSeverities || [],
            parameters: userPrefs.parameters || [],
            devices: userPrefs.devices || [],
            quietHoursEnabled: userPrefs.quietHoursEnabled,
            quietHours: userPrefs.quietHoursStart && userPrefs.quietHoursEnd ? [
              dayjs(userPrefs.quietHoursStart, 'HH:mm'),
              dayjs(userPrefs.quietHoursEnd, 'HH:mm'),
            ] : undefined,
          });
        } else {
          // Set defaults for new user
          form.setFieldsValue({
            emailNotifications: true,
            pushNotifications: false,
            alertSeverities: ['Critical', 'Warning', 'Advisory'],
            parameters: [],
            devices: [],
            quietHoursEnabled: false,
          });
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      message.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch(`${CLOUD_FUNCTIONS_URL}/deviceManagement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LIST_DEVICES' }),
      });

      const data = await response.json();

      if (data.success && data.devices) {
        setDevices(data.devices);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const handleSave = async (values: any) => {
    if (!user) return;

    try {
      setSaving(true);

      const quietHoursStart = values.quietHoursEnabled && values.quietHours?.[0]
        ? values.quietHours[0].format('HH:mm')
        : undefined;

      const quietHoursEnd = values.quietHoursEnabled && values.quietHours?.[1]
        ? values.quietHours[1].format('HH:mm')
        : undefined;

      const requestBody = {
        userId: user.uid,
        email: user.email,
        emailNotifications: values.emailNotifications,
        pushNotifications: values.pushNotifications,
        alertSeverities: values.alertSeverities || [],
        parameters: values.parameters || [],
        devices: values.devices || [],
        quietHoursEnabled: values.quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
      };

      const response = await fetch(`${CLOUD_FUNCTIONS_URL}/setupNotificationPreferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        message.success('Notification preferences saved successfully');
        setPreferences(data.data);
      } else {
        throw new Error(data.error || 'Failed to save preferences');
      }
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      message.error(error.message || 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading notification settings...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div>
            <Title level={3}>
              <SettingOutlined /> Notification Settings
            </Title>
            <Paragraph type="secondary">
              Configure how and when you receive water quality alerts
            </Paragraph>
          </div>

          {/* Info Alert */}
          <Alert
            message="Email Notifications Active"
            description={
              preferences
                ? `You're currently receiving alerts at ${user?.email}. Daily analytics reports are sent every morning at 6:00 AM.`
                : `Set up your notification preferences to start receiving water quality alerts at ${user?.email}.`
            }
            type="info"
            showIcon
            icon={<MailOutlined />}
          />

          <Divider />

          {/* Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{
              emailNotifications: true,
              pushNotifications: false,
              alertSeverities: ['Critical', 'Warning', 'Advisory'],
              parameters: [],
              devices: [],
              quietHoursEnabled: false,
            }}
          >
            {/* Notification Channels */}
            <Card
              size="small"
              title={
                <Space>
                  <BellOutlined />
                  <span>Notification Channels</span>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Form.Item
                name="emailNotifications"
                valuePropName="checked"
                style={{ marginBottom: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <MailOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                    <div>
                      <div><strong>Email Notifications</strong></div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Receive alerts and daily reports via email
                      </Text>
                    </div>
                  </Space>
                  <Switch />
                </div>
              </Form.Item>

              <Form.Item
                name="pushNotifications"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <MobileOutlined style={{ fontSize: 18, color: '#52c41a' }} />
                    <div>
                      <div><strong>Push Notifications</strong></div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Get instant notifications on your device (Coming soon)
                      </Text>
                    </div>
                  </Space>
                  <Switch disabled />
                </div>
              </Form.Item>
            </Card>

            {/* Alert Severities */}
            <Form.Item
              name="alertSeverities"
              label={
                <Space>
                  <span style={{ fontWeight: 600 }}>Alert Severities</span>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                    Choose which severity levels to receive
                  </Text>
                </Space>
              }
            >
              <Select
                mode="multiple"
                placeholder="Select severities to receive"
                style={{ width: '100%' }}
              >
                <Option value="Critical">
                  <Tag color="error">Critical</Tag>
                  Immediate action required
                </Option>
                <Option value="Warning">
                  <Tag color="warning">Warning</Tag>
                  Monitor closely
                </Option>
                <Option value="Advisory">
                  <Tag color="processing">Advisory</Tag>
                  Informational
                </Option>
              </Select>
            </Form.Item>

            {/* Parameters */}
            <Form.Item
              name="parameters"
              label={
                <Space>
                  <span style={{ fontWeight: 600 }}>Water Quality Parameters</span>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                    Empty = receive alerts for all parameters
                  </Text>
                </Space>
              }
            >
              <Select
                mode="multiple"
                placeholder="All parameters (default)"
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="ph">
                  <Tag color="blue">pH Level</Tag>
                  Acidity/Alkalinity
                </Option>
                <Option value="tds">
                  <Tag color="cyan">TDS</Tag>
                  Total Dissolved Solids
                </Option>
                <Option value="turbidity">
                  <Tag color="geekblue">Turbidity</Tag>
                  Water Clarity
                </Option>
              </Select>
            </Form.Item>

            {/* Devices */}
            <Form.Item
              name="devices"
              label={
                <Space>
                  <span style={{ fontWeight: 600 }}>Monitor Specific Devices</span>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                    Empty = receive alerts from all devices
                  </Text>
                </Space>
              }
            >
              <Select
                mode="multiple"
                placeholder="All devices (default)"
                style={{ width: '100%' }}
                allowClear
                loading={devices.length === 0}
              >
                {devices.map((device) => (
                  <Option key={device.deviceId} value={device.deviceId}>
                    {device.name}
                    {device.metadata?.location?.building && (
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        ({device.metadata.location.building})
                      </Text>
                    )}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* Quiet Hours */}
            <Card
              size="small"
              title={
                <Space>
                  <ClockCircleOutlined />
                  <span>Quiet Hours</span>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <Form.Item
                name="quietHoursEnabled"
                valuePropName="checked"
                style={{ marginBottom: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div><strong>Enable Quiet Hours</strong></div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Pause non-critical notifications during specified hours
                    </Text>
                  </div>
                  <Switch />
                </div>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.quietHoursEnabled !== currentValues.quietHoursEnabled}>
                {({ getFieldValue }) =>
                  getFieldValue('quietHoursEnabled') && (
                    <Form.Item
                      name="quietHours"
                      label="Quiet Hours Period"
                      rules={[
                        {
                          required: getFieldValue('quietHoursEnabled'),
                          message: 'Please select quiet hours period',
                        },
                      ]}
                    >
                      <TimePicker.RangePicker
                        format="HH:mm"
                        placeholder={['Start time', 'End time']}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  )
                }
              </Form.Item>
            </Card>

            {/* Actions */}
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  icon={<SaveOutlined />}
                  size="large"
                >
                  Save Preferences
                </Button>
                <Button
                  onClick={() => form.resetFields()}
                  disabled={saving}
                  size="large"
                >
                  Reset
                </Button>
              </Space>
            </Form.Item>
          </Form>

          <Divider />

          {/* Info Section */}
          <Alert
            message="Daily Analytics Report"
            description="Every day at 6:00 AM (Manila Time), you'll receive a comprehensive email with device status, recent alerts, and water quality summaries for all monitored devices."
            type="success"
            showIcon
          />
        </Space>
      </Card>
    </div>
  );
};

export default NotificationSettings;
