import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Switch,
  Button,
  App,
  Spin,
  Typography,
  Alert,
  Space,
} from 'antd';
import {
  BellOutlined,
  MailOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuth, useUserPreferences, useUserMutations } from '../../../hooks';

const { Text } = Typography;

interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // ✅ GLOBAL HOOKS - Following Service → Hooks → UI architecture
  const { 
    preferences: userPrefs, 
    isLoading: prefsLoading,
    refetch: refetchPreferences 
  } = useUserPreferences({ 
    userId: user?._id || '',
    enabled: !!user?._id 
  }) as { preferences: Record<string, unknown> | null; isLoading: boolean; refetch: () => Promise<void> }; // Type cast to bypass schema mismatch between frontend/backend
  
  const { 
    updateUserPreferences, 
    isLoading: saving 
  } = useUserMutations();

  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log('📥 Loading preferences for user:', user.id);
      
      // ✅ Use preferences from global hook
      if (userPrefs) {
        console.log('📋 Loaded preferences from database:', userPrefs);
        
        // Set preferences (type cast to bypass schema mismatch)
        setPreferences(userPrefs as unknown as NotificationPreferences);
        
        // Extract notification settings (use type assertion for backend schema)
        const prefs = userPrefs as Record<string, unknown>;
        const formValues = {
          emailNotifications: prefs.emailNotifications ?? true,
          pushNotifications: prefs.pushNotifications ?? false,
        };
        
        console.log('📝 Setting form values:', formValues);
        form.setFieldsValue(formValues);
      } else {
        console.log('⚠️ No preferences found, setting defaults');
        // Set defaults for new user
        form.setFieldsValue({
          emailNotifications: true,
          pushNotifications: false,
        });
      }
    } catch (error) {
      console.error('❌ Error loading preferences:', error);
      message.error((error as Error).message || 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, [user, userPrefs, form, message]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);


  const handleSave = async (values: Record<string, unknown>) => {
    if (!user || !user.email) return;

    try {
      interface FormValues {
        emailNotifications?: boolean;
        pushNotifications?: boolean;
      }
      const formValues = values as FormValues;
      
      const preferencesPayload = {
        userId: user.id,
        email: user.email,
        emailNotifications: formValues.emailNotifications ?? false,
        pushNotifications: formValues.pushNotifications ?? false,
      };

      console.log('💾 Saving notification preferences:', preferencesPayload);

      // ✅ Use global hook mutation (type cast to bypass schema mismatch)
      await updateUserPreferences(user._id || user.id, preferencesPayload as Record<string, unknown>);

      console.log('✅ Preferences saved successfully');
      
      message.success('Notification preferences saved successfully');
      
      // Refetch to ensure UI is in sync
      await refetchPreferences();
    } catch (error) {
      console.error('❌ Error saving preferences:', error);
      message.error((error as Error).message || 'Failed to save notification preferences');
    }
  };

  if (loading || prefsLoading) {
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
        }}
      >
        {/* Top Info Alert */}
        <Alert
          message={preferences ? "Notification Preferences Active" : "Set Up Your Notifications"}
          description={
            preferences
              ? `You're receiving water quality alerts at ${user?.email}.`
              : `Configure your notification preferences to start receiving real-time water quality alerts at ${user?.email}.`
          }
          type={preferences ? "success" : "info"}
          showIcon
          icon={preferences ? <CheckCircleOutlined /> : <InfoCircleOutlined />}
          style={{ marginBottom: '24px' }}
        />

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
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
          }}
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
                  Receive real-time alerts via email
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
        </Card>





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
        </div>
      </Form>
    </div>
  );
};

export default NotificationSettings;
