import type { ThemeConfig } from 'antd';

/**
 * RESPONSIVE ANT DESIGN THEME CONFIGURATION
 * Centralized theme tokens for consistent styling across all devices
 * @see https://ant.design/docs/react/customize-theme
 */
export const themeConfig: ThemeConfig = {
  token: {
    // ============================================================================
    // BRAND COLORS
    // ============================================================================
    colorPrimary: '#001f3f', // Navy Blue - Primary brand color
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // ============================================================================
    // BACKGROUNDS
    // ============================================================================
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f0f2f5',
    colorBgElevated: '#ffffff',
    
    // ============================================================================
    // TEXT COLORS
    // ============================================================================
    colorTextBase: '#000000',
    colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
    colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
    colorTextQuaternary: 'rgba(0, 0, 0, 0.25)',
    
    // ============================================================================
    // LINKS
    // ============================================================================
    colorLink: '#001f3f',
    colorLinkHover: '#003d7a',
    colorLinkActive: '#00152b',
    
    // ============================================================================
    // BORDERS & DIVIDERS
    // ============================================================================
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    colorSplit: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    
    // ============================================================================
    // TYPOGRAPHY
    // ============================================================================
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeightStrong: 600,
    lineHeight: 1.5715,
    lineHeightHeading1: 1.21,
    lineHeightHeading2: 1.27,
    lineHeightHeading3: 1.33,
    
    // ============================================================================
    // SPACING & SIZING (Responsive-friendly)
    // ============================================================================
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    padding: 16,
    paddingLG: 24,
    paddingMD: 20,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,
    margin: 16,
    marginLG: 24,
    marginMD: 20,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,
    
    // ============================================================================
    // SHADOWS (Elevation system)
    // ============================================================================
    boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
    
    // ============================================================================
    // Z-INDEX LAYERING
    // ============================================================================
    zIndexBase: 0,
    zIndexPopupBase: 1000,
  },
  
  // ============================================================================
  // COMPONENT-SPECIFIC OVERRIDES (Mobile-optimized)
  // ============================================================================
  components: {
    Button: {
      controlHeight: 44,        // Mobile-friendly: 44px touch target
      controlHeightLG: 48,      // Large buttons for primary actions
      controlHeightSM: 36,      // Small buttons for secondary actions
      borderRadius: 6,
      fontWeight: 500,
      paddingContentHorizontal: 16, // More padding for easier tapping
      contentFontSize: 16,      // Readable on mobile
      contentFontSizeLG: 16,
      contentFontSizeSM: 14,
    },
    Input: {
      controlHeight: 44,        // Mobile-friendly input height
      controlHeightLG: 48,
      controlHeightSM: 36,
      borderRadius: 6,
      paddingBlock: 4,
      paddingInline: 12,
      fontSize: 16,             // Prevents zoom on iOS
    },
    Select: {
      controlHeight: 44,
      controlHeightLG: 48,
      controlHeightSM: 36,
      borderRadius: 6,
      fontSize: 16,
    },
    DatePicker: {
      controlHeight: 44,
      controlHeightLG: 48,
      controlHeightSM: 36,
      borderRadius: 6,
    },
    Card: {
      borderRadiusLG: 8,
      paddingLG: 16,            // Compact on mobile, will override for desktop
      headerHeight: 48,         // Touch-friendly header
      headerFontSize: 18,
      headerFontSizeSM: 16,
    },
    Table: {
      borderRadiusLG: 6,
      cellPaddingBlock: 12,     // Mobile-optimized cell padding
      cellPaddingInline: 12,
      cellFontSize: 14,
      headerBg: '#fafafa',
      headerColor: 'rgba(0, 0, 0, 0.88)',
      headerSplitColor: 'rgba(0, 0, 0, 0.06)',
      rowHoverBg: '#f5f5f5',
      fontSize: 14,
    },
    Modal: {
      borderRadiusLG: 8,
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      titleFontSize: 18,
      titleLineHeight: 1.5,
    },
    Drawer: {
      borderRadiusLG: 8,
      padding: 16,              // Mobile padding
      paddingLG: 24,
    },
    Layout: {
      headerBg: '#001529',
      headerHeight: 56,         // Mobile-optimized header height
      headerPadding: '0 16px',  // Mobile padding
      siderBg: '#001529',
      triggerBg: '#002140',
      triggerColor: '#fff',
      triggerHeight: 48,        // Touch-friendly trigger
    },
    Menu: {
      itemHeight: 48,           // Mobile-friendly menu items
      itemMarginBlock: 4,
      itemMarginInline: 4,
      itemBorderRadius: 6,
      fontSize: 16,
      iconSize: 20,
      iconMarginInlineEnd: 12,
    },
    Space: {
      size: 12,                 // Mobile-first spacing
    },
    Form: {
      itemMarginBottom: 20,     // Compact mobile form spacing
      verticalLabelPadding: '0 0 8px',
      labelHeight: 32,
      labelColor: 'rgba(0, 0, 0, 0.88)',
      labelFontSize: 14,
    },
    Tabs: {
      cardBg: '#fafafa',
      cardHeight: 44,           // Touch-friendly tabs
      horizontalItemPadding: '12px 16px',
      horizontalItemMargin: '0 0 0 4px',
      titleFontSize: 16,
    },
    Pagination: {
      itemSize: 36,             // Touch-friendly pagination
      itemSizeSM: 28,
    },
    Typography: {
      titleMarginBottom: '0.5em',
      titleMarginTop: '1.2em',
    },
    Alert: {
      defaultPadding: '12px 16px', // Mobile padding
      withDescriptionPadding: '16px',
      fontSize: 14,
    },
    Badge: {
      dotSize: 8,
      fontSize: 12,
    },
    Statistic: {
      titleFontSize: 14,
      contentFontSize: 24,      // Mobile-readable stats
    },
  },
};


/**
 * DARK THEME CONFIGURATION
 * Dark mode variant with adjusted colors for better readability
 */
export const darkThemeConfig: ThemeConfig = {
  token: {
    ...themeConfig.token,
    colorPrimary: '#4a7ba7',
    colorBgContainer: '#141414',
    colorBgLayout: '#000000',
    colorBgElevated: '#1f1f1f',
    colorTextBase: '#ffffff',
    colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
    colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
    colorTextQuaternary: 'rgba(255, 255, 255, 0.25)',
    colorBorder: '#434343',
    colorBorderSecondary: '#303030',
    colorSplit: 'rgba(255, 255, 255, 0.06)',
  },
  components: themeConfig.components,
};

/**
 * COMPACT THEME CONFIGURATION
 * Tighter spacing for power users and smaller screens
 */
export const compactThemeConfig: ThemeConfig = {
  token: {
    ...themeConfig.token,
    controlHeight: 28,
    controlHeightLG: 36,
    controlHeightSM: 20,
    fontSize: 13,
    padding: 12,
    paddingLG: 16,
    paddingSM: 8,
    margin: 12,
    marginLG: 16,
    marginSM: 8,
  },
  components: {
    ...themeConfig.components,
    Button: {
      ...themeConfig.components?.Button,
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 28,
    },
    Input: {
      ...themeConfig.components?.Input,
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 28,
    },
    Select: {
      ...themeConfig.components?.Select,
      controlHeight: 32,
      controlHeightLG: 40,
      controlHeightSM: 28,
    },
    Table: {
      ...themeConfig.components?.Table,
      cellPaddingBlock: 8,
      cellPaddingInline: 8,
    },
  },
};

/**
 * RESPONSIVE BREAKPOINTS (Ant Design Standard)
 * Use these for responsive design patterns
 */
export const BREAKPOINTS = {
  xs: 480,   // Extra small: < 576px (phones portrait)
  sm: 576,   // Small: ≥ 576px (phones landscape)
  md: 768,   // Medium: ≥ 768px (tablets)
  lg: 992,   // Large: ≥ 992px (desktops)
  xl: 1200,  // Extra large: ≥ 1200px (large desktops)
  xxl: 1600, // Extra extra large: ≥ 1600px (ultra-wide)
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

