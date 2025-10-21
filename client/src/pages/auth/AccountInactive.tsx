/**
 * Account Inactive Component
 * Displays an error screen for suspended/inactive accounts
 * Compact single-page design following theme configuration
 * Consistent design pattern with other auth pages
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Tag, Divider, theme, Alert, Spin } from "antd";
import { 
  StopOutlined, 
  LogoutOutlined, 
  MailOutlined,
  WarningOutlined,
  InfoCircleOutlined 
} from "@ant-design/icons";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

const { Title, Text } = Typography;

export default function AccountInactive() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = theme.useToken();

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in - redirect to login
        navigate("/auth/login");
        return;
      }

      setUserEmail(user.email || "");

      // Listen for real-time updates to user status
      const userDocRef = doc(db, "users", user.uid);
      
      unsubscribeSnapshot = onSnapshot(
        userDocRef,
        (docSnapshot) => {
          if (!docSnapshot.exists()) {
            console.warn("User document does not exist");
            setLoading(false);
            return;
          }

          const userData = docSnapshot.data();
          const status = userData.status;
          
          // Set user name for display
          setUserName(`${userData.firstname} ${userData.lastname}`);

          console.log("User status:", status);

          // Check if profile is incomplete
          if (!userData.department || !userData.phoneNumber) {
            console.log("User needs to complete profile");
            navigate("/auth/complete-account");
            return;
          }

          // If status changes to Approved, redirect to dashboard
          if (status === "Approved") {
            console.log("User approved! Redirecting to dashboard...");
            const role = userData.role;
            
            if (role === "Admin") {
              navigate("/admin/dashboard");
            } else {
              navigate("/staff/dashboard");
            }
            return;
          }

          // If status changes to Pending
          if (status === "Pending") {
            console.log("Status changed to Pending");
            navigate("/auth/pending-approval");
            return;
          }

          // Status is Suspended - stay on this page
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to user status:", error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleContactAdmin = () => {
    // Open email client with pre-filled subject
    const subject = encodeURIComponent(`Account Suspended - Support Request from ${userName || userEmail}`);
    const body = encodeURIComponent(`Hello Admin,\n\nMy account has been suspended and I would like to request a review.\n\nAccount Details:\nName: ${userName}\nEmail: ${userEmail}\n\nThank you.`);
    window.location.href = `mailto:admin@wqm.com?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: token.colorBgLayout,
        }}
      >
        <Spin size="large" tip="Checking account status..." />
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
        background: token.colorBgLayout,
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
        {/* Header with Icon */}
        <Space direction="vertical" size="middle" style={{ width: "100%", textAlign: "center" }}>
          <div>
            <StopOutlined 
              style={{ 
                fontSize: 56, 
                color: token.colorError,
                marginBottom: token.marginMD,
              }} 
            />
            <Title level={3} style={{ margin: 0, marginBottom: token.marginXS }}>
              Account Suspended
            </Title>
            <Text type="secondary">
              Your account has been suspended
            </Text>
          </div>

          <Divider style={{ margin: `${token.marginXS}px 0` }} />

          {/* User Info */}
          <div style={{ 
            background: token.colorErrorBg, 
            padding: token.paddingSM,
            borderRadius: token.borderRadius,
            border: `1px solid ${token.colorErrorBorder}`,
            width: "100%",
          }}>
            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text strong style={{ fontSize: 13 }}>
                Account Information
              </Text>
              {userName && (
                <Text style={{ fontSize: 12 }}>
                  <strong>Name:</strong> {userName}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                <strong>Email:</strong> {userEmail}
              </Text>
            </Space>
          </div>
          
          <Tag 
            icon={<StopOutlined />} 
            color="error"
            style={{ 
              margin: "0 auto",
              fontSize: 13,
              padding: `${token.paddingXXS}px ${token.paddingSM}px`,
            }}
          >
            Status: Suspended
          </Tag>

          <Divider style={{ margin: `${token.marginXS}px 0` }} />

          {/* Alert Messages */}
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Alert
              message="Why was my account suspended?"
              description={
                <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
                  <Text style={{ fontSize: 12 }}>• Violation of system policies</Text>
                  <Text style={{ fontSize: 12 }}>• Security concerns</Text>
                  <Text style={{ fontSize: 12 }}>• Administrative action</Text>
                  <Text style={{ fontSize: 12 }}>• Account under review</Text>
                </Space>
              }
              type="error"
              icon={<WarningOutlined />}
              showIcon
              style={{ textAlign: "left" }}
            />

            <Alert
              message="What can I do?"
              description={
                <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
                  <Text style={{ fontSize: 12 }}>• Contact system administrator</Text>
                  <Text style={{ fontSize: 12 }}>• Request account review</Text>
                  <Text style={{ fontSize: 12 }}>• Provide clarifications</Text>
                </Space>
              }
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
              style={{ textAlign: "left" }}
            />
          </Space>

          <Divider style={{ margin: `${token.marginXS}px 0` }} />

          {/* Actions */}
          <Space style={{ width: "100%" }} direction="vertical" size="middle">
            <Button
              type="primary"
              size="large"
              icon={<MailOutlined />}
              onClick={handleContactAdmin}
              block
            >
              Contact Administrator
            </Button>
            <Button
              size="middle"
              icon={<LogoutOutlined />}
              onClick={handleSignOut}
              danger
              block
            >
              Sign Out
            </Button>
          </Space>

          {/* Help Text */}
          <Text type="secondary" style={{ fontSize: 12 }}>
            If you believe this is an error, contact support immediately
          </Text>
        </Space>
      </Card>
    </div>
  );
}
