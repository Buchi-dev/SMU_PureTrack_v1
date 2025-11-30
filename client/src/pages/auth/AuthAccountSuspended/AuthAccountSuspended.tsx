/**
 * Account Suspended Component
 * Displays an error screen for suspended/pending accounts
 * Works with Express/Passport.js session-based authentication
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Tag, theme, Spin } from "antd";
import { 
  StopOutlined, 
  LogoutOutlined, 
  MailOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { useAuth } from "../../../contexts";
import { authService } from "../../../services/auth.Service";

const { Title, Text } = Typography;

export const AuthAccountSuspended = () => {
  const { user, loading: authLoading, isAuthenticated, refetchUser } = useAuth();
  const navigate = useNavigate();
  const { token } = theme.useToken();

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate("/auth/login");
      return;
    }

    // Check status and redirect accordingly
    if (!authLoading && user) {
      console.log("User status:", user.status);

      // If status changes to active, redirect to dashboard
      if (user.status === "active") {
        console.log("User activated! Redirecting to dashboard...");
        
        if (user.role === "admin") {
          navigate("/admin/dashboard");
        } else if (user.role === "staff") {
          navigate("/staff/dashboard");
        } else {
          navigate("/dashboard");
        }
        return;
      }

      // If status is pending
      if (user.status === "pending") {
        console.log("Status is pending");
        // Stay on this page or show different message
      }
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Periodic status check every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const interval = setInterval(async () => {
      console.log("Checking for status updates...");
      await refetchUser();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, user, refetchUser]);

  const handleSignOut = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleContactAdmin = () => {
    const userName = user?.displayName || `${user?.firstName} ${user?.lastName}`;
    const userEmail = user?.email || "";
    
    // Open email client with pre-filled subject
    const subject = encodeURIComponent(`Account Suspended - Support Request from ${userName || userEmail}`);
    const body = encodeURIComponent(`Hello Admin,\n\nMy account has been suspended and I would like to request a review.\n\nAccount Details:\nName: ${userName}\nEmail: ${userEmail}\n\nThank you.`);
    window.location.href = `mailto:admin@wqm.com?subject=${subject}&body=${body}`;
  };

  if (authLoading) {
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
        }}
      >
        <Spin size="large">
          <div style={{ padding: '50px' }} />
        </Spin>
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
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/smu-building.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "24px",
      }}
    >
      <Card
        bordered={false}
        style={{
          maxWidth: 600,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Space 
          direction="vertical" 
          size={28} 
          style={{ width: "100%", padding: "16px 0" }}
        >
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <img 
              src="/system_logo.svg" 
              alt="SMU PureTrack Logo" 
              style={{ 
                width: 90, 
                height: 90, 
                marginBottom: 20,
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
                filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.08))",
              }} 
            />
            <StopOutlined 
              style={{ 
                fontSize: 52, 
                color: token.colorError,
                marginBottom: 16,
                display: "block",
              }} 
            />
            <Title 
              level={3} 
              style={{ 
                margin: 0, 
                marginBottom: 8, 
                color: token.colorError,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              Account Suspended
            </Title>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: 14,
                display: "block",
              }}
            >
              Access to your account has been temporarily restricted
            </Text>
          </div>

          {/* Status Badge */}
          <div style={{ 
            background: token.colorErrorBg, 
            padding: "20px",
            borderRadius: 8,
            border: `2px solid ${token.colorErrorBorder}`,
            textAlign: "center",
          }}>
            <Tag 
              icon={<StopOutlined />} 
              color="error"
              style={{ 
                fontSize: 15,
                padding: "6px 16px",
                margin: 0,
              }}
            >
              SUSPENDED
            </Tag>
          </div>

          {/* User Information */}
          <div style={{ 
            background: token.colorBgLayout, 
            padding: "20px",
            borderRadius: 8,
          }}>
            <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 12, fontWeight: 500 }}>
              Account Details
            </Text>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {user?.displayName && (
                <div>
                  <Text strong style={{ fontSize: 14 }}>Name:</Text>
                  <br />
                  <Text style={{ fontSize: 14 }}>{user.displayName}</Text>
                </div>
              )}
              <div>
                <Text strong style={{ fontSize: 14 }}>Email:</Text>
                <br />
                <Text style={{ fontSize: 14 }}>{user?.email}</Text>
              </div>
            </Space>
          </div>

          {/* Common Reasons */}
          <div style={{ 
            background: token.colorWarningBg, 
            padding: "20px",
            borderRadius: 8,
            border: `1px solid ${token.colorWarningBorder}`,
          }}>
            <Space style={{ marginBottom: 12 }}>
              <WarningOutlined style={{ color: token.colorWarning, fontSize: 16 }} />
              <Text strong style={{ fontSize: 15 }}>
                Common Suspension Reasons
              </Text>
            </Space>
            <Space direction="vertical" size={8} style={{ paddingLeft: 24 }}>
              <Text style={{ fontSize: 14 }}>• Violation of system policies</Text>
              <Text style={{ fontSize: 14 }}>• Security concerns detected</Text>
              <Text style={{ fontSize: 14 }}>• Administrative review in progress</Text>
              <Text style={{ fontSize: 14 }}>• Account verification required</Text>
            </Space>
          </div>

          {/* Actions */}
          <Space style={{ width: "100%", justifyContent: "center" }} size="middle">
            <Button
              type="primary"
              size="large"
              icon={<MailOutlined />}
              onClick={handleContactAdmin}
              style={{
                minWidth: 180,
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              }}
            >
              Contact Administrator
            </Button>
            <Button
              size="large"
              icon={<LogoutOutlined />}
              onClick={handleSignOut}
              danger
              style={{
                minWidth: 120,
                borderRadius: 8,
              }}
            >
              Sign Out
            </Button>
          </Space>

          {/* Footer */}
          <Text 
            type="secondary" 
            style={{ 
              fontSize: 12,
              textAlign: "center",
              display: "block",
            }}
          >
            Response time: Usually within 24-48 hours
          </Text>
        </Space>
      </Card>
    </div>
  );
}
