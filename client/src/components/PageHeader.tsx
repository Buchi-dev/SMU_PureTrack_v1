/**
 * PageHeader Component
 * 
 * Provides consistent page header layout across all admin pages:
 * - Breadcrumbs navigation
 * - Page title with icon
 * - Description text
 * - Action buttons (optional)
 * 
 * Matches the design from AdminUserManagement page
 * 
 * @module components/PageHeader
 */

import React from 'react';
import { Breadcrumb, Card, Space, Typography, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import type { BreadcrumbItemType } from 'antd/es/breadcrumb/Breadcrumb';

const { Title, Text } = Typography;

interface PageHeaderAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  type?: 'default' | 'primary' | 'dashed' | 'link' | 'text';
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  title?: string;
}

interface PageHeaderProps {
  /** Page title text */
  title: string;
  /** Icon to display before title */
  icon: React.ReactNode;
  /** Description text below title */
  description: string;
  /** Breadcrumb items (Home is automatically prepended) */
  breadcrumbItems?: Array<{
    title: string | React.ReactNode;
    href?: string;
    icon?: React.ReactNode;
  }>;
  /** Action buttons to display on the right */
  actions?: PageHeaderAction[];
  /** Additional content to render below header */
  children?: React.ReactNode;
}

/**
 * Consistent page header component for admin pages
 * 
 * @example
 * ```tsx
 * <PageHeader
 *   title="User Management"
 *   icon={<UserOutlined />}
 *   description="Manage user accounts, roles, and permissions"
 *   breadcrumbItems={[
 *     { title: 'User Management', icon: <UserOutlined /> }
 *   ]}
 *   actions={[
 *     { key: 'refresh', label: 'Refresh', icon: <ReloadOutlined />, onClick: handleRefresh },
 *     { key: 'add', label: 'Add User', icon: <PlusOutlined />, onClick: handleAdd, type: 'primary' }
 *   ]}
 * />
 * ```
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  icon,
  description,
  breadcrumbItems = [],
  actions = [],
  children,
}) => {
  // Build breadcrumb items with Home as first item
  const breadcrumbs: BreadcrumbItemType[] = [
    {
      href: '/',
      title: (
        <>
          <HomeOutlined />
          <span>Home</span>
        </>
      ),
    },
    ...breadcrumbItems.map((item) => ({
      href: item.href,
      title: item.icon ? (
        <>
          {item.icon}
          <span>{item.title}</span>
        </>
      ) : (
        item.title
      ),
    })),
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />

      {/* Page Header Card */}
      <Card variant="borderless">
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space
            style={{
              width: '100%',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            {/* Title & Description */}
            <div>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                {icon}
                <span>{title}</span>
              </Title>
              <Text type="secondary">{description}</Text>
            </div>

            {/* Action Buttons */}
            {actions.length > 0 && (
              <Space size="middle">
                {actions.map((action) => (
                  <Button
                    key={action.key}
                    type={action.type || 'default'}
                    icon={action.icon}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    loading={action.loading}
                    danger={action.danger}
                    title={action.title}
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
            )}
          </Space>
        </Space>
      </Card>

      {/* Additional Content */}
      {children}
    </Space>
  );
};
