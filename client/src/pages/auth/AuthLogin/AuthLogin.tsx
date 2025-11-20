/**
 * Login Page Component
 * Handles Google OAuth authentication via Express/Passport.js backend
 * Clean, modern design with branding
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Alert, Typography, Space, theme, Divider } from "antd";
import { GoogleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useAuth } from "../../../contexts/AuthContext";
import { authService } from "../../../services/auth.Service";

const { Title, Text } = Typography;

/**
 * AuthLogin Component
 * Provides Google OAuth login functionality
 */
export default function AuthLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading, user } = useAuth();
  const { token } = theme.useToken();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in URL params (from failed OAuth redirect)
    const errorParam = searchParams.get('error');
    if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    }

    // Redirect if already authenticated
    if (!loading && isAuthenticated && user) {
      // Route based on user role and status
      if (user.status === 'suspended') {
        navigate('/auth/account-suspended');
      } else if (user.status === 'inactive') {
        navigate('/auth/account-inactive');
      } else if (user.status === 'active') {
        // Active user - redirect to appropriate dashboard
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'staff') {
          navigate('/staff/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    }
  }, [isAuthenticated, loading, user, navigate, searchParams]);

  /**
   * Handle Google OAuth login
   */
  const handleGoogleLogin = () => {
    setError(null);
    authService.loginWithGoogle();
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: token.colorBgLayout,
        }}
      >
        <Card
          style={{
            maxWidth: 480,
            width: "100%",
            margin: "0 16px",
            textAlign: "center",
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div style={{ fontSize: 24, color: token.colorPrimary }}>
              Loading...
            </div>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: token.colorBgLayout,
        padding: "24px 16px",
      }}
    >
      <Card
        style={{
          maxWidth: 480,
          width: "100%",
          boxShadow: token.boxShadowTertiary,
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <Title level={2} style={{ marginBottom: 8 }}>
              Water Quality Monitoring
            </Title>
            <Text type="secondary">
              Sign in to access your dashboard
            </Text>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          {/* Error Alert */}
          {error && (
            <Alert
              message="Authentication Error"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* Info Alert */}
          <Alert
            message="Google Account Required"
            description="You need a Google account to sign in. New users will need admin approval before accessing the system."
            type="info"
            icon={<InfoCircleOutlined />}
            showIcon
          />

          {/* Google Sign-In Button */}
          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined />}
            onClick={handleGoogleLogin}
            block
            style={{
              height: 48,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            Sign in with Google
          </Button>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
