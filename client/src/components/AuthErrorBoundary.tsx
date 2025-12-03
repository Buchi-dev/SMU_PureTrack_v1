/**
 * AuthErrorBoundary Component
 * 
 * Catches errors during AuthProvider initialization and displays a user-friendly fallback.
 * Prevents blank screen crashes when Firebase config is missing or network errors occur.
 * 
 * @module components/AuthErrorBoundary
 */

import { Component, type ReactNode } from 'react';
import { Result, Button } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for authentication initialization errors
 * Catches and displays errors from AuthContext, Firebase config, etc.
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error details for debugging
    if (import.meta.env.DEV) {
      console.error('[AuthErrorBoundary] Authentication error caught:', error);
      console.error('[AuthErrorBoundary] Error info:', errorInfo);
    }
  }

  handleRefresh = () => {
    // Clear error state and reload page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '20px'
        }}>
          <Result
            status="error"
            icon={<WarningOutlined />}
            title="Authentication Failed"
            subTitle={
              <>
                <p>The authentication system failed to initialize properly.</p>
                <p>This could be due to a network error or configuration issue.</p>
                {import.meta.env.DEV && this.state.error && (
                  <pre style={{ 
                    marginTop: '20px', 
                    padding: '10px', 
                    background: '#f5f5f5', 
                    borderRadius: '4px',
                    textAlign: 'left',
                    fontSize: '12px',
                    maxWidth: '600px',
                    overflow: 'auto'
                  }}>
                    {this.state.error.message}
                  </pre>
                )}
              </>
            }
            extra={[
              <Button type="primary" key="refresh" onClick={this.handleRefresh}>
                Refresh Page
              </Button>,
              <Button key="console" onClick={() => window.open('https://console.firebase.google.com', '_blank')}>
                Firebase Console
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
