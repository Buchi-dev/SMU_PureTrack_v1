/**
 * Pending Approval Component
 * Displays a waiting screen for users whose accounts are pending admin approval
 * Works with Express/Passport.js session-based authentication
 * Handles "pending" status for new user registrations
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Tag, theme } from "antd";
import { 
  ClockCircleOutlined, 
  ReloadOutlined, 
  LogoutOutlined, 
  CheckCircleOutlined,
  MailOutlined 
} from "@ant-design/icons";
import { useAuth } from "../../../contexts";
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
      // CRITICAL: Domain validation - block personal accounts
      if (!user.email || !user.email.endsWith('@smu.edu.ph')) {
        console.error('[PendingApproval] Unauthorized access attempt - personal account detected:', user.email);
        navigate("/auth/login");
        return;
      }
      
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
          maxWidth: 580,
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
          {/* Header with Icon */}
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
            <ClockCircleOutlined 
              style={{ 
                fontSize: 48, 
                color: token.colorWarning,
                marginBottom: 16,
                display: "block",
              }} 
            />
            <Title 
              level={3} 
              style={{ 
                margin: 0, 
                marginBottom: 8,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              Account Pending Approval
            </Title>
            <Text 
              type="secondary"
              style={{ 
                fontSize: 14,
                display: "block",
              }}
            >
              Your account is under review
            </Text>
          </div>

          {/* User Info & Status - Desktop Layout */}
          <div style={{ 
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "16px",
            background: token.colorInfoBg, 
            padding: "20px",
            borderRadius: 8,
            border: `1px solid ${token.colorInfoBorder}`,
            alignItems: "center",
          }}>
            <div style={{ textAlign: "left" }}>
              <Text strong style={{ fontSize: 16, display: "block", marginBottom: 4 }}>
                {user?.displayName || "User"}
              </Text>
              <Text type="secondary" style={{ fontSize: 14 }}>
                {user?.email}
              </Text>
            </div>
            <Tag 
              icon={<ClockCircleOutlined />} 
              color="warning"
              style={{ 
                fontSize: 14,
                padding: "6px 16px",
                margin: 0,
              }}
            >
              Status: Pending
            </Tag>
          </div>

          {/* What's Next */}
          <div style={{ 
            background: token.colorBgLayout, 
            padding: "24px",
            borderRadius: 8,
          }}>
            <Title level={5} style={{ margin: 0, marginBottom: 16, fontSize: 17, fontWeight: 600 }}>
              What happens next?
            </Title>
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
            }}>
              <Space align="start" size="small">
                <CheckCircleOutlined style={{ color: token.colorPrimary, marginTop: 4, fontSize: 18 }} />
                <Text style={{ fontSize: 14, lineHeight: 1.6 }}>Administrator will review your registration</Text>
              </Space>
              <Space align="start" size="small">
                <CheckCircleOutlined style={{ color: token.colorPrimary, marginTop: 4, fontSize: 18 }} />
                <Text style={{ fontSize: 14, lineHeight: 1.6 }}>You'll receive access once approved</Text>
              </Space>
              <Space align="start" size="small">
                <CheckCircleOutlined style={{ color: token.colorPrimary, marginTop: 4, fontSize: 18 }} />
                <Text style={{ fontSize: 14, lineHeight: 1.6 }}>This page auto-updates when status changes</Text>
              </Space>
            </div>
          </div>

          {/* Actions */}
          <div style={{ 
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleCheckAgain}
              size="large"
              style={{
                borderRadius: 8,
                minWidth: 140,
                height: 48,
              }}
            >
              Refresh Status
            </Button>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleSignOut}
              danger
              size="large"
              style={{
                borderRadius: 8,
                minWidth: 140,
                height: 48,
              }}
            >
              Sign Out
            </Button>
          </div>

          {/* Help Text */}
          <Text 
            type="secondary" 
            style={{ 
              fontSize: 12,
              textAlign: "center",
              display: "block",
            }}
          >
            <MailOutlined /> Need help? Contact your administrator
          </Text>
        </Space>
      </Card>
    </div>
  );
}
