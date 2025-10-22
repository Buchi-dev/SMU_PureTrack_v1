import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './contexts/AuthContext';
import { useResponsiveTheme } from './theme';
import { themeConfig } from './theme/themeConfig';
import { ConfigProvider } from 'antd';
import './App.css';

/**
 * Main App Component with React Router, Auth Context, and Responsive Theme
 * 
 * Uses responsive theme system that automatically adapts to:
 * - Mobile devices (0-767px): Compact spacing, touch-friendly controls
 * - Tablets (768-991px): Balanced layout
 * - Desktops (992px+): Generous spacing, full features
 */
const App = () => {
  // Get responsive theme configuration based on screen size
  const { responsiveTheme } = useResponsiveTheme(themeConfig);

  return (
    <ConfigProvider theme={responsiveTheme}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;