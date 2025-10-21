/**
 * Google Authentication Component
 * Handles Google OAuth sign-in using Firebase Authentication
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Alert, Typography, Space, Spin, Switch } from "antd";
import { GoogleOutlined, LoadingOutlined, SwapOutlined } from "@ant-design/icons";
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

const { Title, Paragraph } = Typography;

export default function GoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [useRedirect, setUseRedirect] = useState(false);
  const navigate = useNavigate();

  // Helper function to handle user profile and navigation
  const handleUserProfile = async (user: any) => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
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

    // Check user status and redirect accordingly
    if (status === "Pending") {
      console.log("User account pending approval");
      navigate("/auth/pending-approval");
    } else if (status === "Suspended") {
      console.log("User account is suspended");
      navigate("/auth/account-inactive");
    } else if (status === "Approved") {
      console.log("User approved, redirecting to dashboard");
      const role = userData.role;
      navigate(role === "Admin" ? "/admin/dashboard" : "/staff/dashboard");
    } else {
      navigate("/auth/pending-approval");
    }
  };

  // Helper function to get user-friendly error messages
  const getErrorMessage = (err: any): string => {
    if (err && typeof err === "object" && "code" in err) {
      const error = err as { code: string; message: string };
      
      switch (error.code) {
        case "auth/popup-closed-by-user":
          return "Sign-in cancelled. Please try again.";
        case "auth/cancelled-popup-request":
          return "Another sign-in is in progress. Please wait.";
        case "auth/popup-blocked":
          return "Pop-up blocked by browser. Please allow pop-ups for this site or try Redirect method.";
        case "auth/network-request-failed":
          return "Network error. Please check your internet connection and try again.";
        case "auth/too-many-requests":
          return "Too many failed attempts. Please wait a few minutes and try again.";
        case "auth/user-disabled":
          return "This account has been disabled. Please contact support.";
        case "auth/configuration-not-found":
          return "Authentication not configured. Please contact support.";
        case "auth/unauthorized-domain":
          return "This domain is not authorized. Please contact support.";
        case "auth/operation-not-allowed":
          return "Google sign-in is not enabled. Please contact support.";
        case "auth/error-code:-47":
        case "auth/internal-error":
          if (error.message?.includes("503")) {
            return "⚠️ Firebase service temporarily unavailable (503 Error). The authentication server is experiencing issues. Please wait 2-5 minutes and try the Redirect method or retry. If the issue persists, try: Clear browser cache and cookies, Use incognito/private mode, Try a different browser";
          }
          return `Internal authentication error. Please try again or contact support. Error: ${error.message}`;
        default:
          return `Authentication failed: ${error.message || "Unknown error"}. Please try again.`;
      }
    }
    
    if (err instanceof Error) {
      return err.message;
    }
    
    return "An unexpected error occurred. Please try again.";
  };

  // Check for redirect result on component mount
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        setLoading(true);
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("✓ Redirect sign-in successful:", result.user.email);
          await handleUserProfile(result.user);
        }
      } catch (err: any) {
        console.error("Redirect result error:", err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    checkRedirectResult();
  }, []);

  const handleGoogleSignIn = async (isRetry = false) => {
    setLoading(true);
    setError(null);
    if (isRetry) setRetrying(true);

    try {
      // Check if Firebase is properly initialized
      if (!auth || !auth.app) {
        throw new Error("Firebase Authentication is not properly initialized");
      }

      // Check if we're in development and provide helpful info
      const isDevelopment = import.meta.env.DEV;
      if (isDevelopment) {
        console.log("Environment:", import.meta.env.MODE);
        console.log("Auth Domain:", auth.config.authDomain);
        console.log("Current Origin:", window.location.origin);
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

      // Use redirect or popup based on user preference
      if (useRedirect) {
        console.log("Using redirect method...");
        await signInWithRedirect(auth, provider);
        // User will be redirected away, result handled in useEffect
        return;
      } else {
        console.log("Using popup method...");
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("✓ Popup sign-in successful:", user.email);
        await handleUserProfile(user);
      }

    } catch (err: unknown) {
      console.error("Google sign-in error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  // Retry function for 503 errors
  const handleRetry = () => {
    handleGoogleSignIn(true);
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
              description={
                <div>
                  <div style={{ whiteSpace: 'pre-line' }}>{error}</div>
                  {(error.includes('503') || error.includes('unavailable')) && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={handleRetry}
                      loading={retrying}
                      style={{ marginTop: 12 }}
                    >
                      {retrying ? 'Retrying...' : 'Retry Sign In'}
                    </Button>
                  )}
                </div>
              }
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* Sign-in Method Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#f0f9ff",
              border: "1px solid #91d5ff",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <Space>
              <SwapOutlined style={{ color: "#1890ff" }} />
              <span style={{ fontSize: "13px", fontWeight: 500 }}>
                {useRedirect ? "Redirect Method (Recommended for 503 errors)" : "Popup Method (Default)"}
              </span>
            </Space>
            <Switch
              checked={useRedirect}
              onChange={setUseRedirect}
              checkedChildren="Redirect"
              unCheckedChildren="Popup"
            />
          </div>

          {/* Sign-in Button */}
          <Button
            type="primary"
            size="large"
            icon={loading ? <LoadingOutlined /> : <GoogleOutlined />}
            onClick={() => handleGoogleSignIn(false)}
            disabled={loading}
            block
            style={{
              height: "50px",
              fontSize: "16px",
              fontWeight: 500,
            }}
          >
            {loading ? "Signing in..." : `Sign in with Google (${useRedirect ? "Redirect" : "Popup"})`}
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
              <br />
              <br />
              <strong>Experiencing 503 errors?</strong>
              <br />
              Try switching to Redirect method above. It's more reliable when Firebase is under load.
            </Paragraph>
          </div>

          {/* Troubleshooting Section */}
          {error && error.includes('503') && (
            <div
              style={{
                background: "#fff7e6",
                border: "1px solid #ffd591",
                padding: "12px",
                borderRadius: "8px",
                marginTop: "8px",
              }}
            >
              <Paragraph style={{ margin: 0, fontSize: "12px" }}>
                <strong>Troubleshooting 503 Error:</strong>
                <br />
                • Wait 2-3 minutes and try again
                <br />
                • Check <a href="https://status.firebase.google.com" target="_blank" rel="noopener noreferrer">Firebase Status</a>
                <br />
                • Clear browser cache and cookies
                <br />
                • Try a different browser or incognito mode
              </Paragraph>
            </div>
          )}

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
