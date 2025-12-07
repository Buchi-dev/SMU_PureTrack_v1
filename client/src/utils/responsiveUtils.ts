/**
 * Mobile-First Responsive Utilities
 * Consistent spacing, sizing, and component styles for mobile-optimized UI
 */

// ============================================================================
// RESPONSIVE DESIGN SYSTEM
// Consistent naming: lowercase nested objects for easy access
// ============================================================================

export const spacing = {
  // Mobile-first spacing (xs/sm)
  mobile: {
    page: 16,
    section: 12,
    component: 8,
    tight: 4,
    card: 12,
    field: 16,
    paragraph: 12,
    buttonGroup: 12,
  },
  // Tablet spacing (md)
  tablet: {
    page: 24,
    section: 20,
    component: 12,
    tight: 8,
    card: 20,
    field: 20,
    paragraph: 16,
    buttonGroup: 16,
  },
  // Desktop spacing (lg+)
  desktop: {
    page: 32,
    section: 24,
    component: 16,
    tight: 12,
    card: 24,
    field: 24,
    paragraph: 20,
    buttonGroup: 16,
  },
} as const;

// ============================================================================
// COMPONENT SIZING (Touch-Optimized)
// ============================================================================

export const sizing = {
  // Touch targets (minimum 44px for accessibility)
  touchTarget: {
    min: 44,
    comfortable: 48,
    large: 56,
  },
  
  // Button heights
  button: {
    mobile: 44,
    tablet: 44,
    desktop: 40,
    large: 48,
    small: 36,
  },
  
  // Input heights
  input: {
    mobile: 44,
    tablet: 44,
    desktop: 40,
    large: 48,
    small: 36,
  },
  
  // Card padding
  card: {
    mobile: 12,
    tablet: 20,
    desktop: 24,
  },
  
  // Table row heights
  tableRow: {
    mobile: 48,
    tablet: 44,
    desktop: 40,
  },
  
  // Header heights
  header: {
    mobile: 56,
    tablet: 64,
    desktop: 64,
  },
  
  // Menu item heights
  menuItem: {
    mobile: 48,
    tablet: 44,
    desktop: 40,
  },
} as const;

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================

export const typography = {
  // Heading sizes (responsive)
  heading: {
    h1: {
      mobile: 24,
      tablet: 32,
      desktop: 38,
    },
    h2: {
      mobile: 20,
      tablet: 24,
      desktop: 30,
    },
    h3: {
      mobile: 18,
      tablet: 20,
      desktop: 24,
    },
    h4: {
      mobile: 16,
      tablet: 18,
      desktop: 20,
    },
    h5: {
      mobile: 14,
      tablet: 16,
      desktop: 18,
    },
  },
  
  // Body text sizes
  body: {
    mobile: 16, // 16px minimum on mobile to prevent iOS zoom
    desktop: 14,
  },
  
  large: {
    mobile: 18,
    desktop: 16,
  },
  
  small: {
    mobile: 14,
    desktop: 12,
  },
  
  // Line heights
  lineHeight: {
    heading: 1.3,
    body: 1.5,
    tight: 1.25,
    relaxed: 1.75,
  },
} as const;

// ============================================================================
// GRID GUTTER (Responsive)
// ============================================================================

export const gridGutter = {
  mobile: [8, 8] as [number, number],
  tablet: [16, 16] as [number, number],
  desktop: [24, 24] as [number, number],
} as const;

// ============================================================================
// MODAL WIDTHS
// ============================================================================

export const modalWidth = {
  mobile: '90%',
  tablet: '70%',
  small: 420,
  medium: 520,
  large: 800,
  fullScreen: '100%',
} as const;

// ============================================================================
// ICON SIZES
// ============================================================================

export const iconSize = {
  tiny: 12,
  small: 16,
  medium: 20,
  large: 24,
  huge: 32,
  touchIcon: 24, // Icons in touch targets
} as const;

// ============================================================================
// BREAKPOINT HELPERS
// ============================================================================

export const breakpoints = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
} as const;

// Media query helpers
export const media = {
  xs: `@media (max-width: ${breakpoints.sm - 1}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  md: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  
  // Utility queries
  mobile: `@media (max-width: ${breakpoints.md - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.lg}px)`,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get responsive spacing value
 */
export const getSpacing = (
  type: keyof typeof spacing.mobile,
  device: 'mobile' | 'tablet' | 'desktop' = 'mobile'
): number => {
  return spacing[device][type];
};

/**
 * Get responsive component size
 */
export const getComponentSize = (
  component: keyof typeof sizing,
  device: 'mobile' | 'tablet' | 'desktop' = 'mobile'
): number => {
  const sizes = sizing[component];
  if (typeof sizes === 'object' && 'mobile' in sizes) {
    return sizes[device];
  }
  return typeof sizes === 'number' ? sizes : sizes.min;
};

/**
 * Get responsive typography size
 */
export const getTypographySize = (
  level: keyof typeof typography.heading,
  device: 'mobile' | 'tablet' | 'desktop' = 'mobile'
): number => {
  return typography.heading[level][device];
};

/**
 * Get grid gutter for device
 */
export const getGridGutter = (device: 'mobile' | 'tablet' | 'desktop' = 'mobile'): [number, number] => {
  return gridGutter[device];
};

// ============================================================================
// COMMON STYLE OBJECTS (for inline styles)
// ============================================================================

export const mobileStyles = {
  // Full width button
  fullWidthButton: {
    width: '100%',
    height: sizing.button.mobile,
  },
  
  // Compact card
  compactCard: {
    padding: sizing.card.mobile,
  },
  
  // Stack spacing
  stackSpacing: {
    marginBottom: spacing.mobile.component,
  },
  
  // Page container
  pageContainer: {
    padding: spacing.mobile.page,
  },
} as const;

export const desktopStyles = {
  // Auto width button
  autoWidthButton: {
    width: 'auto',
    height: sizing.button.desktop,
  },
  
  // Normal card
  normalCard: {
    padding: sizing.card.desktop,
  },
  
  // Stack spacing
  stackSpacing: {
    marginBottom: spacing.desktop.component,
  },
  
  // Page container
  pageContainer: {
    padding: spacing.desktop.page,
  },
} as const;
