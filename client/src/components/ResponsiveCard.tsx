/**
 * Responsive Card Component
 * Automatically adjusts padding and sizing based on device type
 */

import React from 'react';
import { Card as AntCard } from 'antd';
import type { CardProps } from 'antd';
import type { CSSProperties } from 'react';
import { useResponsive } from '@/hooks';
import { sizing } from '@/utils/responsiveUtils';

interface ResponsiveCardProps extends CardProps {
  /** Use compact padding on mobile (default: true) */
  compactMobile?: boolean;
}

/**
 * Responsive Card Component
 * - Compact padding on mobile (12px)
 * - Normal padding on tablet (20px)
 * - Full padding on desktop (24px)
 */
export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  compactMobile = true,
  styles,
  style,
  ...props
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Determine padding based on device
  const padding = compactMobile
    ? isMobile
      ? sizing.card.mobile
      : isTablet
      ? sizing.card.tablet
      : sizing.card.desktop
    : undefined;

  const cardStyles: CSSProperties = {
    ...(padding && { padding }),
    ...style,
  };

  const bodyStyles = {
    ...(padding && { padding }),
    ...styles?.body,
  };

  return (
    <AntCard
      style={cardStyles}
      styles={{
        ...styles,
        body: bodyStyles,
      }}
      {...props}
    />
  );
};

/**
 * Stat Card Component (for dashboard statistics)
 * Full width on mobile, responsive columns on desktop
 */
interface StatCardProps extends ResponsiveCardProps {
  /** Stat value */
  value: number | string;
  /** Stat title/label */
  title: string;
  /** Icon element */
  icon?: React.ReactNode;
  /** Value color */
  valueColor?: string;
  /** Compact size */
  compact?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  title,
  icon,
  valueColor,
  compact = false,
  ...cardProps
}) => {
  const { isMobile } = useResponsive();

  const valueSize = compact
    ? isMobile
      ? 20
      : 24
    : isMobile
    ? 24
    : 32;

  const titleSize = compact ? 12 : 14;
  const iconSize = compact ? 24 : isMobile ? 32 : 40;

  return (
    <ResponsiveCard {...cardProps}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: titleSize,
              color: 'rgba(0, 0, 0, 0.65)',
              marginBottom: 8,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: valueSize,
              fontWeight: 600,
              color: valueColor || 'rgba(0, 0, 0, 0.88)',
            }}
          >
            {value}
          </div>
        </div>
        {icon && (
          <div
            style={{
              fontSize: iconSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </ResponsiveCard>
  );
};
