/**
 * ResponsiveForm Component
 * 
 * Mobile-optimized form components with proper touch targets and responsive behavior
 * Features:
 * - 44px minimum height for inputs (touch-friendly)
 * - Full-width inputs on mobile devices
 * - Responsive label positioning (top on mobile, optional inline on desktop)
 * - Proper keyboard types for input fields
 * - Adaptive spacing and padding
 * 
 * Usage:
 * import { ResponsiveInput, ResponsiveSelect, ResponsiveFormItem } from '@/components';
 * 
 * <ResponsiveFormItem label="Email" name="email">
 *   <ResponsiveInput type="email" placeholder="Enter email" />
 * </ResponsiveFormItem>
 */

import React from 'react';
import { Input, Select, Form, DatePicker, TimePicker, InputNumber } from 'antd';
import type { InputProps, SelectProps, FormItemProps, DatePickerProps, TimePickerProps, InputNumberProps } from 'antd';
import type { TextAreaProps } from 'antd/es/input';
import { useResponsive } from '@/hooks';
import { sizing, spacing } from '@/utils/responsiveUtils';

const { TextArea } = Input;

// ============================================================================
// ResponsiveInput - Mobile-optimized text input
// ============================================================================

interface ResponsiveInputProps extends InputProps {
  /** Whether input should be full-width on mobile (default: true) */
  fullWidthMobile?: boolean;
  /** Input type for proper mobile keyboard */
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'password' | 'search';
}

export const ResponsiveInput: React.FC<ResponsiveInputProps> = ({
  fullWidthMobile = true,
  style,
  type = 'text',
  ...props
}) => {
  const { isMobile } = useResponsive();

  const responsiveStyle: React.CSSProperties = {
    minHeight: isMobile ? sizing.input.mobile : sizing.input.desktop,
    width: isMobile && fullWidthMobile ? '100%' : undefined,
    fontSize: isMobile ? '16px' : '14px', // Prevent iOS zoom on focus
    ...style,
  };

  return (
    <Input
      type={type}
      style={responsiveStyle}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveTextArea - Mobile-optimized textarea
// ============================================================================

interface ResponsiveTextAreaProps extends TextAreaProps {
  /** Number of rows (default: auto-adjusts on mobile) */
  rows?: number;
  /** Whether textarea should be full-width on mobile (default: true) */
  fullWidthMobile?: boolean;
}

export const ResponsiveTextArea: React.FC<ResponsiveTextAreaProps> = ({
  fullWidthMobile = true,
  rows,
  style,
  ...props
}) => {
  const { isMobile } = useResponsive();

  const responsiveRows = rows ?? (isMobile ? 3 : 4);

  const responsiveStyle: React.CSSProperties = {
    width: isMobile && fullWidthMobile ? '100%' : undefined,
    fontSize: isMobile ? '16px' : '14px', // Prevent iOS zoom
    ...style,
  };

  return (
    <TextArea
      rows={responsiveRows}
      style={responsiveStyle}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveSelect - Mobile-optimized select dropdown
// ============================================================================

interface ResponsiveSelectProps extends SelectProps {
  /** Whether select should be full-width on mobile (default: true) */
  fullWidthMobile?: boolean;
}

export const ResponsiveSelect: React.FC<ResponsiveSelectProps> = ({
  fullWidthMobile = true,
  style,
  ...props
}) => {
  const { isMobile } = useResponsive();

  const responsiveStyle: React.CSSProperties = {
    minHeight: isMobile ? sizing.input.mobile : sizing.input.desktop,
    width: isMobile && fullWidthMobile ? '100%' : undefined,
    ...style,
  };

  return (
    <Select
      style={responsiveStyle}
      size={isMobile ? 'large' : 'middle'}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveInputNumber - Mobile-optimized number input
// ============================================================================

interface ResponsiveInputNumberProps extends InputNumberProps {
  /** Whether input should be full-width on mobile (default: true) */
  fullWidthMobile?: boolean;
}

export const ResponsiveInputNumber: React.FC<ResponsiveInputNumberProps> = ({
  fullWidthMobile = true,
  style,
  ...props
}) => {
  const { isMobile } = useResponsive();

  const responsiveStyle: React.CSSProperties = {
    minHeight: isMobile ? sizing.input.mobile : sizing.input.desktop,
    width: isMobile && fullWidthMobile ? '100%' : undefined,
    fontSize: isMobile ? '16px' : '14px',
    ...style,
  };

  return (
    <InputNumber
      style={responsiveStyle}
      size={isMobile ? 'large' : 'middle'}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveDatePicker - Mobile-optimized date picker
// ============================================================================

interface ResponsiveDatePickerProps extends DatePickerProps {
  /** Whether picker should be full-width on mobile (default: true) */
  fullWidthMobile?: boolean;
}

export const ResponsiveDatePicker: React.FC<ResponsiveDatePickerProps> = ({
  fullWidthMobile = true,
  style,
  ...props
}) => {
  const { isMobile } = useResponsive();

  const responsiveStyle: React.CSSProperties = {
    minHeight: isMobile ? sizing.input.mobile : sizing.input.desktop,
    width: isMobile && fullWidthMobile ? '100%' : undefined,
    ...style,
  };

  return (
    <DatePicker
      style={responsiveStyle}
      size={isMobile ? 'large' : 'middle'}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveTimePicker - Mobile-optimized time picker
// ============================================================================

interface ResponsiveTimePickerProps extends TimePickerProps {
  /** Whether picker should be full-width on mobile (default: true) */
  fullWidthMobile?: boolean;
}

export const ResponsiveTimePicker: React.FC<ResponsiveTimePickerProps> = ({
  fullWidthMobile = true,
  style,
  ...props
}) => {
  const { isMobile } = useResponsive();

  const responsiveStyle: React.CSSProperties = {
    minHeight: isMobile ? sizing.input.mobile : sizing.input.desktop,
    width: isMobile && fullWidthMobile ? '100%' : undefined,
    ...style,
  };

  return (
    <TimePicker
      style={responsiveStyle}
      size={isMobile ? 'large' : 'middle'}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveFormItem - Mobile-optimized form item with adaptive layout
// ============================================================================

interface ResponsiveFormItemProps extends FormItemProps {
  /** Force vertical layout on mobile (default: true) */
  verticalOnMobile?: boolean;
}

export const ResponsiveFormItem: React.FC<ResponsiveFormItemProps> = ({
  verticalOnMobile = true,
  style,
  labelCol,
  wrapperCol,
  ...props
}) => {
  const { isMobile } = useResponsive();

  // Mobile: vertical layout, Desktop: can use provided layout
  const responsiveLabelCol = isMobile && verticalOnMobile ? { span: 24 } : labelCol;
  const responsiveWrapperCol = isMobile && verticalOnMobile ? { span: 24 } : wrapperCol;

  const responsiveStyle: React.CSSProperties = {
    marginBottom: isMobile ? spacing.mobile.field : spacing.desktop.field,
    ...style,
  };

  return (
    <Form.Item
      labelCol={responsiveLabelCol}
      wrapperCol={responsiveWrapperCol}
      style={responsiveStyle}
      {...props}
    />
  );
};

// ============================================================================
// ResponsiveForm - Mobile-optimized form container
// ============================================================================

interface ResponsiveFormProps {
  children: React.ReactNode;
  /** Ant Design Form props */
  [key: string]: any;
}

export const ResponsiveForm: React.FC<ResponsiveFormProps> = ({
  children,
  layout,
  ...props
}) => {
  const { isMobile } = useResponsive();

  // Force vertical layout on mobile for better UX
  const responsiveLayout = isMobile ? 'vertical' : (layout || 'horizontal');

  return (
    <Form
      layout={responsiveLayout}
      {...props}
    >
      {children}
    </Form>
  );
};

// ============================================================================
// Export all components
// ============================================================================

export default {
  ResponsiveInput,
  ResponsiveTextArea,
  ResponsiveSelect,
  ResponsiveInputNumber,
  ResponsiveDatePicker,
  ResponsiveTimePicker,
  ResponsiveFormItem,
  ResponsiveForm,
};
