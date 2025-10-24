/**
 * Google Authentication Component
 * Handles Google OAuth sign-in using Firebase Authentication
 * Clean, optimized design with popup method as default
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Alert, Typography, Space, theme } from "antd";
import { GoogleOutlined, LoadingOutlined } from "@ant-design/icons";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

const { Title, Text } = Typography;

export default function GoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; solution?: string; canRetry?: boolean } | null>(null);
  const navigate = useNavigate();
  const { token } = theme.useToken();

  // Navigate user based on profile status
  const handleUserProfile = async (user: any) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        navigate("/auth/complete-account");
        return;
      }

      const userData = userDoc.data();

      // Check if profile is incomplete
      if (!userData.department || !userData.phoneNumber) {
        navigate("/auth/complete-account");
        return;
      }

      // Route based on user status
      const { status, role } = userData;
      
      if (status === "Approved") {
        navigate(role === "Admin" ? "/admin/dashboard" : "/staff/dashboard");
      } else if (status === "Suspended") {
        navigate("/auth/account-inactive");
      } else {
        navigate("/auth/pending-approval");
      }
    } catch (err) {
      console.error("Error checking user profile:", err);
      setError({ 
        message: "Failed to load user profile. Please try again.",
        canRetry: true 
      });
    }
  };

  // Enhanced error handler with detailed messages and solutions
  const getErrorMessage = (err: any): { message: string; solution?: string; canRetry?: boolean } => {
    if (!err || typeof err !== "object" || !("code" in err)) {
      return { 
        message: "An unexpected error occurred. Please try again.",
        canRetry: true 
      };
    }

    const error = err as { code: string; message: string };
    
    const errorMap: Record<string, { message: string; solution?: string; canRetry?: boolean }> = {
      "auth/popup-closed-by-user": {
        message: "Sign-in was cancelled",
        solution: "Click the button below to try again",
        canRetry: true
      },
      "auth/cancelled-popup-request": {
        message: "Another sign-in is already in progress",
        solution: "Please wait for the current sign-in to complete",
        canRetry: false
      },
      "auth/popup-blocked": {
        message: "Pop-up was blocked by your browser",
        solution: "Please allow pop-ups for this site in your browser settings and try again",
        canRetry: true
      },
      "auth/network-request-failed": {
        message: "Network connection error",
        solution: "Check your internet connection and try again",
        canRetry: true
      },
      "auth/too-many-requests": {
        message: "Too many sign-in attempts",
        solution: "Please wait a few minutes before trying again",
        canRetry: false
      },
      "auth/user-disabled": {
        message: "Your account has been disabled",
        solution: "Please contact support for assistance",
        canRetry: false
      },
      "auth/invalid-credential": {
        message: "Invalid credentials",
        solution: "Please try signing in again with a valid Google account",
        canRetry: true
      },
      "auth/account-exists-with-different-credential": {
        message: "An account already exists with the same email",
        solution: "Try signing in with your original sign-in method",
        canRetry: false
      },
      "auth/configuration-not-found": {
        message: "Authentication is not properly configured",
        solution: "Please contact the system administrator",
        canRetry: false
      },
      "auth/unauthorized-domain": {
        message: "This domain is not authorized",
        solution: "Please contact the system administrator",
        canRetry: false
      },
      "auth/operation-not-allowed": {
        message: "Google sign-in is not enabled",
        solution: "Please contact the system administrator",
        canRetry: false
      },
    };

    return errorMap[error.code] || { 
      message: `Authentication failed: ${error.message || "Unknown error"}`,
      solution: "Please try again or contact support if the issue persists",
      canRetry: true
    };
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      
      provider.setCustomParameters({
        prompt: "select_account",
      });
      
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      await handleUserProfile(result.user);

    } catch (err: unknown) {
      console.error("Sign-in error:", err);
      setError(getErrorMessage(err));
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
        backgroundImage: `linear-gradient(rgba(240, 242, 245, 0.65), rgba(240, 242, 245, 0.65)), url('/4pillars.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: token.paddingLG,
      }}
    >
      <Card
        style={{
          maxWidth: 480,
          width: "100%",
          boxShadow: token.boxShadow,
        }}
        bordered={false}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <img 
              src="/system_logo.svg" 
              alt="PureTrack Logo" 
              style={{ 
                width: 80, 
                height: 80,
                marginBottom: token.marginMD,
              }} 
            />
            <Title 
              level={3} 
              style={{ 
                margin: 0, 
                marginBottom: token.marginXS, 
                color: token.colorPrimary,
                fontSize: token.fontSizeHeading3,
              }}
            >
              PureTrack
            </Title>
            <Text type="secondary" style={{ fontSize: token.fontSize }}>
              Water Quality Monitoring System
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              Sign in with your Google account
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message="Sign-in Failed"
              description={
                <Space direction="vertical" size="small">
                  <Text>{error.message}</Text>
                  {error.solution && (
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      {error.solution}
                    </Text>
                  )}
                  {error.canRetry && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={handleGoogleSignIn}
                      style={{ marginTop: token.marginXS }}
                    >
                      Try Again
                    </Button>
                  )}
                </Space>
              }
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
            loading={loading}
            block
            style={{ height: 48 }}
          >
            {loading ? "Signing in..." : "Sign in with Google"}
          </Button>
        </Space>
      </Card>
    </div>
  );
}
