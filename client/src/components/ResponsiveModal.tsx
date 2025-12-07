/**
 * ResponsiveModal Component
 * 
 * Mobile-optimized modal/drawer with touch-friendly interactions
 * Features:
 * - Full-screen or near-full-screen on mobile (90% width)
 * - Touch-friendly close button (32px minimum)
 * - Vertical button stacking on mobile
 * - Responsive padding (16px mobile, 24px desktop)
 * - Option to use Drawer on mobile for better UX
 * 
 * Usage:
 * import { ResponsiveModal, ResponsiveDrawer } from '@/components';
 * 
 * <ResponsiveModal
 *   title="Edit Device"
 *   open={isOpen}
 *   onCancel={handleClose}
 *   footer={[
 *     <ResponsiveButton key="cancel" onClick={handleClose}>Cancel</ResponsiveButton>,
 *     <ResponsiveButton key="submit" type="primary" onClick={handleSubmit}>Submit</ResponsiveButton>
 *   ]}
 * >
 *   Modal content here
 * </ResponsiveModal>
 */

import React from 'react';
import { Modal, Drawer, Space } from 'antd';
import type { ModalProps, DrawerProps } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useResponsive } from '@/hooks';
import { spacing, modalWidth } from '@/utils/responsiveUtils';

// ============================================================================
// ResponsiveModal - Mobile-optimized modal
// ============================================================================

interface ResponsiveModalProps extends ModalProps {
  /** Whether to use full-screen modal on mobile (default: false, uses 90% width) */
  fullScreenMobile?: boolean;
  /** Whether to stack footer buttons vertically on mobile (default: true) */
  stackButtonsMobile?: boolean;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  fullScreenMobile = false,
  stackButtonsMobile = true,
  width,
  footer,
  bodyStyle,
  style,
  centered = true,
  ...props
}) => {
  const { isMobile } = useResponsive();

  // Responsive width
  const responsiveWidth = isMobile 
    ? (fullScreenMobile ? '100%' : '90%')
    : (width || modalWidth.medium);

  // Responsive body style
  const responsiveBodyStyle: React.CSSProperties = {
    padding: isMobile ? spacing.mobile.card : spacing.desktop.card,
    maxHeight: isMobile ? '70vh' : '600px',
    overflowY: 'auto',
    ...bodyStyle,
  };

  // Responsive footer with stacked buttons on mobile
  const responsiveFooter = React.useMemo(() => {
    if (!footer || !isMobile || !stackButtonsMobile) {
      return footer;
    }

    // If footer is an array of buttons, stack them vertically
    if (Array.isArray(footer)) {
      return (
        <Space direction="vertical" style={{ width: '100%' }} size={spacing.mobile.buttonGroup}>
          {footer.map((button, index) => {
            if (React.isValidElement(button)) {
              return React.cloneElement(button, {
                key: button.key || `button-${index}`,
                style: { width: '100%', ...(button.props as any)?.style },
              } as any);
            }
            return button;
          })}
        </Space>
      );
    }

    return footer;
  }, [footer, isMobile, stackButtonsMobile]);

  // Responsive modal style
  const responsiveStyle: React.CSSProperties = {
    top: isMobile && fullScreenMobile ? 0 : undefined,
    paddingBottom: isMobile && fullScreenMobile ? 0 : undefined,
    ...style,
  };

  return (
    <Modal
      width={responsiveWidth}
      centered={centered}
      bodyStyle={responsiveBodyStyle}
      style={responsiveStyle}
      footer={responsiveFooter}
      closeIcon={
        <CloseOutlined 
          style={{ 
            fontSize: isMobile ? '20px' : '16px',
            padding: isMobile ? '12px' : '8px',
          }} 
        />
      }
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveDrawer - Mobile-optimized drawer (alternative to modal on mobile)
// ============================================================================

interface ResponsiveDrawerProps extends DrawerProps {
  /** Whether to use full-height drawer (default: true) */
  fullHeight?: boolean;
  /** Whether to stack footer buttons vertically (default: true) */
  stackButtons?: boolean;
}

export const ResponsiveDrawer: React.FC<ResponsiveDrawerProps> = ({
  fullHeight = true,
  stackButtons = true,
  width,
  placement = 'right',
  footer,
  bodyStyle,
  headerStyle,
  ...props
}) => {
  const { isMobile, isTablet } = useResponsive();

  // Responsive width/height based on placement
  const responsiveWidth = React.useMemo(() => {
    if (placement === 'left' || placement === 'right') {
      if (isMobile) return '85%';
      if (isTablet) return '70%';
      return width || 480;
    }
    return width;
  }, [isMobile, isTablet, placement, width]);

  const responsiveHeight = React.useMemo(() => {
    if (placement === 'top' || placement === 'bottom') {
      if (isMobile && fullHeight) return '90%';
      if (isMobile) return '70%';
      return 'auto';
    }
    return '100%';
  }, [isMobile, placement, fullHeight]);

  // Responsive body style
  const responsiveBodyStyle: React.CSSProperties = {
    padding: isMobile ? spacing.mobile.card : spacing.desktop.card,
    ...bodyStyle,
  };

  // Responsive header style
  const responsiveHeaderStyle: React.CSSProperties = {
    padding: isMobile ? `${spacing.mobile.card}px ${spacing.mobile.card}px` : `${spacing.desktop.card}px ${spacing.desktop.card}px`,
    ...headerStyle,
  };

  // Responsive footer with stacked buttons
  const responsiveFooter = React.useMemo(() => {
    if (!footer || !isMobile || !stackButtons) {
      return footer;
    }

    // Wrap footer in Space for vertical stacking
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={spacing.mobile.buttonGroup}>
        {React.Children.map(footer as any, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              key: child.key || `button-${index}`,
              style: { width: '100%', ...(child.props as any)?.style },
            } as any);
          }
          return child;
        })}
      </Space>
    );
  }, [footer, isMobile, stackButtons]);

  return (
    <Drawer
      width={responsiveWidth}
      height={responsiveHeight}
      placement={placement}
      bodyStyle={responsiveBodyStyle}
      headerStyle={responsiveHeaderStyle}
      footer={responsiveFooter}
      closeIcon={
        <CloseOutlined 
          style={{ 
            fontSize: isMobile ? '20px' : '16px',
            padding: isMobile ? '12px' : '8px',
          }} 
        />
      }
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveModalDrawer - Automatically uses Modal on desktop, Drawer on mobile
// ============================================================================

interface ResponsiveModalDrawerProps extends Omit<ResponsiveModalProps, 'width'> {
  /** Drawer placement when on mobile (default: 'bottom') */
  drawerPlacement?: DrawerProps['placement'];
  /** Custom width for desktop modal */
  modalWidth?: number | string;
  /** Custom width for drawer */
  drawerWidth?: DrawerProps['width'];
}

export const ResponsiveModalDrawer: React.FC<ResponsiveModalDrawerProps> = ({
  drawerPlacement = 'bottom',
  modalWidth,
  drawerWidth,
  fullScreenMobile,
  stackButtonsMobile = true,
  children,
  ...props
}) => {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <ResponsiveDrawer
        placement={drawerPlacement}
        width={drawerWidth}
        fullHeight={fullScreenMobile}
        stackButtons={stackButtonsMobile}
        {...(props as DrawerProps)}
      >
        {children}
      </ResponsiveDrawer>
    );
  }

  return (
    <ResponsiveModal
      width={modalWidth}
      stackButtonsMobile={stackButtonsMobile}
      {...props}
    >
      {children}
    </ResponsiveModal>
  );
};

// ============================================================================
// Export all components
// ============================================================================

export default {
  ResponsiveModal,
  ResponsiveDrawer,
  ResponsiveModalDrawer,
};
