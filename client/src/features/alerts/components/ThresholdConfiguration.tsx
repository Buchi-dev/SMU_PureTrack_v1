/**
 * Alert Configuration Component
 * Configure alert thresholds and notification preferences
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  Space,
  Typography,
  Divider,
  message,
  Row,
  Col,
  Select,
  Tag,
} from 'antd';
import {
  WarningOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { DEFAULT_THRESHOLDS } from '../../../types/alerts';
import type { AlertThresholds, NotificationPreferences } from '../../../types/alerts';

const { Title, Text } = Typography;

export default function AlertConfiguration() {
  const [form] = Form.useForm();
  const [notifForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Partial<NotificationPreferences>>({
    emailNotifications: true,
    pushNotifications: false,
    alertSeverities: ['Critical', 'Warning'],
    parameters: [],
    devices: [],
    quietHoursEnabled: false,
  });

  // Load current configuration
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      // Load thresholds
      const thresholdsDoc = await getDoc(doc(db, 'alertSettings', 'thresholds'));
      if (thresholdsDoc.exists()) {
        const data = thresholdsDoc.data() as AlertThresholds;
        form.setFieldsValue(data);
      } else {
        form.setFieldsValue(DEFAULT_THRESHOLDS);
      }

      // Load notification preferences (for current user)
      const userId = 'current-user-id'; // Replace with actual user ID
      const prefsDoc = await getDoc(doc(db, 'notificationPreferences', userId));
      if (prefsDoc.exists()) {
        const data = prefsDoc.data() as NotificationPreferences;
        setNotifPrefs(data);
        notifForm.setFieldsValue(data);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      message.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveThresholds = async (values: any) => {
    setSaving(true);
    try {
      const thresholdsData: AlertThresholds = {
        tds: {
          warningMin: values.tds_warningMin,
          warningMax: values.tds_warningMax,
          criticalMin: values.tds_criticalMin,
          criticalMax: values.tds_criticalMax,
          unit: 'ppm',
        },
        ph: {
          warningMin: values.ph_warningMin,
          warningMax: values.ph_warningMax,
          criticalMin: values.ph_criticalMin,
          criticalMax: values.ph_criticalMax,
          unit: '',
        },
        turbidity: {
          warningMin: values.turbidity_warningMin,
          warningMax: values.turbidity_warningMax,
          criticalMin: values.turbidity_criticalMin,
          criticalMax: values.turbidity_criticalMax,
          unit: 'NTU',
        },
        trendDetection: {
          enabled: values.trendDetection_enabled,
          thresholdPercentage: values.trendDetection_thresholdPercentage,
          timeWindowMinutes: values.trendDetection_timeWindowMinutes,
        },
      };

      await setDoc(doc(db, 'alertSettings', 'thresholds'), thresholdsData);
      message.success('Threshold configuration saved successfully');
    } catch (error) {
      console.error('Error saving thresholds:', error);
      message.error('Failed to save threshold configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationPrefs = async (values: any) => {
    setSaving(true);
    try {
      const userId = 'current-user-id'; // Replace with actual user ID
      const prefsData: Partial<NotificationPreferences> = {
        userId,
        email: 'user@example.com', // Replace with actual user email
        emailNotifications: values.emailNotifications,
        pushNotifications: values.pushNotifications,
        alertSeverities: values.alertSeverities || [],
        parameters: values.parameters || [],
        devices: values.devices || [],
        quietHoursEnabled: values.quietHoursEnabled,
        quietHoursStart: values.quietHoursStart,
        quietHoursEnd: values.quietHoursEnd,
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'notificationPreferences', userId), prefsData);
      message.success('Notification preferences saved successfully');
      setNotifPrefs(prefsData);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      message.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    form.setFieldsValue({
      tds_warningMin: DEFAULT_THRESHOLDS.tds.warningMin,
      tds_warningMax: DEFAULT_THRESHOLDS.tds.warningMax,
      tds_criticalMin: DEFAULT_THRESHOLDS.tds.criticalMin,
      tds_criticalMax: DEFAULT_THRESHOLDS.tds.criticalMax,
      ph_warningMin: DEFAULT_THRESHOLDS.ph.warningMin,
      ph_warningMax: DEFAULT_THRESHOLDS.ph.warningMax,
      ph_criticalMin: DEFAULT_THRESHOLDS.ph.criticalMin,
      ph_criticalMax: DEFAULT_THRESHOLDS.ph.criticalMax,
      turbidity_warningMin: DEFAULT_THRESHOLDS.turbidity.warningMin,
      turbidity_warningMax: DEFAULT_THRESHOLDS.turbidity.warningMax,
      turbidity_criticalMin: DEFAULT_THRESHOLDS.turbidity.criticalMin,
      turbidity_criticalMax: DEFAULT_THRESHOLDS.turbidity.criticalMax,
      trendDetection_enabled: DEFAULT_THRESHOLDS.trendDetection.enabled,
      trendDetection_thresholdPercentage: DEFAULT_THRESHOLDS.trendDetection.thresholdPercentage,
      trendDetection_timeWindowMinutes: DEFAULT_THRESHOLDS.trendDetection.timeWindowMinutes,
    });
    message.info('Reset to default values');
  };

  return (
    <div>
      <Title level={3}>
        <WarningOutlined /> Alert Configuration
      </Title>
      <Text type="secondary">
        Configure water quality thresholds and notification preferences
      </Text>

      {/* Threshold Configuration */}
      <Card title="Water Quality Thresholds" style={{ marginTop: 24 }} loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={saveThresholds}
          initialValues={{
            ...DEFAULT_THRESHOLDS,
            tds_warningMin: DEFAULT_THRESHOLDS.tds.warningMin,
            tds_warningMax: DEFAULT_THRESHOLDS.tds.warningMax,
            tds_criticalMin: DEFAULT_THRESHOLDS.tds.criticalMin,
            tds_criticalMax: DEFAULT_THRESHOLDS.tds.criticalMax,
            ph_warningMin: DEFAULT_THRESHOLDS.ph.warningMin,
            ph_warningMax: DEFAULT_THRESHOLDS.ph.warningMax,
            ph_criticalMin: DEFAULT_THRESHOLDS.ph.criticalMin,
            ph_criticalMax: DEFAULT_THRESHOLDS.ph.criticalMax,
            turbidity_warningMin: DEFAULT_THRESHOLDS.turbidity.warningMin,
            turbidity_warningMax: DEFAULT_THRESHOLDS.turbidity.warningMax,
            turbidity_criticalMin: DEFAULT_THRESHOLDS.turbidity.criticalMin,
            turbidity_criticalMax: DEFAULT_THRESHOLDS.turbidity.criticalMax,
            trendDetection_enabled: DEFAULT_THRESHOLDS.trendDetection.enabled,
            trendDetection_thresholdPercentage: DEFAULT_THRESHOLDS.trendDetection.thresholdPercentage,
            trendDetection_timeWindowMinutes: DEFAULT_THRESHOLDS.trendDetection.timeWindowMinutes,
          }}
        >
          {/* TDS Thresholds */}
          <Divider orientation="left">TDS (Total Dissolved Solids) - ppm</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="orange">Warning</Tag> Min</Text>} name="tds_warningMin">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="orange">Warning</Tag> Max</Text>} name="tds_warningMax">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="red">Critical</Tag> Min</Text>} name="tds_criticalMin">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="red">Critical</Tag> Max</Text>} name="tds_criticalMax">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* pH Thresholds */}
          <Divider orientation="left">pH Level</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="orange">Warning</Tag> Min</Text>} name="ph_warningMin">
                <InputNumber min={0} max={14} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="orange">Warning</Tag> Max</Text>} name="ph_warningMax">
                <InputNumber min={0} max={14} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="red">Critical</Tag> Min</Text>} name="ph_criticalMin">
                <InputNumber min={0} max={14} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="red">Critical</Tag> Max</Text>} name="ph_criticalMax">
                <InputNumber min={0} max={14} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Turbidity Thresholds */}
          <Divider orientation="left">Turbidity - NTU</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="orange">Warning</Tag> Min</Text>} name="turbidity_warningMin">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="orange">Warning</Tag> Max</Text>} name="turbidity_warningMax">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="red">Critical</Tag> Min</Text>} name="turbidity_criticalMin">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<Text><Tag color="red">Critical</Tag> Max</Text>} name="turbidity_criticalMax">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Trend Detection */}
          <Divider orientation="left">Trend Detection</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Enable Trend Detection" name="trendDetection_enabled" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Threshold (%)" name="trendDetection_thresholdPercentage">
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Time Window (min)" name="trendDetection_timeWindowMinutes">
                <InputNumber min={5} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Save Thresholds
              </Button>
              <Button onClick={resetToDefaults}>
                Reset to Defaults
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Notification Preferences */}
      <Card title="Notification Preferences" style={{ marginTop: 24 }} loading={loading}>
        <Form
          form={notifForm}
          layout="vertical"
          onFinish={saveNotificationPrefs}
          initialValues={notifPrefs}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Email Notifications" name="emailNotifications" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Push Notifications" name="pushNotifications" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Alert Severities to Receive" name="alertSeverities">
            <Select
              mode="multiple"
              placeholder="Select severities"
              options={[
                { label: 'Critical', value: 'Critical' },
                { label: 'Warning', value: 'Warning' },
                { label: 'Advisory', value: 'Advisory' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Parameters to Monitor" name="parameters">
            <Select
              mode="multiple"
              placeholder="Select parameters (empty = all)"
              options={[
                { label: 'TDS', value: 'tds' },
                { label: 'pH', value: 'ph' },
                { label: 'Turbidity', value: 'turbidity' },
              ]}
            />
          </Form.Item>

          <Divider orientation="left">Quiet Hours</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Enable Quiet Hours" name="quietHoursEnabled" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Start Time" name="quietHoursStart">
                <Select
                  placeholder="HH:00"
                  options={Array.from({ length: 24 }, (_, i) => ({
                    label: `${i.toString().padStart(2, '0')}:00`,
                    value: `${i.toString().padStart(2, '0')}:00`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="End Time" name="quietHoursEnd">
                <Select
                  placeholder="HH:00"
                  options={Array.from({ length: 24 }, (_, i) => ({
                    label: `${i.toString().padStart(2, '0')}:00`,
                    value: `${i.toString().padStart(2, '0')}:00`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              Save Preferences
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
