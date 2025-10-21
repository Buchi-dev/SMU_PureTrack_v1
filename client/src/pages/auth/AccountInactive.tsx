/**
 * Account Inactive Component
 * Displays an error screen for suspended/inactive accounts
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Result } from "antd";
import { StopOutlined, LogoutOutlined, MailOutlined } from "@ant-design/icons";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

const { Title, Paragraph } = Typography;

export default function AccountInactive() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in - redirect to login
        navigate("/auth/login");
        return;
      }

      setUserEmail(user.email || "");

      try {
        // Check user status in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const status = userData.status;

          // If status changed to Approved, redirect
          if (status === "Approved") {
            const role = userData.role;
            if (role === "Admin") {
              navigate("/admin/dashboard");
            } else {
              navigate("/dashboard");
            }
            return;
          }

          // If status changed to Pending
          if (status === "Pending") {
            navigate("/auth/pending-approval");
            return;
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error checking user status:", error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
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
    // You can customize this to open email client or support form
    window.location.href = "mailto:admin@example.com?subject=Account Suspended - Support Request";
  };

  if (loading) {
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
        <Result
          status="error"
          icon={<StopOutlined style={{ color: "#ff4d4f" }} />}
          title="Account Suspended"
          subTitle={
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Paragraph>
                Your account has been suspended by an administrator.
              </Paragraph>
              <Paragraph type="secondary" style={{ fontSize: "14px" }}>
                Signed in as: <strong>{userEmail}</strong>
              </Paragraph>
            </Space>
          }
        >
          <div
            style={{
              background: "#fff1f0",
              border: "1px solid #ffccc7",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Title level={5} style={{ margin: 0, color: "#cf1322" }}>
                Why is my account suspended?
              </Title>
              <Paragraph style={{ margin: 0, fontSize: "14px" }}>
                Your account may have been suspended for the following reasons:
                <br />
                • Violation of system policies
                <br />
                • Security concerns
                <br />
                • Administrative action
                <br />• Account under review
              </Paragraph>
            </Space>
          </div>

          <div
            style={{
              background: "#e6f7ff",
              border: "1px solid #91d5ff",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Title level={5} style={{ margin: 0 }}>
                What can I do?
              </Title>
              <Paragraph style={{ margin: 0, fontSize: "14px" }}>
                • Contact your system administrator for more information
                <br />
                • Request an account review
                <br />• Provide any necessary clarifications
              </Paragraph>
            </Space>
          </div>

          <Space
            style={{ width: "100%", justifyContent: "center" }}
            size="middle"
            direction="vertical"
          >
            <Space size="middle">
              <Button
                type="primary"
                icon={<MailOutlined />}
                onClick={handleContactAdmin}
              >
                Contact Administrator
              </Button>
              <Button
                icon={<LogoutOutlined />}
                onClick={handleSignOut}
                danger
              >
                Sign Out
              </Button>
            </Space>

            <Paragraph type="secondary" style={{ fontSize: "13px", margin: 0 }}>
              If you believe this is an error, please contact support immediately.
            </Paragraph>
          </Space>
        </Result>
      </Card>
    </div>
  );
}
