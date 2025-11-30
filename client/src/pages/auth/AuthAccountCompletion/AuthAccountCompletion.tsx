/**
 * Account Completion Component
 * Allows new users to complete their profile by adding department and phone number
 * After completion, redirects to pending approval page
 * 
 * Architecture: Uses global hooks for authentication and user mutations
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Form, Input, Select, Alert, message } from "antd";
import { 
  UserOutlined, 
  PhoneOutlined, 
  CheckCircleOutlined 
} from "@ant-design/icons";
import { useAuth } from "../../../hooks";
import { useUserMutations } from "../../../hooks";

const { Title, Text } = Typography;

export const AuthAccountCompletion = () => {
  const { user, loading: authLoading, isAuthenticated, refetchUser } = useAuth();
  const { completeUserProfile, isLoading, error: mutationError } = useUserMutations();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Display mutation errors
  useEffect(() => {
    if (mutationError) {
      message.error(mutationError.message || 'Failed to complete profile');
    }
  }, [mutationError]);

  // Pre-fill form with user data
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        middleName: user.middleName || '',
      });
    }
  }, [user, form]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }

    if (user) {
      // CRITICAL: Domain validation - block personal accounts
      if (!user.email || !user.email.endsWith('@smu.edu.ph')) {
        console.error('[AccountCompletion] Unauthorized access attempt - personal account detected:', user.email);
        message.error('Access denied: Only SMU email addresses (@smu.edu.ph) are allowed.');
        navigate("/auth/login");
        return;
      }
      
      // If user already has department and phone, skip to appropriate page
      if (user.department && user.phoneNumber) {
        // Profile already complete, redirect based on status
        if (user.status === "active") {
          if (user.role === "admin") {
            navigate("/admin/dashboard");
          } else if (user.role === "staff") {
            navigate("/staff/dashboard");
          } else {
            navigate("/dashboard");
          }
        } else if (user.status === "suspended") {
          navigate("/auth/account-suspended");
        } else if (user.status === "pending") {
          navigate("/auth/pending-approval");
        }
      }
      // If user is already active (not a new user), redirect to dashboard
      else if (user.status === "active") {
        if (user.role === "admin") {
          navigate("/admin/dashboard");
        } else if (user.role === "staff") {
          navigate("/staff/dashboard");
        } else {
          navigate("/dashboard");
        }
      }
      // If suspended, redirect to suspended page
      else if (user.status === "suspended") {
        navigate("/auth/account-suspended");
      }
      // Otherwise, stay on this page to complete profile (pending new user)
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleSubmit = async (values: {
    firstName: string;
    lastName: string;
    middleName?: string;
    department: string;
    phoneNumber: string;
  }) => {
    if (!user) return;

    try {
      await completeUserProfile(user._id, {
        firstName: values.firstName,
        lastName: values.lastName,
        middleName: values.middleName,
        department: values.department,
        phoneNumber: values.phoneNumber,
      });

      message.success('Profile completed successfully!');

      // Refresh user data
      await refetchUser();

      // Navigate to pending approval
      navigate("/auth/pending-approval");
    } catch (err) {
      // Error is already handled by useUserMutations hook
      console.error("Error completing profile:", err);
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/smu-building.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "24px",
      }}
    >
      <Card
        variant="borderless"
        style={{
          maxWidth: 680,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Space 
          direction="vertical" 
          size={24} 
          style={{ width: "100%", padding: "8px 0" }}
        >
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <img 
              src="/system_logo.svg" 
              alt="SMU PureTrack Logo" 
              style={{ 
                width: 80, 
                height: 80, 
                marginBottom: 16,
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
                filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.08))",
              }} 
            />
            <Title 
              level={3} 
              style={{ 
                marginBottom: 8,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              Complete Your Profile
            </Title>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: 14,
                display: "block",
              }}
            >
              Welcome! Please provide your information to continue.
            </Text>
          </div>

          {/* Info Alert */}
          <Alert
            message="After submitting, your account will be sent for admin approval."
            type="info"
            showIcon
            style={{
              borderRadius: 8,
            }}
          />

          {/* Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark="optional"
            size="large"
          >
            {/* Name Fields - Two Column Layout */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "16px",
              marginBottom: "16px"
            }}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[
                  { required: true, message: "Please enter your first name" },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="John"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[
                  { required: true, message: "Please enter your last name" },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Doe"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="middleName"
              label="Middle Name (Optional)"
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Middle name"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            {/* Department and Phone - Two Column Layout */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "16px"
            }}>
              <Form.Item
                name="department"
                label="Department"
                rules={[
                  { required: true, message: "Please select your department" },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select your department"
                  style={{ borderRadius: 8 }}
                  options={[
                    { value: "Engineering", label: "Engineering" },
                    { value: "Operations", label: "Operations" },
                    { value: "Maintenance", label: "Maintenance" },
                    { value: "Quality Control", label: "Quality Control" },
                    { value: "Research", label: "Research" },
                    { value: "Administration", label: "Administration" },
                    { value: "IT", label: "IT" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="phoneNumber"
                label="Phone Number"
                rules={[
                  { required: true, message: "Please enter your phone number" },
                  {
                    pattern: /^09\d{9}$/,
                    message: "Please enter a valid 11-digit Philippine phone number (e.g., 09123456789)",
                  },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="09123456789"
                  maxLength={11}
                  style={{ borderRadius: 8 }}
                  onKeyPress={(e) => {
                    // Only allow numbers
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
            </div>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                icon={<CheckCircleOutlined />}
                block
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500,
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
              >
                Complete Profile
              </Button>
            </Form.Item>
          </Form>

          {/* User Info */}
          {user && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: 12,
                  display: "block",
                }}
              >
                Logged in as: {user.email}
              </Text>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};
