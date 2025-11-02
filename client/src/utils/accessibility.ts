/**
 * Accessibility Utilities
 * 
 * Helper functions and components for WCAG 2.1 AA compliance
 * Includes skip links, focus management, ARIA utilities, and keyboard navigation
 * 
 * @module utils/accessibility
 */

import { useEffect, useRef } from 'react';

// ============================================================================
// SKIP LINK COMPONENT
// ============================================================================

/**
 * SkipLink Component
 * Provides keyboard-only navigation to skip repetitive content
 * Essential for WCAG 2.1 AA Bypass Blocks (2.4.1)
 * 
 * @example
 * ```tsx
 * <SkipLink href="#main-content" />
 * ```
 */
export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }) => (
  <a
    href={href}
    style={{
      position: 'absolute',
      left: '-9999px',
      zIndex: 999,
      padding: '1em',
      backgroundColor: '#001f3f',
      color: 'white',
      textDecoration: 'none',
      fontWeight: 'bold',
      outline: '2px solid transparent',
      transition: 'all 0.2s',
    }}
    onFocus={(e) => {
      e.currentTarget.style.left = '0';
      e.currentTarget.style.top = '0';
    }}
    onBlur={(e) => {
      e.currentTarget.style.left = '-9999px';
    }}
  >
    {children}
  </a>
);

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Focus trap for modals and dialogs
 * Keeps focus within a container (WCAG 2.1.2 - No Keyboard Trap)
 * 
 * @param containerRef - Reference to container element
 * @param enabled - Whether trap is active
 * 
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null);
 * useFocusTrap(modalRef, isOpen);
 * ```
 */
export const useFocusTrap = (
  containerRef: React.RefObject<HTMLElement>,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [containerRef, enabled]);
};

/**
 * Announce content to screen readers
 * Creates live region for dynamic announcements (WCAG 4.1.3)
 * 
 * @param message - Message to announce
 * @param priority - 'polite' (default) or 'assertive'
 * 
 * @example
 * ```tsx
 * announce('Data loaded successfully', 'polite');
 * ```
 */
export const announce = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  const liveRegionId = `live-region-${priority}`;
  let liveRegion = document.getElementById(liveRegionId);

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = liveRegionId;
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
  }

  liveRegion.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    if (liveRegion) liveRegion.textContent = '';
  }, 1000);
};

/**
 * Hook to announce dynamic content changes
 * 
 * @example
 * ```tsx
 * const { announcePolite, announceAssertive } = useAnnouncer();
 * announcePolite('3 new alerts');
 * ```
 */
export const useAnnouncer = () => {
  return {
    announcePolite: (message: string) => announce(message, 'polite'),
    announceAssertive: (message: string) => announce(message, 'assertive'),
  };
};

// ============================================================================
// ARIA UTILITIES
// ============================================================================

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export const generateAriaId = (prefix: string = 'aria'): string => {
  return `${prefix}-${++idCounter}-${Date.now()}`;
};

/**
 * ARIA label utilities for common patterns
 */
export const ariaLabels = {
  closeButton: 'Close',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  loading: 'Loading...',
  moreActions: 'More actions',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  refresh: 'Refresh',
  delete: 'Delete',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
};

/**
 * Create ARIA props for icon buttons
 * 
 * @example
 * ```tsx
 * <Button icon={<SearchOutlined />} {...getIconButtonProps('Search devices')} />
 * ```
 */
export const getIconButtonProps = (label: string) => ({
  'aria-label': label,
  title: label,
});

/**
 * Create ARIA props for status badges
 * 
 * @example
 * ```tsx
 * <Badge status="success" {...getStatusBadgeProps('Online')} />
 * ```
 */
export const getStatusBadgeProps = (status: string) => ({
  'aria-label': `Status: ${status}`,
  role: 'status',
});

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

/**
 * Keyboard event handlers for accessibility
 */
export const keyboardHandlers = {
  /**
   * Handle Enter/Space key to activate button-like elements
   */
  clickOnEnterOrSpace: (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  },

  /**
   * Handle Escape key to close dialogs/modals
   */
  closeOnEscape: (callback: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      callback();
    }
  },

  /**
   * Arrow key navigation for lists
   */
  navigateList: (
    currentIndex: number,
    listLength: number,
    onIndexChange: (index: number) => void
  ) => (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        onIndexChange((currentIndex + 1) % listLength);
        break;
      case 'ArrowUp':
        e.preventDefault();
        onIndexChange((currentIndex - 1 + listLength) % listLength);
        break;
      case 'Home':
        e.preventDefault();
        onIndexChange(0);
        break;
      case 'End':
        e.preventDefault();
        onIndexChange(listLength - 1);
        break;
    }
  },
};

// ============================================================================
// FOCUS VISIBLE STYLES
// ============================================================================

/**
 * CSS-in-JS focus visible styles for custom components
 * 
 * @example
 * ```tsx
 * <div style={{ ...focusVisibleStyles }}>Content</div>
 * ```
 */
export const focusVisibleStyles: React.CSSProperties = {
  outline: '2px solid #001f3f',
  outlineOffset: '2px',
  transition: 'outline 0.2s',
};

/**
 * Focus visible CSS string for styled components
 */
export const focusVisibleCSS = `
  &:focus-visible {
    outline: 2px solid #001f3f;
    outline-offset: 2px;
  }
`;

// ============================================================================
// COLOR CONTRAST UTILITIES
// ============================================================================

/**
 * Check if color contrast meets WCAG AA standards
 * 
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @returns Object with contrast ratio and compliance status
 */
export const checkColorContrast = (
  foreground: string,
  background: string
): { ratio: number; passesAA: boolean; passesAAA: boolean } => {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rs, gs, bs] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,  // WCAG AA (normal text)
    passesAAA: ratio >= 7.0, // WCAG AAA (normal text)
  };
};

// ============================================================================
// SCREEN READER UTILITIES
// ============================================================================

/**
 * Screen reader only CSS class
 * Hides content visually but keeps it accessible to screen readers
 * 
 * @example
 * ```tsx
 * <span style={visuallyHiddenStyles}>Screen reader only text</span>
 * ```
 */
export const visuallyHiddenStyles: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
};

/**
 * VisuallyHidden component
 */
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={visuallyHiddenStyles}>{children}</span>
);

export default {
  SkipLink,
  useFocusTrap,
  announce,
  useAnnouncer,
  generateAriaId,
  ariaLabels,
  getIconButtonProps,
  getStatusBadgeProps,
  keyboardHandlers,
  focusVisibleStyles,
  focusVisibleCSS,
  checkColorContrast,
  visuallyHiddenStyles,
  VisuallyHidden,
};
