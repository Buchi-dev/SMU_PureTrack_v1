/**
 * Utility functions for AdminAlerts components
 */

import type { useThemeToken } from '../../../../theme';

/**
 * Helper to convert Ant Design color names to actual color values
 */
export const getColorValue = (
  colorName: string,
  token: ReturnType<typeof useThemeToken>
): string => {
  const colorMap: Record<string, string> = {
    'error': token.colorError,
    'warning': token.colorWarning,
    'success': token.colorSuccess,
    'processing': token.colorInfo,
    'default': token.colorTextSecondary,
  };
  return colorMap[colorName] || token.colorTextSecondary;
};
