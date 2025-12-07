/**
 * Responsive Button Component
 * Automatically adjusts sizing based on device type
 * Wraps Ant Design Button with mobile-first optimizations
 */

import React from 'react';
import { Button as AntButton } from 'antd';
import type { ButtonProps } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import { useResponsive } from '@/hooks';
import { sizing } from '@/utils/responsiveUtils';

interface ResponsiveButtonProps extends ButtonProps {
  /** Force full width on mobile (default: false) */
  fullWidthMobile?: boolean;
  /** Icon element (sized appropriately for device) */
  icon?: ReactNode;
  /** Minimum touch target size (default: 44px) */
  minTouchTarget?: number;
}

/**
 * Responsive Button Component
 * - 44px height on mobile (touch-friendly)
 * - Full width option on mobile
 * - Proper spacing and sizing
 */
export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  fullWidthMobile = false,
  size,
  block,
  style,
  minTouchTarget = 44,
  children,
  ...props
}) => {
  const { isMobile } = useResponsive();

  // Determine size based on device
  const buttonSize = size || (isMobile ? 'large' : 'middle');

  // Mobile-specific styles
  const mobileStyles: CSSProperties = isMobile
    ? {
        minHeight: minTouchTarget || sizing.button.mobile,
        fontSize: 16, // Prevent iOS zoom
        padding: '0 16px',
        ...(fullWidthMobile && { width: '100%' }),
      }
    : {};

  return (
    <AntButton
      size={buttonSize}
      block={block || (isMobile && fullWidthMobile)}
      style={{
        ...mobileStyles,
        ...style,
      }}
      {...props}
    >
      {children}
    </AntButton>
  );
};

/**
 * Mobile-Optimized Icon Button
 * Ensures proper touch target size (48x48 minimum)
 */
export const ResponsiveIconButton: React.FC<ResponsiveButtonProps> = ({
  size,
  shape = 'circle',
  style,
  ...props
}) => {
  const { isMobile } = useResponsive();

  const iconButtonStyles: CSSProperties = isMobile
    ? {
        width: sizing.touchTarget.comfortable,
        height: sizing.touchTarget.comfortable,
        minWidth: sizing.touchTarget.comfortable,
        minHeight: sizing.touchTarget.comfortable,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }
    : {
        width: sizing.button.desktop,
        height: sizing.button.desktop,
      };

  return (
    <AntButton
      size={size || 'large'}
      shape={shape}
      style={{
        ...iconButtonStyles,
        ...style,
      }}
      {...props}
    />
  );
};
