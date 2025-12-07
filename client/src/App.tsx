import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './contexts/AuthContext';
import { AuthErrorBoundary } from './components/AuthErrorBoundary';
import { useResponsiveTheme } from './theme';
import { themeConfig } from './theme/themeConfig';
import { ConfigProvider, App as AntdApp } from 'antd';
import { SWRConfig } from 'swr';
import { swrConfig } from './config/swr.config';
import './App.css';

/**
 * Main App Component with React Router, Auth Context, and Responsive Theme
 * 
 * Uses responsive theme system that automatically adapts to:
 * - Mobile devices (0-767px): Compact spacing, touch-friendly controls
 * - Tablets (768-991px): Balanced layout
 * - Desktops (992px+): Generous spacing, full features
 * 
 * Includes:
 * - Antd App component for message/notification context support
 * - SWR Config for global data caching and request deduplication
 */
const App = () => {
  // Get responsive theme configuration based on screen size
  const { responsiveTheme } = useResponsiveTheme(themeConfig);

  return (
    <SWRConfig value={swrConfig}>
      <ConfigProvider theme={responsiveTheme}>
        <AntdApp>
          <AuthErrorBoundary>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </AuthErrorBoundary>
        </AntdApp>
      </ConfigProvider>
    </SWRConfig>
  );
}

export default App;