/**
 * Account Inactive Component
 * Displays an error screen for suspended/inactive accounts
 * Compact single-page design following theme configuration
 * Consistent design pattern with other auth pages
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Tag, Divider, theme, Spin } from "antd";
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
                  {userName && (
                    <div>
                      <Text strong style={{ fontSize: token.fontSize }}>Name:</Text>
                      <br />
                      <Text style={{ fontSize: token.fontSize }}>{userName}</Text>
                    </div>
                  )}
                  <div>
                    <Text strong style={{ fontSize: token.fontSize }}>Email:</Text>
                    <br />
                    <Text style={{ fontSize: token.fontSize }}>{userEmail}</Text>
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
