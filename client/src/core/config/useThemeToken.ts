/**
 * Theme Token Hook
 * Provides easy access to theme tokens throughout the application
 */

import { theme } from 'antd';

/**
 * Hook to access theme tokens
 * Use this instead of hardcoded colors
 * 
 * @example
 * const token = useThemeToken();
 * <div style={{ color: token.colorError }}>Error</div>
 */
export const useThemeToken = () => {
  const { token } = theme.useToken();
  return token;
};

/**
 * Static theme color getters (for non-component contexts)
 * Note: These return default theme colors and won't respond to theme changes
 */
export const themeColors = {
  // Severity colors
  critical: '#ff4d4f',    // colorError
  warning: '#faad14',     // colorWarning
  advisory: '#1890ff',    // colorInfo
  success: '#52c41a',     // colorSuccess
  
  // Status colors
  active: '#ff4d4f',      // colorError
  acknowledged: '#faad14', // colorWarning
  resolved: '#52c41a',    // colorSuccess
  
  // Other
  primary: '#001f3f',     // colorPrimary
  info: '#1890ff',        // colorInfo
  border: '#d9d9d9',      // colorBorder
  textSecondary: '#8c8c8c',
  purple: '#722ed1',
} as const;
