/**
 * Account Completion Component
 * Collects additional user information (department, phone number) after first sign-in
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, Space, Alert, message } from "antd";
import { PhoneOutlined, BankOutlined, UserOutlined } from "@ant-design/icons";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

const { Title, Paragraph } = Typography;

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
        if (userData.department && userData.phoneNumber && userData.status !== "Pending") {
          // Profile complete, check status
          if (userData.status === "Approved") {
            navigate("/admin/dashboard");
          } else if (userData.status === "Suspended") {
            navigate("/auth/account-inactive");
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
        updatedAt: new Date(),
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
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
      }}
    >
      <Card
        style={{
          maxWidth: 550,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          borderRadius: "12px",
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <UserOutlined style={{ fontSize: "48px", color: "#667eea" }} />
            <Title level={2} style={{ marginBottom: 8, marginTop: 16 }}>
              Complete Your Profile
            </Title>
            <Paragraph type="secondary">
              Please provide additional information to complete your account setup
            </Paragraph>
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

          {/* Profile Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            requiredMark="optional"
          >
            <Form.Item
              label="First Name"
              name="firstname"
              rules={[
                { required: true, message: "Please enter your first name" },
                { min: 2, message: "First name must be at least 2 characters" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your first name"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Last Name"
              name="lastname"
              rules={[
                { required: true, message: "Please enter your last name" },
                { min: 2, message: "Last name must be at least 2 characters" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your last name"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Middle Name (Optional)"
              name="middlename"
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your middle name"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Department"
              name="department"
              rules={[
                { required: true, message: "Please enter your department" },
                { min: 2, message: "Department must be at least 2 characters" },
              ]}
            >
              <Input
                prefix={<BankOutlined />}
                placeholder="e.g., Engineering, Operations, Research"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Phone Number"
              name="phoneNumber"
              rules={[
                { required: true, message: "Please enter your phone number" },
                {
                  pattern: /^[\d\s\-+()]+$/,
                  message: "Please enter a valid phone number",
                },
                { min: 10, message: "Phone number must be at least 10 digits" },
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="+1 (555) 123-4567"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                block
                style={{ height: "50px", fontSize: "16px" }}
              >
                {loading ? "Saving..." : "Complete Profile"}
              </Button>
            </Form.Item>
          </Form>

          {/* Info Section */}
          <div
            style={{
              background: "#f5f5f5",
              padding: "16px",
              borderRadius: "8px",
              marginTop: "16px",
            }}
          >
            <Paragraph style={{ margin: 0, fontSize: "13px" }} type="secondary">
              <strong>What happens next?</strong>
              <br />
              After completing your profile, an administrator will review and approve your account.
              You'll receive access once approved.
            </Paragraph>
          </div>
        </Space>
      </Card>
    </div>
  );
}
