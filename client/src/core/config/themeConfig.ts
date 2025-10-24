import type { ThemeConfig } from 'antd';

/**
 * Ant Design Theme Configuration
 * Customize your application's design tokens here
 * @see https://ant.design/docs/react/customize-theme
 */
export const themeConfig: ThemeConfig = {
  token: {
    // Seed Token - Primary brand color
    colorPrimary: '#001f3f', // Navy Blue
    
    // Border Radius
    borderRadius: 6,
    
    // Font
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    
    // Spacing - Reduced from 36 to 32 for more compact components
    controlHeight: 32,
    
    // Colors
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // Background
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f0f2f5',
    
    // Text
    colorTextBase: '#000000',
    colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
    colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
    colorTextQuaternary: 'rgba(0, 0, 0, 0.25)',
    
    // Link
    colorLink: '#001f3f', // Navy Blue
    colorLinkHover: '#003d7a', // Lighter Navy Blue
    colorLinkActive: '#00152b', // Darker Navy Blue
    
    // Border
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    
    // Shadow
    boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  },
  
  // Component-specific token overrides
  components: {
    Button: {
      controlHeight: 32,        // Reduced from 36 to 32
      borderRadius: 6,          // Reduced from 8 to 6
      fontWeight: 500,
      paddingContentHorizontal: 15, // Slightly more compact padding
    },
    Input: {
      controlHeight: 32,        // Reduced from 36 to 32
      borderRadius: 6,          // Reduced from 8 to 6
      paddingBlock: 4,          // Tighter vertical padding
      paddingInline: 11,        // Standard horizontal padding
    },
    Select: {
      controlHeight: 32,        // Reduced from 36 to 32
      borderRadius: 6,          // Reduced from 8 to 6
    },
    Card: {
      borderRadiusLG: 8,        // Reduced from 12 to 8
      paddingLG: 20,            // Reduced from 24 to 20
    },
    Table: {
      borderRadiusLG: 6,        // Reduced from 8 to 6
      cellPaddingBlock: 12,     // More compact table cells
      cellPaddingInline: 12,    // More compact table cells
    },
    Modal: {
      borderRadiusLG: 8,        // Reduced from 12 to 8
    },
    Drawer: {
      borderRadiusLG: 8,        // Reduced from 12 to 8
    },
    Space: {
      size: 12,                 // Default space size for consistency
    },
  },
  
  // Algorithm - controls overall theme (default, dark, compact)
  // algorithm: theme.defaultAlgorithm,
  // algorithm: theme.darkAlgorithm,
  // algorithm: theme.compactAlgorithm,
};

/**
 * Dark Theme Configuration
 */
export const darkThemeConfig: ThemeConfig = {
  token: {
    ...themeConfig.token,
    colorPrimary: '#4a7ba7', // Lighter Navy Blue for dark mode
    colorBgContainer: '#141414',
    colorBgLayout: '#000000',
    colorTextBase: '#ffffff',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
    colorTextQuaternary: 'rgba(255, 255, 255, 0.25)',
    colorBorder: '#434343',
    colorBorderSecondary: '#303030',
  },
  components: themeConfig.components,
};

/**
 * Compact Theme Configuration
 */
export const compactThemeConfig: ThemeConfig = {
  token: {
    ...themeConfig.token,
    controlHeight: 28,
    fontSize: 12,
  },
  components: {
    ...themeConfig.components,
    Button: {
      ...themeConfig.components?.Button,
      controlHeight: 28,
    },
    Input: {
      ...themeConfig.components?.Input,
      controlHeight: 28,
    },
    Select: {
      ...themeConfig.components?.Select,
      controlHeight: 28,
    },
  },
};
