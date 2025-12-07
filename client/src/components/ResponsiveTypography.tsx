/**
 * ResponsiveTypography Component
 * 
 * Mobile-optimized typography with responsive sizing and proper line heights
 * Features:
 * - Automatic font size scaling based on device (h1: 24px mobile → 38px desktop)
 * - Proper line heights for readability
 * - Text truncation options for mobile
 * - Touch-friendly text spacing
 * 
 * Usage:
 * import { ResponsiveTitle, ResponsiveText, ResponsiveParagraph } from '@/components';
 * 
 * <ResponsiveTitle level={1}>Dashboard</ResponsiveTitle>
 * <ResponsiveParagraph>Description text here...</ResponsiveParagraph>
 */

import React from 'react';
import { Typography } from 'antd';
import type { TitleProps } from 'antd/es/typography/Title';
import type { TextProps } from 'antd/es/typography/Text';
import type { ParagraphProps } from 'antd/es/typography/Paragraph';
import { useResponsive } from '@/hooks';
import { typography, spacing } from '@/utils/responsiveUtils';

const { Title, Text, Paragraph } = Typography;

// ============================================================================
// ResponsiveTitle - Mobile-optimized heading
// ============================================================================

interface ResponsiveTitleProps extends TitleProps {
  /** Whether to apply mobile truncation (default: false) */
  truncateMobile?: boolean;
  /** Maximum lines before truncation on mobile (default: 2) */
  maxLinesMobile?: number;
}

export const ResponsiveTitle: React.FC<ResponsiveTitleProps> = ({
  level = 1,
  truncateMobile = false,
  maxLinesMobile = 2,
  style,
  ellipsis,
  ...props
}) => {
  const { isMobile } = useResponsive();

  // Get responsive font size based on level
  const getFontSize = () => {
    switch (level) {
      case 1:
        return isMobile ? typography.heading.h1.mobile : typography.heading.h1.desktop;
      case 2:
        return isMobile ? typography.heading.h2.mobile : typography.heading.h2.desktop;
      case 3:
        return isMobile ? typography.heading.h3.mobile : typography.heading.h3.desktop;
      case 4:
        return isMobile ? typography.heading.h4.mobile : typography.heading.h4.desktop;
      case 5:
        return isMobile ? typography.heading.h5.mobile : typography.heading.h5.desktop;
      default:
        return isMobile ? typography.body.mobile : typography.body.desktop;
    }
  };

  const responsiveStyle: React.CSSProperties = {
    fontSize: getFontSize(),
    lineHeight: typography.lineHeight.heading,
    marginBottom: isMobile ? spacing.mobile.section / 2 : spacing.desktop.section / 2,
    ...style,
  };

  // Apply truncation on mobile if enabled
  const responsiveEllipsis = truncateMobile && isMobile
    ? { rows: maxLinesMobile, ...(typeof ellipsis === 'object' ? ellipsis : {}) }
    : ellipsis;

  return (
    <Title
      level={level}
      style={responsiveStyle}
      ellipsis={responsiveEllipsis}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveText - Mobile-optimized inline text
// ============================================================================

interface ResponsiveTextProps extends TextProps {
  /** Text size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to apply mobile truncation */
  truncateMobile?: boolean;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  size = 'medium',
  truncateMobile = false,
  style,
  ellipsis,
  ...props
}) => {
  const { isMobile } = useResponsive();

  // Get font size based on size variant
  const getFontSize = () => {
    switch (size) {
      case 'small':
        return isMobile ? typography.small.mobile : typography.small.desktop;
      case 'large':
        return isMobile ? typography.large.mobile : typography.large.desktop;
      case 'medium':
      default:
        return isMobile ? typography.body.mobile : typography.body.desktop;
    }
  };

  const responsiveStyle: React.CSSProperties = {
    fontSize: getFontSize(),
    lineHeight: typography.lineHeight.body,
    ...style,
  };

  // Apply truncation on mobile if enabled
  const responsiveEllipsis = truncateMobile && isMobile
    ? true
    : ellipsis;

  return (
    <Text
      style={responsiveStyle}
      ellipsis={responsiveEllipsis}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveParagraph - Mobile-optimized paragraph
// ============================================================================

interface ResponsiveParagraphProps extends ParagraphProps {
  /** Whether to apply mobile truncation */
  truncateMobile?: boolean;
  /** Maximum lines before truncation on mobile (default: 3) */
  maxLinesMobile?: number;
  /** Paragraph size variant */
  size?: 'small' | 'medium' | 'large';
}

export const ResponsiveParagraph: React.FC<ResponsiveParagraphProps> = ({
  truncateMobile = false,
  maxLinesMobile = 3,
  size = 'medium',
  style,
  ellipsis,
  ...props
}) => {
  const { isMobile } = useResponsive();

  // Get font size based on size variant
  const getFontSize = () => {
    switch (size) {
      case 'small':
        return isMobile ? typography.small.mobile : typography.small.desktop;
      case 'large':
        return isMobile ? typography.large.mobile : typography.large.desktop;
      case 'medium':
      default:
        return isMobile ? typography.body.mobile : typography.body.desktop;
    }
  };

  const responsiveStyle: React.CSSProperties = {
    fontSize: getFontSize(),
    lineHeight: typography.lineHeight.body,
    marginBottom: isMobile ? spacing.mobile.paragraph : spacing.desktop.paragraph,
    ...style,
  };

  // Apply truncation on mobile if enabled
  const responsiveEllipsis = truncateMobile && isMobile
    ? { rows: maxLinesMobile, expandable: true, symbol: 'more', ...(typeof ellipsis === 'object' ? ellipsis : {}) }
    : ellipsis;

  return (
    <Paragraph
      style={responsiveStyle}
      ellipsis={responsiveEllipsis}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveLabel - Mobile-optimized form label text
// ============================================================================

interface ResponsiveLabelProps extends TextProps {
  /** Whether label is required (shows asterisk) */
  required?: boolean;
}

export const ResponsiveLabel: React.FC<ResponsiveLabelProps> = ({
  required = false,
  style,
  children,
  ...props
}) => {
  const { isMobile } = useResponsive();

  const responsiveStyle: React.CSSProperties = {
    fontSize: isMobile ? '14px' : '14px', // Consistent across devices
    fontWeight: 500,
    lineHeight: typography.lineHeight.body,
    display: 'block',
    marginBottom: isMobile ? '4px' : '6px',
    ...style,
  };

  return (
    <Text style={responsiveStyle} {...props}>
      {children}
      {required && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>}
    </Text>
  );
};

// ============================================================================
// ResponsiveCaption - Mobile-optimized caption/helper text
// ============================================================================

interface ResponsiveCaptionProps extends TextProps {
  /** Caption type (info, error, warning, success) */
  type?: 'secondary' | 'success' | 'warning' | 'danger';
}

export const ResponsiveCaption: React.FC<ResponsiveCaptionProps> = ({
  type = 'secondary',
  style,
  ...props
}) => {
  const { isMobile } = useResponsive();

  const responsiveStyle: React.CSSProperties = {
    fontSize: isMobile ? typography.small.mobile : typography.small.desktop,
    lineHeight: typography.lineHeight.body,
    display: 'block',
    marginTop: '4px',
    ...style,
  };

  return (
    <Text
      type={type}
      style={responsiveStyle}
      {...props}
    />
  );
};

// ============================================================================
// Export all components
// ============================================================================

export default {
  ResponsiveTitle,
  ResponsiveText,
  ResponsiveParagraph,
  ResponsiveLabel,
  ResponsiveCaption,
};
