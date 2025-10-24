import { ConfigProvider, theme } from 'antd';
import type { ReactNode } from 'react';
import { themeConfig, darkThemeConfig, compactThemeConfig } from './themeConfig';

interface ThemeProviderProps {
  children: ReactNode;
  themeMode?: 'light' | 'dark' | 'compact';
}

/**
 * Theme Provider Component
 * Wraps the application with Ant Design's ConfigProvider
 * 
 * @example
 * <ThemeProvider themeMode="light">
 *   <App />
 * </ThemeProvider>
 */
export const ThemeProvider = ({ children, themeMode = 'light' }: ThemeProviderProps) => {
  const getThemeConfig = () => {
    switch (themeMode) {
      case 'dark':
        return {
          ...darkThemeConfig,
          algorithm: theme.darkAlgorithm,
        };
      case 'compact':
        return {
          ...compactThemeConfig,
          algorithm: theme.compactAlgorithm,
        };
      default:
        return {
          ...themeConfig,
          algorithm: theme.defaultAlgorithm,
        };
    }
  };

  return (
    <ConfigProvider theme={getThemeConfig()}>
      {children}
    </ConfigProvider>
  );
};
