/**
 * Account Suspended Component
 * Displays an error screen for suspended/inactive accounts
 * Works with Express/Passport.js session-based authentication
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Tag, Divider, theme, Spin } from "antd";
import { 
  StopOutlined, 
  LogoutOutlined, 
  MailOutlined,
  WarningOutlined,
  InfoCircleOutlined 
} from "@ant-design/icons";
import { useAuth } from "../../../contexts/AuthContext";
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

      // If status is inactive
      if (user.status === "inactive") {
        console.log("Status is inactive");
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
          backgroundImage: `linear-gradient(rgba(240, 242, 245, 0.65), rgba(240, 242, 245, 0.65)), url('/4pillars.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <Spin size="large" tip="Checking account status...">
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
        backgroundImage: `linear-gradient(rgba(240, 242, 245, 0.65), rgba(240, 242, 245, 0.65)), url('/4pillars.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: token.paddingLG,
      }}
    >
      <div style={{ maxWidth: 1000, width: "100%" }}>
        {/* Header Section */}
        <div style={{ textAlign: "center", marginBottom: token.marginXL }}>
          <StopOutlined 
            style={{ 
              fontSize: 72, 
              color: token.colorError,
              marginBottom: token.marginMD,
            }} 
          />
          <Title level={2} style={{ margin: 0, marginBottom: token.marginXS, color: token.colorError }}>
            Account Suspended
          </Title>
          <Text type="secondary" style={{ fontSize: token.fontSizeLG }}>
            Access to your account has been temporarily restricted
          </Text>
        </div>

        {/* Main Content - Two Column Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: token.margin, marginBottom: token.marginLG }}>
          
          {/* Left Column - Account Info */}
          <Card
            title={
              <Space>
                <StopOutlined style={{ color: token.colorError }} />
                <Text strong>Account Status</Text>
              </Space>
            }
            bordered={false}
            style={{ boxShadow: token.boxShadow }}
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {/* Status Badge */}
              <div style={{ 
                background: token.colorErrorBg, 
                padding: token.padding,
                borderRadius: token.borderRadiusLG,
                border: `2px solid ${token.colorErrorBorder}`,
                textAlign: "center",
              }}>
                <Tag 
                  icon={<StopOutlined />} 
                  color="error"
                  style={{ 
                    fontSize: token.fontSizeLG,
                    padding: `${token.paddingXS}px ${token.padding}px`,
                    margin: 0,
                  }}
                >
                  SUSPENDED
                </Tag>
              </div>

              <Divider style={{ margin: `${token.marginXS}px 0` }} />

              {/* User Information */}
              <div>
                <Text type="secondary" style={{ fontSize: token.fontSizeSM, display: "block", marginBottom: token.marginXS }}>
                  Account Details
                </Text>
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  {user?.displayName && (
                    <div>
                      <Text strong style={{ fontSize: token.fontSize }}>Name:</Text>
                      <br />
                      <Text style={{ fontSize: token.fontSize }}>{user.displayName}</Text>
                    </div>
                  )}
                  <div>
                    <Text strong style={{ fontSize: token.fontSize }}>Email:</Text>
                    <br />
                    <Text style={{ fontSize: token.fontSize }}>{user?.email}</Text>
                  </div>
                </Space>
              </div>
            </Space>
          </Card>

          {/* Right Column - Why & What to Do */}
          <Card
            title={
              <Space>
                <InfoCircleOutlined style={{ color: token.colorPrimary }} />
                <Text strong>Information</Text>
              </Space>
            }
            bordered={false}
            style={{ boxShadow: token.boxShadow }}
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              {/* Why Suspended */}
              <div>
                <Space style={{ marginBottom: token.marginSM }}>
                  <WarningOutlined style={{ color: token.colorWarning, fontSize: token.fontSizeLG }} />
                  <Text strong style={{ fontSize: token.fontSize }}>
                    Common Suspension Reasons
                  </Text>
                </Space>
                <Space direction="vertical" size="small" style={{ paddingLeft: token.paddingLG }}>
                  <Text style={{ fontSize: token.fontSize }}>• Violation of system policies</Text>
                  <Text style={{ fontSize: token.fontSize }}>• Security concerns detected</Text>
                  <Text style={{ fontSize: token.fontSize }}>• Administrative review in progress</Text>
                  <Text style={{ fontSize: token.fontSize }}>• Account verification required</Text>
                </Space>
              </div>

              <Divider style={{ margin: `${token.marginXS}px 0` }} />

              {/* What to Do */}
              <div>
                <Space style={{ marginBottom: token.marginSM }}>
                  <InfoCircleOutlined style={{ color: token.colorInfo, fontSize: token.fontSizeLG }} />
                  <Text strong style={{ fontSize: token.fontSize }}>
                    Next Steps
                  </Text>
                </Space>
                <Space direction="vertical" size="small" style={{ paddingLeft: token.paddingLG }}>
                  <Text style={{ fontSize: token.fontSize }}>• Contact the system administrator</Text>
                  <Text style={{ fontSize: token.fontSize }}>• Request an account review</Text>
                  <Text style={{ fontSize: token.fontSize }}>• Provide any necessary clarifications</Text>
                  <Text style={{ fontSize: token.fontSize }}>• Wait for admin response</Text>
                </Space>
              </div>
            </Space>
          </Card>
        </div>

        {/* Actions Section */}
        <Card
          bordered={false}
          style={{ 
            boxShadow: token.boxShadow,
            background: token.colorBgContainer,
          }}
        >
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            gap: token.margin,
            flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <Text strong style={{ fontSize: token.fontSizeLG, display: "block", marginBottom: token.marginXS }}>
                Need Help?
              </Text>
              <Text type="secondary" style={{ fontSize: token.fontSize }}>
                If you believe this is an error or need assistance, please contact our support team immediately.
              </Text>
            </div>
            <Space size="middle">
              <Button
                type="primary"
                size="large"
                icon={<MailOutlined />}
                onClick={handleContactAdmin}
                style={{ minWidth: 180 }}
              >
                Contact Administrator
              </Button>
              <Button
                size="large"
                icon={<LogoutOutlined />}
                onClick={handleSignOut}
                danger
                style={{ minWidth: 120 }}
              >
                Sign Out
              </Button>
            </Space>
          </div>
        </Card>

        {/* Footer Help Text */}
        <div style={{ textAlign: "center", marginTop: token.marginLG }}>
          <Text type="secondary" style={{ fontSize: token.fontSize }}>
            Response time: Usually within 24-48 hours
          </Text>
        </div>
      </div>
    </div>
  );
}
