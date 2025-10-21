/**
 * Pending Approval Component
 * Displays a waiting screen for users whose accounts are pending admin approval
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Result } from "antd";
import { ClockCircleOutlined, ReloadOutlined, LogoutOutlined } from "@ant-design/icons";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

const { Title, Paragraph } = Typography;

export default function PendingApproval() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

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

          console.log("User status:", status);

          // If status changes to Approved, redirect to dashboard
          if (status === "Approved") {
            console.log("User approved! Redirecting to dashboard...");
            const role = userData.role;
            
            if (role === "Admin") {
              navigate("/admin/dashboard");
            } else {
              navigate("/dashboard");
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
          icon={<ClockCircleOutlined style={{ color: "#faad14" }} />}
          title="Account Pending Approval"
          subTitle={
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Paragraph>
                Your account is currently pending approval from an administrator.
              </Paragraph>
              <Paragraph type="secondary" style={{ fontSize: "14px" }}>
                Signed in as: <strong>{userEmail}</strong>
              </Paragraph>
            </Space>
          }
        >
          <div
            style={{
              background: "#fff7e6",
              border: "1px solid #ffd591",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Title level={5} style={{ margin: 0 }}>
                What happens next?
              </Title>
              <Paragraph style={{ margin: 0, fontSize: "14px" }}>
                • An administrator will review your registration
                <br />
                • You'll receive access once your account is approved
                <br />
                • This page will automatically update when your status changes
                <br />• You can safely close this page and check back later
              </Paragraph>
            </Space>
          </div>

          <Space style={{ width: "100%", justifyContent: "center" }} size="middle">
            <Button
              icon={<ReloadOutlined />}
              onClick={handleCheckAgain}
              loading={checking}
            >
              Check Status
            </Button>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleSignOut}
              danger
            >
              Sign Out
            </Button>
          </Space>

          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <Paragraph type="secondary" style={{ fontSize: "13px", margin: 0 }}>
              Need help? Contact your system administrator.
            </Paragraph>
          </div>
        </Result>
      </Card>
    </div>
  );
}
