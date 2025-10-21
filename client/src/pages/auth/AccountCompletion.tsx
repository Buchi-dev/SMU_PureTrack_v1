/**
 * Account Completion Component
 * Collects additional user information (department, phone number) after first sign-in
 * Compact design following theme configuration
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, Space, Alert, message, Divider, theme } from "antd";
import { PhoneOutlined, BankOutlined, UserOutlined } from "@ant-design/icons";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

const { Title, Text } = Typography;

interface ProfileFormData {
  firstname: string;
  lastname: string;
  middlename?: string;
  department: string;
  phoneNumber: string;
}

export default function AccountCompletion() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token } = theme.useToken();

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in - redirect to login
        navigate("/auth/login");
        return;
      }

      setUserId(user.uid);

      try {
        // Get user profile from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          setError("User profile not found. Please contact administrator.");
          setChecking(false);
          return;
        }

        const userData = userDoc.data();

        // Pre-fill form with existing data
        form.setFieldsValue({
          firstname: userData.firstname || "",
          lastname: userData.lastname || "",
          middlename: userData.middlename || "",
          department: userData.department || "",
          phoneNumber: userData.phoneNumber || "",
        });

        // Check if profile is already complete
        if (userData.department && userData.phoneNumber) {
          // Profile complete, redirect based on status
          if (userData.status === "Approved") {
            const role = userData.role;
            navigate(role === "Admin" ? "/admin/dashboard" : "/staff/dashboard");
            return;
          } else if (userData.status === "Suspended") {
            navigate("/auth/account-inactive");
            return;
          } else if (userData.status === "Pending") {
            navigate("/auth/pending-approval");
            return;
          }
        }

        setChecking(false);
      } catch (err) {
        console.error("Error loading user profile:", err);
        setError("Failed to load profile. Please try again.");
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, form]);

  const handleSubmit = async (values: ProfileFormData) => {
    if (!userId) {
      message.error("User not authenticated");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update user profile in Firestore
      const userDocRef = doc(db, "users", userId);
      
      await updateDoc(userDocRef, {
        firstname: values.firstname,
        lastname: values.lastname,
        middlename: values.middlename || "",
        department: values.department,
        phoneNumber: values.phoneNumber,
        updatedAt: serverTimestamp(),
      });

      message.success("Profile completed successfully!");
      console.log("✓ Profile updated for user:", userId);

      // Redirect to pending approval page
      navigate("/auth/pending-approval");

    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
      message.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: `linear-gradient(rgba(240, 242, 245, 0.65), rgba(240, 242, 245, 0.65)), url('/4pillars.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <Card>
          <Space>
            <div>Loading...</div>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `linear-gradient(rgba(240, 242, 245, 0.65), rgba(240, 242, 245, 0.65)), url('/4pillars.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: token.paddingLG,
      }}
    >
      <Card
        style={{
          maxWidth: 600,
          width: "100%",
          boxShadow: token.boxShadow,
        }}
        bordered={false}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <UserOutlined 
              style={{ 
                fontSize: 56, 
                color: token.colorPrimary,
                marginBottom: token.marginSM,
              }} 
            />
            <Title level={3} style={{ margin: 0, marginBottom: token.marginXS }}>
              Complete Your Profile
            </Title>
            <Text type="secondary">
              Please provide additional information
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          <Divider style={{ margin: `${token.marginXS}px 0` }} />

          {/* Profile Form - Two Column Layout */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            requiredMark="optional"
          >
            {/* Name Fields Row */}
            <Space.Compact style={{ width: "100%", display: "flex", gap: token.marginSM }}>
              <Form.Item
                label="First Name"
                name="firstname"
                rules={[
                  { required: true, message: "Required" },
                  { min: 2, message: "Min 2 characters" },
                ]}
                style={{ flex: 1, marginBottom: token.marginSM }}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="First name"
                />
              </Form.Item>

              <Form.Item
                label="Last Name"
                name="lastname"
                rules={[
                  { required: true, message: "Required" },
                  { min: 2, message: "Min 2 characters" },
                ]}
                style={{ flex: 1, marginBottom: token.marginSM }}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Last name"
                />
              </Form.Item>
            </Space.Compact>

            {/* Middle Name - Full Width */}
            <Form.Item
              label="Middle Name (Optional)"
              name="middlename"
              style={{ marginBottom: token.marginSM }}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your middle name"
              />
            </Form.Item>

            {/* Department and Phone Row */}
            <Space.Compact style={{ width: "100%", display: "flex", gap: token.marginSM }}>
              <Form.Item
                label="Department"
                name="department"
                rules={[
                  { required: true, message: "Required" },
                  { min: 2, message: "Min 2 characters" },
                ]}
                style={{ flex: 1, marginBottom: token.marginSM }}
              >
                <Input
                  prefix={<BankOutlined />}
                  placeholder="e.g., Engineering"
                />
              </Form.Item>

              <Form.Item
                label="Phone Number"
                name="phoneNumber"
                rules={[
                  { required: true, message: "Required" },
                  {
                    pattern: /^[\d\s\-+()]+$/,
                    message: "Invalid format",
                  },
                  { min: 10, message: "Min 10 digits" },
                ]}
                style={{ flex: 1, marginBottom: token.marginSM }}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="+1 (555) 123-4567"
                />
              </Form.Item>
            </Space.Compact>

            <Form.Item style={{ marginBottom: 0, marginTop: token.marginSM }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
              >
                {loading ? "Saving..." : "Complete Profile"}
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: `${token.marginXS}px 0` }} />

          {/* Info Section */}
          <Alert
            message="What happens next?"
            description="After completing your profile, an administrator will review and approve your account."
            type="info"
            showIcon
          />
        </Space>
      </Card>
    </div>
  );
}
