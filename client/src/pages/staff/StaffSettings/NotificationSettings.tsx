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
  ClockCircleOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  ApiOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useRealtime_Devices, useCall_Users } from '../../../hooks';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  sendScheduledAlerts?: boolean;
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
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // ✅ GLOBAL HOOKS - Following Service → Hooks → UI architecture
  const { devices: devicesWithReadings } = useRealtime_Devices();
  const { getUserPreferences, setupPreferences, isLoading: saving } = useCall_Users();

  // Transform devices for select component - metadata from DeviceWithSensorData contains full Device object
  const devices = devicesWithReadings.map(d => ({
    deviceId: d.deviceId,
    name: d.deviceName,
    status: d.status,
    location: d.metadata?.metadata?.location // Access nested metadata.metadata.location
  }));

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log('📥 Loading preferences for user:', user.uid);
      
      // ✅ Use global hook instead of direct service call
      const userPrefs = await getUserPreferences(user.uid);

      console.log('📋 Loaded preferences from database:', userPrefs);

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
        
        console.log('📝 Setting form values:', formValues);
        form.setFieldsValue(formValues);
      } else {
        console.log('⚠️ No preferences found, setting defaults');
        // Set defaults for new user
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
      console.error('❌ Error loading preferences:', error);
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
        userId: user.uid,
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

      console.log('💾 Saving notification preferences:', preferencesPayload);

      // ✅ Use global hook instead of direct service call
      const savedPreferences = await setupPreferences(preferencesPayload);

      console.log('✅ Preferences saved successfully:', savedPreferences);
      
      message.success('Notification preferences saved successfully');
      setPreferences(savedPreferences);
      
      // Reload preferences to ensure UI is in sync
      await loadPreferences();
    } catch (error: any) {
      console.error('❌ Error saving preferences:', error);
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
        {/* Top Info Alert */}
        <Alert
          message={preferences ? "Notification Preferences Active" : "Set Up Your Notifications"}
          description={
            preferences
              ? `You're receiving water quality alerts at ${user?.email}. Customize your notification channels and scheduled report preferences below.`
              : `Configure your notification preferences to start receiving real-time water quality alerts and scheduled analytics reports at ${user?.email}.`
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
                        Receive real-time alerts and scheduled reports via email
                      </Text>
                    </div>
                  </Space>
                  <Form.Item
                    name="emailNotifications"
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch size="default" />
                  </Form.Item>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px',
                  background: '#fafafa',
                  borderRadius: '8px',
                }}>
                  <Space size="middle">
                    <MailOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                        Scheduled Analytics Reports
                      </div>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Receive daily, weekly, and monthly analytics via email
                      </Text>
                    </div>
                  </Space>
                  <Form.Item
                    name="sendScheduledAlerts"
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch size="default" />
                  </Form.Item>
                </div>
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
                  <Form.Item
                    name="quietHoursEnabled"
                    valuePropName="checked"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch size="default" />
                  </Form.Item>
                </div>

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
          <Paragraph type="secondary" style={{ marginBottom: '24px', fontSize: '14px' }}>
            Customize which alerts you want to receive based on severity, parameters, and devices
          </Paragraph>

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Alert Severities */}
            <div>
              <div style={{ 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ThunderboltOutlined style={{ fontSize: '16px', color: '#fa8c16' }} />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Alert Severities</span>
              </div>
              <Form.Item
                name="alertSeverities"
                tooltip="Select which severity levels trigger notifications"
                style={{ marginBottom: 0 }}
              >
                <Select
                  mode="multiple"
                  placeholder="Select severity levels to receive notifications"
                  style={{ width: '100%' }}
                  size="large"
                  maxTagCount="responsive"
                  optionLabelProp="label"
                >
                  <Option value="Critical" label="Critical">
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '4px 0'
                    }}>
                      <Space>
                        <Tag color="error" style={{ margin: 0 }}>Critical</Tag>
                        <Text style={{ fontSize: '14px' }}>Critical</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Immediate action required</Text>
                    </div>
                  </Option>
                  <Option value="Warning" label="Warning">
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '4px 0'
                    }}>
                      <Space>
                        <Tag color="warning" style={{ margin: 0 }}>Warning</Tag>
                        <Text style={{ fontSize: '14px' }}>Warning</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Monitor closely</Text>
                    </div>
                  </Option>
                  <Option value="Advisory" label="Advisory">
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '4px 0'
                    }}>
                      <Space>
                        <Tag color="processing" style={{ margin: 0 }}>Advisory</Tag>
                        <Text style={{ fontSize: '14px' }}>Advisory</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Informational only</Text>
                    </div>
                  </Option>
                </Select>
              </Form.Item>
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Leave empty to receive all severity levels
              </Text>
            </div>

            {/* Water Parameters */}
            <div>
              <div style={{ 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ExperimentOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Water Parameters</span>
              </div>
              <Form.Item
                name="parameters"
                tooltip="Filter alerts by specific water quality parameters"
                style={{ marginBottom: 0 }}
              >
                <Select
                  mode="multiple"
                  placeholder="All water quality parameters"
                  style={{ width: '100%' }}
                  allowClear
                  size="large"
                  maxTagCount="responsive"
                  optionLabelProp="label"
                >
                  <Option value="ph" label="pH Level">
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '4px 0'
                    }}>
                      <Space>
                        <Tag color="blue" style={{ margin: 0 }}>pH</Tag>
                        <Text style={{ fontSize: '14px' }}>pH Level</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Acidity/Alkalinity (0-14)</Text>
                    </div>
                  </Option>
                  <Option value="tds" label="TDS">
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '4px 0'
                    }}>
                      <Space>
                        <Tag color="cyan" style={{ margin: 0 }}>TDS</Tag>
                        <Text style={{ fontSize: '14px' }}>Total Dissolved Solids</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Dissolved minerals (ppm)</Text>
                    </div>
                  </Option>
                  <Option value="turbidity" label="Turbidity">
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '4px 0'
                    }}>
                      <Space>
                        <Tag color="geekblue" style={{ margin: 0 }}>Turbidity</Tag>
                        <Text style={{ fontSize: '14px' }}>Turbidity</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Water clarity (NTU)</Text>
                    </div>
                  </Option>
                </Select>
              </Form.Item>
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Leave empty to receive alerts for all parameters
              </Text>
            </div>

            {/* Specific Devices */}
            <div>
              <div style={{ 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ApiOutlined style={{ fontSize: '16px', color: '#52c41a' }} />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Specific Devices</span>
              </div>
              <Form.Item
                name="devices"
                tooltip="Filter alerts by specific monitoring devices"
                style={{ marginBottom: 0 }}
              >
                <Select
                  mode="multiple"
                  placeholder="All monitoring devices"
                  style={{ width: '100%' }}
                  allowClear
                  size="large"
                  maxTagCount="responsive"
                  loading={devices.length === 0}
                  notFoundContent={devices.length === 0 ? "Loading devices..." : "No devices found"}
                  optionLabelProp="label"
                >
                  {devices.map((device) => (
                    <Option 
                      key={device.deviceId} 
                      value={device.deviceId}
                      label={device.name}
                    >
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        padding: '4px 0'
                      }}>
                        <Text style={{ fontSize: '14px', fontWeight: 500 }}>{device.name}</Text>
                        {device.location && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            📍 {device.location.building} - Floor {device.location.floor}
                          </Text>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                Leave empty to monitor all devices
              </Text>
            </div>
          </Space>
        </Card>

        {/* Scheduled Analytics Info */}
        <Alert
          message="Scheduled Analytics Reports"
          description={
            <Space direction="vertical" size={4}>
              <Text>
                When enabled, you'll receive automated analytics reports via email at the following times (Manila Time - UTC+8):
              </Text>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li><strong>Daily Report</strong>: Every day at 6:00 AM (24-hour summary)</li>
                <li><strong>Weekly Report</strong>: Every Monday at 7:00 AM (7-day summary)</li>
                <li><strong>Monthly Report</strong>: 1st of each month at 8:00 AM (30-day summary)</li>
              </ul>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Each report includes device health, alert statistics, water quality trends, and recent events.
              </Text>
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
