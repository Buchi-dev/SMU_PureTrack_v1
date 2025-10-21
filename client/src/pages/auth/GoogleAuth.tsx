/**
 * Google Authentication Component
 * Handles Google OAuth sign-in using Firebase Authentication
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Alert, Typography, Space, Spin } from "antd";
import { GoogleOutlined, LoadingOutlined } from "@ant-design/icons";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

const { Title, Paragraph } = Typography;

export default function GoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if Firebase is properly initialized
      if (!auth || !auth.app) {
        throw new Error("Firebase Authentication is not properly initialized");
      }

      // Create Google Auth Provider
      const provider = new GoogleAuthProvider();
      
      // Force account selection and add scopes
      provider.setCustomParameters({
        prompt: "select_account",
      });
      
      // Add required scopes
      provider.addScope('profile');
      provider.addScope('email');

      console.log("Attempting Google sign-in...");

      // Sign in with popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("✓ Google sign-in successful:", user.email);

      // Get user profile from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // New user - redirect to account completion
        console.log("New user detected, redirecting to account completion");
        navigate("/auth/complete-account");
        return;
      }

      const userData = userDoc.data();
      const status = userData.status;

      // Check if user needs to complete their profile
      if (!userData.department || !userData.phoneNumber) {
        console.log("User needs to complete profile");
        navigate("/auth/complete-account");
        return;
      }

      // Check user status
      if (status === "Pending") {
        console.log("User account pending approval");
        navigate("/auth/pending-approval");
        return;
      }

      if (status === "Suspended") {
        console.log("User account is suspended");
        navigate("/auth/account-inactive");
        return;
      }

      // User is approved - redirect to dashboard
      if (status === "Approved") {
        console.log("User approved, redirecting to dashboard");
        const role = userData.role;
        
        if (role === "Admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/dashboard"); // Staff dashboard
        }
        return;
      }

      // Default fallback
      navigate("/auth/pending-approval");

    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      
      // Handle Firebase Auth errors
      if (err && typeof err === "object" && "code" in err) {
        const error = err as { code: string; message: string };
        
        switch (error.code) {
          case "auth/popup-closed-by-user":
            setError("Sign-in cancelled. Please try again.");
            break;
          case "auth/network-request-failed":
            setError("Network error. Please check your internet connection and try again.");
            break;
          case "auth/internal-error":
            setError("Authentication service error. Please ensure:\n1. Google Sign-In is enabled in Firebase Console\n2. OAuth consent screen is configured\n3. Your domain is authorized in Firebase settings");
            break;
          case "auth/popup-blocked":
            setError("Pop-up was blocked by your browser. Please allow pop-ups for this site.");
            break;
          case "auth/network-request-failed":
            setError("Network error. Please check your internet connection.");
            break;
          case "permission-denied":
            // Account pending or suspended
            setError(error.message);
            break;
          default:
            setError(error.message || "An error occurred during sign-in. Please try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
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
          maxWidth: 450,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          borderRadius: "12px",
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <Title level={2} style={{ marginBottom: 8 }}>
              Water Quality Monitoring
            </Title>
            <Paragraph type="secondary">
              Sign in with your Google account to continue
            </Paragraph>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message="Sign-in Error"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* Sign-in Button */}
          <Button
            type="primary"
            size="large"
            icon={loading ? <LoadingOutlined /> : <GoogleOutlined />}
            onClick={handleGoogleSignIn}
            disabled={loading}
            block
            style={{
              height: "50px",
              fontSize: "16px",
              fontWeight: 500,
            }}
          >
            {loading ? "Signing in..." : "Sign in with Google"}
          </Button>

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
              <strong>First time signing in?</strong>
              <br />
              You'll be asked to complete your profile and wait for admin approval.
            </Paragraph>
          </div>

          {/* Loading Overlay */}
          {loading && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <Spin size="large" tip="Authenticating..." />
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
}
