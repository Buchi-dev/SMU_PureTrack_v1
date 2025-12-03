/**
 * Login Page Component
 * Handles Google OAuth authentication via Express/Passport.js backend
 * Clean, modern design with branding
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Alert, Typography, Space, theme } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { useAuth } from "../../../contexts";
import { authService } from "../../../services/auth.Service";
import { auth } from "../../../config/firebase.config";
import { onAuthStateChanged } from "firebase/auth";

const { Title, Text } = Typography;

/**
 * AuthLogin Component
 * Provides Google OAuth login functionality
 */
export default function AuthLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading, user, refetchUser } = useAuth();
  const { token } = theme.useToken();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Check for error in URL params (from failed OAuth redirect)
    const errorParam = searchParams.get('error');
    if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    }

    // Redirect if already authenticated
    if (!loading && isAuthenticated && user) {
      if (import.meta.env.DEV) {
        console.log('[AuthLogin] User authenticated, redirecting...', user);
      }
      
      // Route based on user role and status
      if (user.status === 'suspended') {
        navigate('/auth/account-suspended');
      } else if (user.status === 'pending') {
        // Check if profile is complete (has department and phone)
        if (!user.department || !user.phoneNumber) {
          // New user without complete profile - go to account completion
          navigate('/auth/account-completion');
        } else {
          // Profile complete - go to pending approval
          navigate('/auth/pending-approval');
        }
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
      
      // Stop loading state after navigation
      setIsLoggingIn(false);
    }
  }, [isAuthenticated, loading, user, navigate, searchParams]);

  /**
   * Handle Google OAuth login
   */
  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoggingIn(true);
    
    try {
      // Login with Google and verify token with backend
      const response = await authService.loginWithGoogle();
      
      // Domain check is now done in authService.loginWithGoogle()
      // If we reach here, the user has a valid SMU email
      
      if (import.meta.env.DEV) {
        console.log('[AuthLogin] Login successful, user:', response.user);
      }
      
      // Wait for Firebase auth state to be fully established
      // This ensures subsequent API calls will have auth.currentUser available
      await new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            if (import.meta.env.DEV) {
              console.log('[AuthLogin] Firebase auth state confirmed for:', firebaseUser.email);
            }
            unsubscribe();
            resolve();
          }
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          unsubscribe();
          resolve();
        }, 5000);
      });
      
      // Add a small delay to ensure Firebase is fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now refetch the user through AuthContext
      // At this point, auth.currentUser is ready, so the API interceptor will work
      if (import.meta.env.DEV) {
        console.log('[AuthLogin] Refetching user through AuthContext...');
      }
      await refetchUser();
      
      if (import.meta.env.DEV) {
        console.log('[AuthLogin] User refetched successfully');
      }
      
      // If we reach here and still not authenticated, something is wrong
      // Navigate manually based on the login response
      if (!isAuthenticated) {
        if (import.meta.env.DEV) {
          console.warn('[AuthLogin] AuthContext not updated, navigating manually');
        }
        const loggedInUser = response.user;
        
        if (loggedInUser.status === 'suspended') {
          navigate('/auth/account-suspended');
        } else if (loggedInUser.status === 'pending') {
          if (!loggedInUser.department || !loggedInUser.phoneNumber) {
            navigate('/auth/account-completion');
          } else {
            navigate('/auth/pending-approval');
          }
        } else if (loggedInUser.status === 'active') {
          if (loggedInUser.role === 'admin') {
            navigate('/admin/dashboard');
          } else if (loggedInUser.role === 'staff') {
            navigate('/staff/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
        setIsLoggingIn(false);
      }
      // Otherwise, useEffect will handle navigation and stop loading
      
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[AuthLogin] Login failed:', err);
      }
      const errorMessage = (err as Error).message || 'Failed to sign in. Please try again.';
      
      // Show user-friendly error for domain validation
      if (errorMessage.includes('@smu.edu.ph') || errorMessage.includes('personal account')) {
        setError('Access denied: Only SMU email addresses (@smu.edu.ph) are allowed. Please sign in with your SMU account.');
      } else {
        setError(errorMessage);
      }
      
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/smu-building.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <Card
          bordered={false}
          style={{
            maxWidth: 420,
            width: "100%",
            margin: "0 24px",
            textAlign: "center",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            backgroundColor: "rgba(255, 255, 255, 0.98)",
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
          maxWidth: 420,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Space 
          direction="vertical" 
          size={32} 
          style={{ width: "100%", padding: "24px 0" }}
        >
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <img 
              src="/system_logo.svg" 
              alt="SMU PureTrack Logo" 
              style={{ 
                width: 100, 
                height: 100, 
                marginBottom: 24,
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
                filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.08))",
              }} 
            />
            <Title 
              level={2} 
              style={{ 
                marginBottom: 8,
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.5px",
              }}
            >
              SMU PureTrack
            </Title>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: 15,
                display: "block",
                marginTop: 8,
              }}
            >
              Sign in to access your dashboard
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{
                borderRadius: 8,
              }}
            />
          )}

          {/* Google Sign-In Button */}
          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined style={{ fontSize: 18 }} />}
            onClick={handleGoogleLogin}
            loading={isLoggingIn}
            disabled={isLoggingIn}
            block
            style={{
              height: 52,
              fontSize: 16,
              fontWeight: 500,
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              border: "none",
            }}
          >
            {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
          </Button>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: 12,
                display: "block",
                lineHeight: 1.6,
              }}
            >
              Secure authentication powered by Google
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
