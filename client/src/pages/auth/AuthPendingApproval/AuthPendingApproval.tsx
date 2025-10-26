/**
 * Pending Approval Component
 * Displays a waiting screen for users whose accounts are pending admin approval
 * Compact single-page design following theme configuration
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Tag, Divider, theme } from "antd";
import { 
  ClockCircleOutlined, 
  ReloadOutlined, 
  LogoutOutlined, 
  CheckCircleOutlined,
  MailOutlined 
} from "@ant-design/icons";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../config/firebase";

const { Title, Text } = Typography;

export const AuthPendingApproval = () => {
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [checking, setChecking] = useState(true);
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
            setChecking(false);
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

          // If status changes to Suspended
          if (status === "Suspended") {
            console.log("User suspended! Redirecting...");
            navigate("/auth/account-inactive");
            return;
          }

          setChecking(false);
        },
        (error) => {
          console.error("Error listening to user status:", error);
          setChecking(false);
        }
      );
    });

    // Cleanup subscriptions
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

  const handleCheckAgain = () => {
    setChecking(true);
    // The onSnapshot listener will automatically check the status
    setTimeout(() => setChecking(false), 1000);
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
                  {userName || "User"}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {userEmail}
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
              loading={checking}
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
