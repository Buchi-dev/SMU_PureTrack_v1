/**
 * Firebase Error Boundary Component
 * 
 * Catches and handles Firebase-related errors gracefully
 * Implements React 18 Error Boundary pattern with recovery mechanism
 * 
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import { Component, ReactNode } from 'react';
import { Result, Button, Typography, Space } from 'antd';
import { CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary for Firebase Operations
 * Catches errors in child components and displays user-friendly fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state to display fallback UI on next render
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to Firebase Crashlytics or analytics (if configured)
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;

      // Determine error type for better messaging
      const isFirebaseError = error?.message.includes('Firebase') || 
                             error?.message.includes('auth') ||
                             error?.message.includes('firestore');
      
      const isNetworkError = error?.message.includes('network') ||
                            error?.message.includes('timeout') ||
                            error?.message.includes('offline');

      return (
        <Result
          status="error"
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
          title={
            isNetworkError
              ? 'Network Connection Error'
              : isFirebaseError
              ? 'Firebase Service Error'
              : 'Something Went Wrong'
          }
          subTitle={
            isNetworkError
              ? 'Unable to connect to the server. Please check your internet connection.'
              : isFirebaseError
              ? 'There was an issue connecting to Firebase services. Please try again.'
              : 'An unexpected error occurred. Our team has been notified.'
          }
          extra={
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                icon={<ReloadOutlined />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              
              {import.meta.env.DEV && error && (
                <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
                  <Paragraph>
                    <Text strong>Error Details (Development Mode):</Text>
                  </Paragraph>
                  <Paragraph>
                    <Text type="danger" code>
                      {error.message}
                    </Text>
                  </Paragraph>
                  {error.stack && (
                    <Paragraph>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap', 
                          wordBreak: 'break-word',
                          maxHeight: '200px',
                          overflow: 'auto',
                          padding: '8px',
                          backgroundColor: '#f5f5f5',
                          borderRadius: '4px',
                        }}>
                          {error.stack}
                        </pre>
                      </Text>
                    </Paragraph>
                  )}
                </div>
              )}
            </Space>
          }
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Specialized Error Boundary for Firebase Authentication
 */
export class FirebaseAuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Firebase Auth Error:', error, errorInfo);
    
    this.setState({ error, errorInfo });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Optionally redirect to login page
    window.location.href = '/login';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Result
          status="403"
          title="Authentication Error"
          subTitle="There was a problem with your authentication. Please sign in again."
          extra={
            <Button type="primary" onClick={this.handleReset}>
              Return to Login
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
