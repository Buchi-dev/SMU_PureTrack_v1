/**
 * ADVANCED ANT DESIGN V5 THEME & RESPONSIVE SYSTEM
 * 
 * Complete architectural implementation combining:
 * 1. Dynamic theme tokens with CSS-in-JS
 * 2. Device-adaptive responsive design
 * 3. Breakpoint-aware component behaviors
 * 4. Performance-optimized theme switching
 * 
 * Based on official Ant Design v5 documentation and best practices
 */

import { Grid, theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import type { AliasToken } from 'antd/es/theme/internal';
import { useMemo, useEffect, useState } from 'react';

// Use AliasToken as GlobalToken (v5.27.6 compatible)
type GlobalToken = AliasToken;

const { useBreakpoint } = Grid;

// ============================================================================
// 1. RESPONSIVE BREAKPOINTS (Official Ant Design Standards)
// ============================================================================

/**
 * Official Ant Design breakpoints following Bootstrap 4 media queries
 * @see https://ant.design/components/grid#col
 */
export const BREAKPOINTS = {
  xs: 480,   // Extra small: < 576px (phones portrait)
  sm: 576,   // Small: ≥ 576px (phones landscape)
  md: 768,   // Medium: ≥ 768px (tablets)
  lg: 992,   // Large: ≥ 992px (desktops)
  xl: 1200,  // Extra large: ≥ 1200px (large desktops)
  xxl: 1600, // Extra extra large: ≥ 1600px (ultra-wide monitors)
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Get current device category based on width
 */
export const getDeviceType = (width: number): 'mobile' | 'tablet' | 'desktop' => {
  if (width < BREAKPOINTS.md) return 'mobile';
  if (width < BREAKPOINTS.lg) return 'tablet';
  return 'desktop';
};

// ============================================================================
// 2. RESPONSIVE THEME TOKENS
// ============================================================================

/**
 * Device-adaptive spacing scale
 * Automatically adjusts component spacing based on screen size
 */
export const getResponsiveSpacing = (breakpoint: BreakpointKey): Partial<GlobalToken> => {
  const spacingMap: Record<BreakpointKey, Partial<GlobalToken>> = {
    // Mobile: Tighter spacing for small screens
    xs: {
      sizeStep: 3,
      sizeUnit: 3,
      padding: 12,
      paddingLG: 16,
      paddingXL: 20,
      margin: 12,
      marginLG: 16,
      marginXL: 20,
      controlHeight: 28,
      fontSize: 13,
    },
    // Phone landscape: Slightly more breathing room
    sm: {
      sizeStep: 3,
      sizeUnit: 4,
      padding: 14,
      paddingLG: 18,
      paddingXL: 24,
      margin: 14,
      marginLG: 18,
      marginXL: 24,
      controlHeight: 30,
      fontSize: 14,
    },
    // Tablet: Balanced spacing
    md: {
      sizeStep: 4,
      sizeUnit: 4,
      padding: 16,
      paddingLG: 20,
      paddingXL: 28,
      margin: 16,
      marginLG: 20,
      marginXL: 28,
      controlHeight: 32,
      fontSize: 14,
    },
    // Desktop: Standard spacing
    lg: {
      sizeStep: 4,
      sizeUnit: 4,
      padding: 16,
      paddingLG: 24,
      paddingXL: 32,
      margin: 16,
      marginLG: 24,
      marginXL: 32,
      controlHeight: 32,
      fontSize: 14,
    },
    // Large desktop: Generous spacing
    xl: {
      sizeStep: 4,
      sizeUnit: 4,
      padding: 18,
      paddingLG: 26,
      paddingXL: 36,
      margin: 18,
      marginLG: 26,
      marginXL: 36,
      controlHeight: 34,
      fontSize: 14,
    },
    // Ultra-wide: Maximum comfort
    xxl: {
      sizeStep: 4,
      sizeUnit: 4,
      padding: 20,
      paddingLG: 28,
      paddingXL: 40,
      margin: 20,
      marginLG: 28,
      marginXL: 40,
      controlHeight: 36,
      fontSize: 15,
    },
  };

  return spacingMap[breakpoint] || spacingMap.md;
};

/**
 * Touch-friendly control sizes for mobile devices
 */
export const getTouchFriendlyTokens = (isMobile: boolean): Partial<GlobalToken> => {
  if (!isMobile) return {};

  return {
    controlHeight: 40,           // Larger tap targets (min 44px recommended)
    controlHeightSM: 32,
    controlHeightLG: 48,
    fontSize: 16,                 // Prevent zoom on iOS
    fontSizeLG: 18,
    paddingContentVertical: 12,   // More vertical space for finger taps
    paddingContentHorizontal: 16,
  };
};

// ============================================================================
// 3. ADVANCED THEME CONFIGURATION
// ============================================================================

/**
 * Create responsive theme configuration
 * Dynamically adapts tokens based on current breakpoint
 */
export const createResponsiveTheme = (
  baseTheme: ThemeConfig,
  currentBreakpoint: BreakpointKey,
  isMobile: boolean
): ThemeConfig => {
  const responsiveSpacing = getResponsiveSpacing(currentBreakpoint);
  const touchFriendlyTokens = getTouchFriendlyTokens(isMobile);

  return {
    ...baseTheme,
    token: {
      ...baseTheme.token,
      ...responsiveSpacing,
      ...touchFriendlyTokens,
    },
    components: {
      ...baseTheme.components,
      // Card: Responsive padding and border radius
      Card: {
        ...baseTheme.components?.Card,
        paddingLG: isMobile ? 16 : 20,
        borderRadiusLG: isMobile ? 6 : 8,
      },
      // Button: Touch-friendly on mobile
      Button: {
        ...baseTheme.components?.Button,
        controlHeight: isMobile ? 40 : 32,
        fontSize: isMobile ? 16 : 14,
        paddingContentHorizontal: isMobile ? 20 : 15,
      },
      // Input: Prevent zoom on iOS
      Input: {
        ...baseTheme.components?.Input,
        controlHeight: isMobile ? 40 : 32,
        fontSize: isMobile ? 16 : 14,
      },
      // Table: Responsive cell padding
      Table: {
        ...baseTheme.components?.Table,
        cellPaddingBlock: isMobile ? 8 : 12,
        cellPaddingInline: isMobile ? 8 : 12,
      },
      // Modal: Full screen on mobile
      Modal: {
        ...baseTheme.components?.Modal,
        borderRadiusLG: isMobile ? 0 : 8,
      },
      // Drawer: Full width on mobile
      Drawer: {
        ...baseTheme.components?.Drawer,
        borderRadiusLG: 0, // Always 0 for drawer
      },
    },
  };
};

// ============================================================================
// 4. RESPONSIVE THEME HOOK
// ============================================================================

/**
 * Advanced hook for responsive theme management
 * Automatically adapts theme based on screen size and device type
 * 
 * @example
 * const App = () => {
 *   const { responsiveTheme, screens, isMobile } = useResponsiveTheme(themeConfig);
 *   
 *   return (
 *     <ConfigProvider theme={responsiveTheme}>
 *       {isMobile ? <MobileLayout /> : <DesktopLayout />}
 *     </ConfigProvider>
 *   );
 * };
 */
export const useResponsiveTheme = (baseTheme: ThemeConfig) => {
  const screens = useBreakpoint();
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Track window resize for device type detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine current breakpoint
  const currentBreakpoint = useMemo((): BreakpointKey => {
    if (screens.xxl) return 'xxl';
    if (screens.xl) return 'xl';
    if (screens.lg) return 'lg';
    if (screens.md) return 'md';
    if (screens.sm) return 'sm';
    return 'xs';
  }, [screens]);

  // Device type detection
  const deviceType = useMemo(() => getDeviceType(windowWidth), [windowWidth]);
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  // Create responsive theme (memoized for performance)
  const responsiveTheme = useMemo(
    () => createResponsiveTheme(baseTheme, currentBreakpoint, isMobile),
    [baseTheme, currentBreakpoint, isMobile]
  );

  return {
    responsiveTheme,
    currentBreakpoint,
    screens,
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    windowWidth,
  };
};

// ============================================================================
// 5. RESPONSIVE UTILITY HOOKS
// ============================================================================

/**
 * Get responsive column spans based on breakpoint
 * Simplifies grid layouts with automatic span calculation
 * 
 * @example
 * const colSpan = useResponsiveColSpan({ xs: 24, md: 12, lg: 8 });
 * return <Col span={colSpan}>Content</Col>;
 */
export const useResponsiveColSpan = (spans: Partial<Record<BreakpointKey, number>>) => {
  const screens = useBreakpoint();

  return useMemo(() => {
    if (screens.xxl && spans.xxl) return spans.xxl;
    if (screens.xl && spans.xl) return spans.xl;
    if (screens.lg && spans.lg) return spans.lg;
    if (screens.md && spans.md) return spans.md;
    if (screens.sm && spans.sm) return spans.sm;
    return spans.xs || 24; // Default to full width on mobile
  }, [screens, spans]);
};

/**
 * Get responsive value based on current breakpoint
 * Generic utility for any responsive configuration
 * 
 * @example
 * const padding = useResponsiveValue({ xs: 8, md: 16, lg: 24 });
 * const columns = useResponsiveValue({ xs: 1, sm: 2, md: 3, lg: 4 });
 */
export const useResponsiveValue = <T,>(values: Partial<Record<BreakpointKey, T>>, defaultValue: T): T => {
  const screens = useBreakpoint();

  return useMemo(() => {
    if (screens.xxl && values.xxl !== undefined) return values.xxl;
    if (screens.xl && values.xl !== undefined) return values.xl;
    if (screens.lg && values.lg !== undefined) return values.lg;
    if (screens.md && values.md !== undefined) return values.md;
    if (screens.sm && values.sm !== undefined) return values.sm;
    return values.xs !== undefined ? values.xs : defaultValue;
  }, [screens, values, defaultValue]);
};

// ============================================================================
// 6. RESPONSIVE COMPONENT PROPS
// ============================================================================

/**
 * Generate responsive gutter for Row components
 * Automatically adjusts spacing between grid items
 */
export const getResponsiveGutter = (screens: ReturnType<typeof useBreakpoint>): [number, number] => {
  if (screens.xxl) return [32, 32];
  if (screens.xl) return [24, 24];
  if (screens.lg) return [24, 24];
  if (screens.md) return [16, 16];
  if (screens.sm) return [12, 12];
  return [8, 8]; // xs - minimal spacing on small screens
};

/**
 * Get responsive layout component props
 * Simplifies Layout.Sider configuration for responsive behavior
 */
export const getResponsiveSiderProps = (isMobile: boolean) => ({
  breakpoint: 'lg' as const,
  collapsedWidth: isMobile ? 0 : 80,
  width: isMobile ? '100%' : 200,
  trigger: isMobile ? null : undefined,
  style: {
    position: isMobile ? 'fixed' : 'relative',
    zIndex: isMobile ? 1000 : undefined,
  } as React.CSSProperties,
});

// ============================================================================
// 7. PERFORMANCE OPTIMIZATION
// ============================================================================

/**
 * Debounced breakpoint detection
 * Reduces unnecessary re-renders during window resize
 */
export const useDebouncedBreakpoint = (delay: number = 150) => {
  const screens = useBreakpoint();
  const [debouncedScreens, setDebouncedScreens] = useState(screens);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedScreens(screens);
    }, delay);

    return () => clearTimeout(handler);
  }, [screens, delay]);

  return debouncedScreens;
};

// ============================================================================
// 8. THEME TOKEN ACCESS
// ============================================================================

/**
 * Enhanced theme token hook with responsive awareness
 * Combines Ant Design's useToken with responsive context
 */
export const useResponsiveToken = () => {
  const { token } = antdTheme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return {
    token,
    screens,
    isMobile,
    // Convenience getters
    spacing: {
      xs: token.paddingXS,
      sm: token.paddingSM,
      md: token.padding,
      lg: token.paddingLG,
      xl: token.paddingXL,
    },
    fontSize: {
      xs: token.fontSizeSM,
      sm: token.fontSize,
      md: token.fontSizeLG,
      lg: token.fontSizeXL,
      xl: token.fontSizeHeading5,
    },
  };
};

// ============================================================================
// 9. CSS MEDIA QUERIES (for styled components)
// ============================================================================

/**
 * Media query strings for use with CSS-in-JS
 * Compatible with Emotion, styled-components, etc.
 */
export const mediaQueries = {
  xs: `@media (max-width: ${BREAKPOINTS.sm - 1}px)`,
  sm: `@media (min-width: ${BREAKPOINTS.sm}px)`,
  md: `@media (min-width: ${BREAKPOINTS.md}px)`,
  lg: `@media (min-width: ${BREAKPOINTS.lg}px)`,
  xl: `@media (min-width: ${BREAKPOINTS.xl}px)`,
  xxl: `@media (min-width: ${BREAKPOINTS.xxl}px)`,
  // Range queries
  onlyMobile: `@media (max-width: ${BREAKPOINTS.md - 1}px)`,
  onlyTablet: `@media (min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  onlyDesktop: `@media (min-width: ${BREAKPOINTS.lg}px)`,
  // Touch device detection
  touchDevice: '@media (hover: none) and (pointer: coarse)',
} as const;

export default {
  BREAKPOINTS,
  getDeviceType,
  getResponsiveSpacing,
  getTouchFriendlyTokens,
  createResponsiveTheme,
  useResponsiveTheme,
  useResponsiveColSpan,
  useResponsiveValue,
  getResponsiveGutter,
  getResponsiveSiderProps,
  useDebouncedBreakpoint,
  useResponsiveToken,
  mediaQueries,
};
