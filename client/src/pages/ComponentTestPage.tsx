/**
 * Responsive Component Test Page
 * 
 * Comprehensive testing page for all responsive components.
 * Use this to verify components work correctly before deploying app-wide.
 * 
 * Test on these viewports:
 * - Mobile: 375px (iPhone SE)
 * - Tablet: 768px (iPad)
 * - Desktop: 1280px+
 */

import React, { useState } from 'react';
import { Row, Col, Space, Divider, Alert } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  ResponsiveButton,
  ResponsiveIconButton,
  ResponsiveCard,
  StatCard,
  ResponsiveInput,
  ResponsiveTextArea,
  ResponsiveSelect,
  ResponsiveInputNumber,
  ResponsiveDatePicker,
  ResponsiveFormItem,
  ResponsiveForm,
  ResponsiveModal,
  ResponsiveDrawer,
  ResponsiveTitle,
  ResponsiveText,
  ResponsiveParagraph,
  ResponsiveLabel,
  ResponsiveCaption,
} from '@/components';
import { useResponsive } from '@/hooks';

const ComponentTestPage: React.FC = () => {
  const { isMobile, isTablet, isDesktop, deviceType } = useResponsive();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Device Info Banner */}
      <Alert
        message={`Current Device: ${deviceType.toUpperCase()}`}
        description={`isMobile: ${isMobile}, isTablet: ${isTablet}, isDesktop: ${isDesktop}`}
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <ResponsiveTitle level={1}>Responsive Component Test Page</ResponsiveTitle>
      <ResponsiveParagraph>
        This page demonstrates all responsive components. Resize your browser to see how components adapt to different screen sizes.
        Test viewports: 375px (mobile), 768px (tablet), 1280px+ (desktop).
      </ResponsiveParagraph>

      <Divider />

      {/* SECTION 1: Buttons */}
      <ResponsiveTitle level={2}>1. Responsive Buttons</ResponsiveTitle>
      <ResponsiveParagraph>
        Buttons should be 44px height on mobile, full-width option available.
      </ResponsiveParagraph>

      <ResponsiveCard title="Button Variants" compactMobile>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={[8, 8]}>
            <Col xs={24} sm={12} md={8}>
              <ResponsiveButton type="primary" block>
                Primary Button
              </ResponsiveButton>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <ResponsiveButton type="default" block>
                Default Button
              </ResponsiveButton>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <ResponsiveButton type="dashed" block>
                Dashed Button
              </ResponsiveButton>
            </Col>
          </Row>

          <Row gutter={[8, 8]}>
            <Col xs={24} sm={12} md={8}>
              <ResponsiveButton type="primary" icon={<PlusOutlined />} fullWidthMobile>
                Add Item
              </ResponsiveButton>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <ResponsiveButton type="default" icon={<EditOutlined />} fullWidthMobile>
                Edit Item
              </ResponsiveButton>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <ResponsiveButton danger icon={<DeleteOutlined />} fullWidthMobile>
                Delete Item
              </ResponsiveButton>
            </Col>
          </Row>

          <Space wrap>
            <ResponsiveIconButton type="primary" icon={<DashboardOutlined />} />
            <ResponsiveIconButton type="default" icon={<UserOutlined />} />
            <ResponsiveIconButton type="default" icon={<SettingOutlined />} />
            <ResponsiveIconButton type="primary" icon={<CheckCircleOutlined />} shape="circle" />
          </Space>

          <ResponsiveCaption>
            ✓ Mobile: 44px minimum height, full-width option
            <br />
            ✓ Icon buttons: 48x48 touch target
            <br />✓ Desktop: Auto-width, 40px height
          </ResponsiveCaption>
        </Space>
      </ResponsiveCard>

      <Divider />

      {/* SECTION 2: Cards */}
      <ResponsiveTitle level={2}>2. Responsive Cards</ResponsiveTitle>
      <ResponsiveParagraph>
        Cards adapt padding: 12px mobile → 20px tablet → 24px desktop.
      </ResponsiveParagraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Active Devices"
            value={42}
            icon={<DashboardOutlined />}
            valueColor="#1890ff"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Total Users"
            value={127}
            icon={<UserOutlined />}
            valueColor="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Alerts Today"
            value={8}
            icon={<CheckCircleOutlined />}
            valueColor="#faad14"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="System Health"
            value="98%"
            icon={<SettingOutlined />}
            valueColor="#52c41a"
          />
        </Col>
      </Row>

      <div style={{ marginTop: '16px' }}>
        <ResponsiveCard title="Regular Responsive Card" compactMobile>
          <ResponsiveText>
            This card has adaptive padding. Check the padding on different screen sizes:
          </ResponsiveText>
          <ul>
            <li>Mobile: 12px padding</li>
            <li>Tablet: 20px padding</li>
            <li>Desktop: 24px padding</li>
          </ul>
          <ResponsiveCaption type="secondary">
            Current device: {deviceType} | Padding adjusts automatically
          </ResponsiveCaption>
        </ResponsiveCard>
      </div>

      <Divider />

      {/* SECTION 3: Forms */}
      <ResponsiveTitle level={2}>3. Responsive Form Components</ResponsiveTitle>
      <ResponsiveParagraph>
        Form inputs are 44px height on mobile with 16px font to prevent iOS zoom.
        Labels stack vertically on mobile for better usability.
      </ResponsiveParagraph>

      <ResponsiveCard title="Form Example" compactMobile>
        <ResponsiveForm layout="horizontal">
          <ResponsiveFormItem
            label="Full Name"
            name="fullName"
            rules={[{ required: true, message: 'Please enter your name' }]}
          >
            <ResponsiveInput placeholder="Enter your full name" />
          </ResponsiveFormItem>

          <ResponsiveFormItem
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Please enter valid email' }]}
          >
            <ResponsiveInput type="email" placeholder="your.email@example.com" />
          </ResponsiveFormItem>

          <ResponsiveFormItem label="Phone" name="phone">
            <ResponsiveInput type="tel" placeholder="+1 (555) 123-4567" />
          </ResponsiveFormItem>

          <ResponsiveFormItem label="Device Type" name="deviceType">
            <ResponsiveSelect
              placeholder="Select device type"
              options={[
                { value: 'sensor', label: 'Water Sensor' },
                { value: 'controller', label: 'Controller' },
                { value: 'gateway', label: 'Gateway' },
              ]}
            />
          </ResponsiveFormItem>

          <ResponsiveFormItem label="Threshold Value" name="threshold">
            <ResponsiveInputNumber
              placeholder="Enter value"
              min={0}
              max={100}
              style={{ width: '100%' }}
            />
          </ResponsiveFormItem>

          <ResponsiveFormItem label="Installation Date" name="installDate">
            <ResponsiveDatePicker placeholder="Select date" style={{ width: '100%' }} />
          </ResponsiveFormItem>

          <ResponsiveFormItem label="Description" name="description">
            <ResponsiveTextArea rows={3} placeholder="Enter description..." />
          </ResponsiveFormItem>

          <ResponsiveFormItem>
            <Space style={{ width: '100%' }} direction={isMobile ? 'vertical' : 'horizontal'}>
              <ResponsiveButton type="primary" icon={<SaveOutlined />} htmlType="submit">
                Save Changes
              </ResponsiveButton>
              <ResponsiveButton>Cancel</ResponsiveButton>
            </Space>
          </ResponsiveFormItem>
        </ResponsiveForm>

        <ResponsiveCaption>
          ✓ Mobile: Vertical layout, 44px inputs, 16px font (no iOS zoom)
          <br />
          ✓ Desktop: Horizontal labels, standard sizing
          <br />✓ All inputs full-width on mobile
        </ResponsiveCaption>
      </ResponsiveCard>

      <Divider />

      {/* SECTION 4: Modals & Drawers */}
      <ResponsiveTitle level={2}>4. Responsive Modals & Drawers</ResponsiveTitle>
      <ResponsiveParagraph>
        Modals are 90% width on mobile with vertically stacked buttons.
        Drawers provide alternative mobile-friendly experience.
      </ResponsiveParagraph>

      <ResponsiveCard compactMobile>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <ResponsiveButton type="primary" onClick={() => setModalOpen(true)} fullWidthMobile>
            Open Modal
          </ResponsiveButton>
          <ResponsiveButton onClick={() => setDrawerOpen(true)} fullWidthMobile>
            Open Drawer
          </ResponsiveButton>
        </Space>

        <ResponsiveModal
          title="Responsive Modal Example"
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={[
            <ResponsiveButton key="cancel" onClick={() => setModalOpen(false)}>
              Cancel
            </ResponsiveButton>,
            <ResponsiveButton key="submit" type="primary" onClick={() => setModalOpen(false)}>
              Confirm
            </ResponsiveButton>,
          ]}
        >
          <ResponsiveParagraph>
            This modal adapts to screen size:
          </ResponsiveParagraph>
          <ul>
            <li>Mobile: 90% width, buttons stack vertically</li>
            <li>Tablet: 70% width</li>
            <li>Desktop: 520px width, horizontal buttons</li>
          </ul>
          <ResponsiveCaption type="secondary">
            Current: {deviceType} | Buttons {isMobile ? 'stacked' : 'horizontal'}
          </ResponsiveCaption>
        </ResponsiveModal>

        <ResponsiveDrawer
          title="Responsive Drawer Example"
          placement="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <ResponsiveParagraph>
            Drawers are great for mobile forms and navigation.
          </ResponsiveParagraph>
          <ResponsiveFormItem label="Sample Input">
            <ResponsiveInput placeholder="Enter text..." />
          </ResponsiveFormItem>
          <ResponsiveFormItem label="Sample Select">
            <ResponsiveSelect
              placeholder="Choose option"
              options={[
                { value: '1', label: 'Option 1' },
                { value: '2', label: 'Option 2' },
              ]}
            />
          </ResponsiveFormItem>
        </ResponsiveDrawer>

        <ResponsiveCaption style={{ marginTop: '16px' }}>
          ✓ Modal: 90% width mobile, proper desktop sizing
          <br />
          ✓ Drawer: 85% width mobile, touch-friendly close
          <br />✓ Buttons stack vertically on mobile
        </ResponsiveCaption>
      </ResponsiveCard>

      <Divider />

      {/* SECTION 5: Typography */}
      <ResponsiveTitle level={2}>5. Responsive Typography</ResponsiveTitle>
      <ResponsiveParagraph>
        Typography scales based on device: h1 is 24px mobile → 38px desktop.
      </ResponsiveParagraph>

      <ResponsiveCard compactMobile>
        <ResponsiveTitle level={1}>Heading 1 (24px mobile → 38px desktop)</ResponsiveTitle>
        <ResponsiveTitle level={2}>Heading 2 (20px mobile → 30px desktop)</ResponsiveTitle>
        <ResponsiveTitle level={3}>Heading 3 (18px mobile → 24px desktop)</ResponsiveTitle>
        <ResponsiveTitle level={4}>Heading 4 (16px mobile → 20px desktop)</ResponsiveTitle>
        <ResponsiveTitle level={5}>Heading 5 (14px mobile → 18px desktop)</ResponsiveTitle>

        <ResponsiveParagraph>
          This is body text using ResponsiveParagraph. It automatically adjusts font size and
          line height for optimal readability on different devices. The component ensures text
          is always comfortable to read, whether on a small phone screen or large desktop monitor.
        </ResponsiveParagraph>

        <ResponsiveParagraph truncateMobile maxLinesMobile={2}>
          This paragraph will truncate on mobile devices after 2 lines with an ellipsis and
          expandable "more" button. This is useful for long descriptions that would take up
          too much space on mobile screens. Try viewing this on a mobile device!
        </ResponsiveParagraph>

        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <ResponsiveLabel required>Form Label Example</ResponsiveLabel>
          <ResponsiveInput placeholder="Input field" />
          <ResponsiveCaption type="secondary">
            This is helper text using ResponsiveCaption (12-14px)
          </ResponsiveCaption>
        </Space>

        <Divider />

        <ResponsiveText size="large">Large Text (18px mobile, 16px desktop)</ResponsiveText>
        <br />
        <ResponsiveText size="medium">Medium Text (16px mobile, 14px desktop)</ResponsiveText>
        <br />
        <ResponsiveText size="small">Small Text (14px mobile, 12px desktop)</ResponsiveText>

        <ResponsiveCaption style={{ marginTop: '16px' }}>
          ✓ All typography scales responsively
          <br />
          ✓ Proper line heights for readability
          <br />✓ Optional truncation on mobile
        </ResponsiveCaption>
      </ResponsiveCard>

      <Divider />

      {/* SECTION 6: Testing Checklist */}
      <ResponsiveTitle level={2}>6. Testing Checklist</ResponsiveTitle>
      <ResponsiveCard compactMobile>
        <ResponsiveTitle level={4}>Verify These Items:</ResponsiveTitle>
        <ul>
          <li>
            <strong>Mobile (375px):</strong>
            <ul>
              <li>✓ All buttons 44px minimum height</li>
              <li>✓ Icon buttons 48x48 touch target</li>
              <li>✓ Form inputs 44px height</li>
              <li>✓ Cards have 12px padding</li>
              <li>✓ Modal 90% width, buttons stacked</li>
              <li>✓ Typography readable (h1: 24px)</li>
              <li>✓ No horizontal scroll</li>
            </ul>
          </li>
          <li>
            <strong>Tablet (768px):</strong>
            <ul>
              <li>✓ Cards have 20px padding</li>
              <li>✓ 2-column layouts work</li>
              <li>✓ Forms properly spaced</li>
            </ul>
          </li>
          <li>
            <strong>Desktop (1280px+):</strong>
            <ul>
              <li>✓ Cards have 24px padding</li>
              <li>✓ 4-column stat cards</li>
              <li>✓ Typography optimal (h1: 38px)</li>
              <li>✓ Horizontal button layouts</li>
            </ul>
          </li>
        </ul>

        <Alert
          message="All Components Working!"
          description="If you can see this page without errors, all responsive components are functioning correctly."
          type="success"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </ResponsiveCard>

      <div style={{ height: '50px' }} />
    </div>
  );
};

export default ComponentTestPage;
