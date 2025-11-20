/**
 * Pending Approval Component
 * Displays a waiting screen for users whose accounts are pending admin approval
 * Works with Express/Passport.js session-based authentication
 * Handles "inactive" status as pending approval
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Tag, Divider, theme } from "antd";
import { 
  ClockCircleOutlined, 
  ReloadOutlined, 
  LogoutOutlined, 
  CheckCircleOutlined,
  MailOutlined 
} from "@ant-design/icons";
import { useAuth } from "../../../contexts/AuthContext";
import { authService } from "../../../services/auth.Service";

const { Title, Text } = Typography;

export const AuthPendingApproval = () => {
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
        console.log("User approved! Redirecting to dashboard...");
        
        if (user.role === "admin") {
          navigate("/admin/dashboard");
        } else if (user.role === "staff") {
          navigate("/staff/dashboard");
        } else {
          navigate("/dashboard");
        }
        return;
      }

      // If status changes to suspended
      if (user.status === "suspended") {
        console.log("User suspended! Redirecting...");
        navigate("/auth/account-suspended");
        return;
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

  const handleCheckAgain = async () => {
    await refetchUser();
  };

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
        {/* Header with Icon */}
        <Space direction="vertical" size="middle" style={{ width: "100%", textAlign: "center" }}>
          <div>
            <ClockCircleOutlined 
              style={{ 
                fontSize: 56, 
                color: token.colorWarning,
                marginBottom: token.marginMD,
              }} 
            />
            <Title level={3} style={{ margin: 0, marginBottom: token.marginXS }}>
              Account Pending Approval
            </Title>
            <Text type="secondary">
              Your account is under review
            </Text>
          </div>

          <Divider style={{ margin: `${token.marginXS}px 0` }} />

          {/* User Info */}
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <div style={{ 
              background: token.colorInfoBg, 
              padding: token.paddingSM,
              borderRadius: token.borderRadius,
              border: `1px solid ${token.colorInfoBorder}`,
            }}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Text strong style={{ fontSize: 13 }}>
                  {user?.displayName || "User"}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {user?.email}
                </Text>
              </Space>
            </div>
            <Tag 
              icon={<ClockCircleOutlined />} 
              color="warning"
              style={{ 
                margin: "0 auto",
                fontSize: 13,
                padding: `${token.paddingXXS}px ${token.paddingSM}px`,
              }}
            >
              Status: Pending
            </Tag>
          </Space>

          <Divider style={{ margin: `${token.marginXS}px 0` }} />

          {/* What's Next */}
          <Space direction="vertical" size="small" style={{ width: "100%", textAlign: "left" }}>
            <Title level={5} style={{ margin: 0 }}>
              What happens next?
            </Title>
            <Space direction="vertical" size={2}>
              <Space align="start" size="small">
                <CheckCircleOutlined style={{ color: token.colorPrimary, marginTop: 2 }} />
                <Text style={{ fontSize: 13 }}>Administrator will review your registration</Text>
              </Space>
              <Space align="start" size="small">
                <CheckCircleOutlined style={{ color: token.colorPrimary, marginTop: 2 }} />
                <Text style={{ fontSize: 13 }}>You'll receive access once approved</Text>
              </Space>
              <Space align="start" size="small">
                <CheckCircleOutlined style={{ color: token.colorPrimary, marginTop: 2 }} />
                <Text style={{ fontSize: 13 }}>This page auto-updates when status changes</Text>
              </Space>
            </Space>
          </Space>

          <Divider style={{ margin: `${token.marginXS}px 0` }} />

          {/* Actions */}
          <Space style={{ width: "100%", justifyContent: "center" }} size="middle">
            <Button
              icon={<ReloadOutlined />}
              onClick={handleCheckAgain}
            >
              Refresh
            </Button>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleSignOut}
              danger
            >
              Sign Out
            </Button>
          </Space>

          {/* Help Text */}
          <Text type="secondary" style={{ fontSize: 12 }}>
            <MailOutlined /> Need help? Contact your administrator
          </Text>
        </Space>
      </Card>
    </div>
  );
}
