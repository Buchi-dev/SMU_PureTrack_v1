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
  Alert,
  Space,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  BellOutlined,
  MailOutlined,
  MobileOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  ApiOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
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
          alertSeverities: ['Critical', 'Warning', 'Advisory'],
          parameters: [],
          devices: [],
          quietHoursEnabled: false,
        }}
      >
        {/* Top Info Alert */}
        <Alert
          message={preferences ? "Notification Preferences Active" : "Set Up Your Notifications"}
          description={
            preferences
              ? `You're receiving water quality alerts at ${user?.email}. Daily analytics reports are automatically sent every morning at 6:00 AM (Manila Time).`
              : `Configure your notification preferences to start receiving real-time water quality alerts and daily reports at ${user?.email}.`
          }
          type={preferences ? "success" : "info"}
          showIcon
          icon={preferences ? <CheckCircleOutlined /> : <InfoCircleOutlined />}
          style={{ marginBottom: '24px' }}
        />

        {/* Two Column Layout */}
        <Row gutter={[24, 24]}>
          {/* Left Column */}
          <Col xs={24} lg={12}>
            {/* Notification Channels Card */}
            <Card
              title={
                <Space size="middle">
                  <BellOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Notification Channels</span>
                </Space>
              }
              bordered={false}
              style={{ 
                height: '100%',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Form.Item
                  name="emailNotifications"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: '#fafafa',
                    borderRadius: '8px',
                  }}>
                    <Space size="middle">
                      <MailOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                          Email Notifications
                        </div>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Receive alerts and daily reports via email
                        </Text>
                      </div>
                    </Space>
                    <Switch size="default" />
                  </div>
                </Form.Item>

                <Form.Item
                  name="pushNotifications"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: '#fafafa',
                    borderRadius: '8px',
                  }}>
                    <Space size="middle">
                      <MobileOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                          Push Notifications
                        </div>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Get instant alerts on your mobile device
                        </Text>
                        <div style={{ marginTop: '4px' }}>
                          <Tag color="default" style={{ fontSize: '11px' }}>Coming Soon</Tag>
                        </div>
                      </div>
                    </Space>
                    <Switch size="default" disabled />
                  </div>
                </Form.Item>
              </Space>
            </Card>
          </Col>

          {/* Right Column */}
          <Col xs={24} lg={12}>
            {/* Quiet Hours Card */}
            <Card
              title={
                <Space size="middle">
                  <ClockCircleOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Quiet Hours</span>
                </Space>
              }
              bordered={false}
              style={{ 
                height: '100%',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Form.Item
                  name="quietHoursEnabled"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    background: '#fafafa',
                    borderRadius: '8px',
                  }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                        Enable Quiet Hours
                      </div>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Pause non-critical notifications during rest hours
                      </Text>
                    </div>
                    <Switch size="default" />
                  </div>
                </Form.Item>

                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.quietHoursEnabled !== currentValues.quietHoursEnabled}>
                  {({ getFieldValue }) =>
                    getFieldValue('quietHoursEnabled') ? (
                      <Form.Item
                        name="quietHours"
                        label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Set Time Range</span>}
                        rules={[
                          {
                            required: getFieldValue('quietHoursEnabled'),
                            message: 'Please select quiet hours period',
                          },
                        ]}
                        style={{ marginBottom: 0 }}
                      >
                        <TimePicker.RangePicker
                          format="HH:mm"
                          placeholder={['Start time', 'End time']}
                          style={{ width: '100%' }}
                          size="large"
                        />
                      </Form.Item>
                    ) : (
                      <div style={{ 
                        padding: '20px',
                        textAlign: 'center',
                        color: '#8c8c8c',
                        fontSize: '13px',
                      }}>
                        Enable quiet hours to set a time range
                      </div>
                    )
                  }
                </Form.Item>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Alert Filters Section */}
        <Card
          title={
            <Space size="middle">
              <ThunderboltOutlined style={{ fontSize: '20px', color: '#fa8c16' }} />
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Alert Filters</span>
            </Space>
          }
          bordered={false}
          style={{ 
            marginTop: '24px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
          }}
        >
          <Paragraph type="secondary" style={{ marginBottom: '20px', fontSize: '14px' }}>
            Customize which alerts you want to receive based on severity, parameters, and devices
          </Paragraph>

          <Row gutter={[24, 20]}>
            <Col xs={24} md={8}>
              <Form.Item
                name="alertSeverities"
                label={
                  <Space>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Alert Severities</span>
                  </Space>
                }
                tooltip="Select which severity levels trigger notifications"
              >
                <Select
                  mode="multiple"
                  placeholder="Select severities"
                  style={{ width: '100%' }}
                  size="large"
                  suffixIcon={<ThunderboltOutlined />}
                >
                  <Option value="Critical">
                    <Space>
                      <Tag color="error">Critical</Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Immediate action</Text>
                    </Space>
                  </Option>
                  <Option value="Warning">
                    <Space>
                      <Tag color="warning">Warning</Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Monitor closely</Text>
                    </Space>
                  </Option>
                  <Option value="Advisory">
                    <Space>
                      <Tag color="processing">Advisory</Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Informational</Text>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="parameters"
                label={
                  <Space>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Water Parameters</span>
                  </Space>
                }
                tooltip="Leave empty to receive alerts for all parameters"
              >
                <Select
                  mode="multiple"
                  placeholder="All parameters"
                  style={{ width: '100%' }}
                  allowClear
                  size="large"
                  suffixIcon={<ExperimentOutlined />}
                >
                  <Option value="ph">
                    <Space>
                      <Tag color="blue">pH</Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Acidity/Alkalinity</Text>
                    </Space>
                  </Option>
                  <Option value="tds">
                    <Space>
                      <Tag color="cyan">TDS</Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Dissolved Solids</Text>
                    </Space>
                  </Option>
                  <Option value="turbidity">
                    <Space>
                      <Tag color="geekblue">Turbidity</Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Water Clarity</Text>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="devices"
                label={
                  <Space>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Specific Devices</span>
                  </Space>
                }
                tooltip="Leave empty to monitor all devices"
              >
                <Select
                  mode="multiple"
                  placeholder="All devices"
                  style={{ width: '100%' }}
                  allowClear
                  size="large"
                  suffixIcon={<ApiOutlined />}
                  loading={devices.length === 0}
                  notFoundContent={devices.length === 0 ? "Loading devices..." : "No devices found"}
                >
                  {devices.map((device) => (
                    <Option key={device.deviceId} value={device.deviceId}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{device.name}</div>
                        {device.metadata?.location?.building && (
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {device.metadata.location.building}
                          </Text>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Daily Analytics Info */}
        <Alert
          message="Automated Daily Analytics Report"
          description={
            <Space direction="vertical" size={4}>
              <Text>
                Every morning at <strong>6:00 AM (Manila Time)</strong>, you'll automatically receive a comprehensive email report including:
              </Text>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Device status and health summary</li>
                <li>Recent alerts and critical events</li>
                <li>Water quality trends and statistics</li>
                <li>24-hour activity overview</li>
              </ul>
            </Space>
          }
          type="info"
          showIcon
          icon={<MailOutlined />}
          style={{ marginTop: '24px' }}
        />

        {/* Action Buttons */}
        <div style={{ 
          marginTop: '32px', 
          padding: '24px', 
          background: '#fafafa', 
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text type="secondary">
            Changes will take effect immediately after saving
          </Text>
          <Space size="middle">
            <Button
              onClick={() => form.resetFields()}
              disabled={saving}
              size="large"
            >
              Reset to Default
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<SaveOutlined />}
              size="large"
              style={{ minWidth: '160px' }}
            >
              Save Preferences
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default NotificationSettings;
