/**
 * useResponsive Hook
 * Provides responsive utilities and current breakpoint information
 * Uses Ant Design's Grid breakpoint system
 */

import { Grid } from 'antd';
import { useMemo } from 'react';

const { useBreakpoint } = Grid;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  /** Current active breakpoints */
  breakpoints: Record<string, boolean>;
  /** Device type categorization */
  deviceType: DeviceType;
  /** Is mobile (xs or sm) */
  isMobile: boolean;
  /** Is tablet (md) */
  isTablet: boolean;
  /** Is desktop (lg, xl, xxl) */
  isDesktop: boolean;
  /** Current breakpoint key */
  currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  /** Is touch device */
  isTouchDevice: boolean;
}

/**
 * Hook to get responsive information and utilities
 */
export const useResponsive = (): ResponsiveInfo => {
  const breakpoints = useBreakpoint();

  const responsiveInfo = useMemo(() => {
    // Determine current breakpoint (highest active)
    let currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'xs';
    if (breakpoints.xxl) currentBreakpoint = 'xxl';
    else if (breakpoints.xl) currentBreakpoint = 'xl';
    else if (breakpoints.lg) currentBreakpoint = 'lg';
    else if (breakpoints.md) currentBreakpoint = 'md';
    else if (breakpoints.sm) currentBreakpoint = 'sm';

    // Device type categorization
    const isMobile = !breakpoints.md;
    const isTablet = !!breakpoints.md && !breakpoints.lg;
    const isDesktop = !!breakpoints.lg;

    let deviceType: DeviceType = 'desktop';
    if (isMobile) deviceType = 'mobile';
    else if (isTablet) deviceType = 'tablet';

    // Check if touch device
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;

    return {
      breakpoints,
      currentBreakpoint,
      deviceType,
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
    };
  }, [breakpoints]);

  return responsiveInfo;
};

/**
 * Get responsive column span configurations
 * Returns optimized column spans for different screen sizes
 */
export const useResponsiveColumns = (config?: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return useMemo(() => {
    const defaultMobile = config?.mobile ?? 24; // Full width on mobile
    const defaultTablet = config?.tablet ?? 12; // Half width on tablet
    const defaultDesktop = config?.desktop ?? 8; // Third width on desktop

    return {
      xs: defaultMobile,
      sm: defaultMobile,
      md: defaultTablet,
      lg: defaultDesktop,
      xl: defaultDesktop,
      xxl: config?.desktop ?? 6, // Quarter width on ultra-wide
    };
  }, [isMobile, isTablet, isDesktop, config]);
};

/**
 * Get responsive table scroll configuration
 */
export const useTableScroll = (options?: {
  minHeight?: number;
  maxHeight?: number;
  offsetHeight?: number;
}) => {
  const { isMobile, isTablet } = useResponsive();

  return useMemo(() => {
    const offset = options?.offsetHeight ?? 400;

    // Mobile: More compact scroll
    if (isMobile) {
      return {
        x: '100%', // Always horizontal scroll on mobile
        y: `calc(100vh - ${offset + 100}px)`,
      };
    }

    // Tablet: Balanced scroll
    if (isTablet) {
      return {
        x: 1000, // Scroll if table wider than 1000px
        y: `calc(100vh - ${offset + 50}px)`,
      };
    }

    // Desktop: Larger scroll area
    const maxHeight = options?.maxHeight;
    return {
      x: 1200,
      y: maxHeight ? `${maxHeight}px` : `calc(100vh - ${offset}px)`,
    };
  }, [isMobile, isTablet, options]);
};

/**
 * Get responsive gutter (spacing between columns)
 */
export const useResponsiveGutter = (): [number, number] => {
  const { isMobile, isTablet } = useResponsive();

  return useMemo(() => {
    if (isMobile) return [12, 12]; // Tighter on mobile
    if (isTablet) return [16, 16]; // Medium on tablet
    return [24, 24]; // Spacious on desktop
  }, [isMobile, isTablet]);
};
