import { Row, Col, Card, Typography, Space, Button, Badge } from 'antd';
import type { ReactNode } from 'react';
import { useThemeToken } from '../../theme';
import { ReloadOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  }[];
  badge?: number;
  loading?: boolean;
  onRefresh?: () => void;
}

export const PageHeader = ({
  title,
  subtitle,
  icon,
  actions = [],
  badge,
  loading = false,
  onRefresh,
}: PageHeaderProps) => {
  const token = useThemeToken();

  return (
    <Card
      style={{
        background: `linear-gradient(135deg, ${token.colorPrimary}15 0%, ${token.colorPrimary}05 100%)`,
        border: `1px solid ${token.colorPrimary}20`,
        marginBottom: '24px',
      }}
    >
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col flex="auto">
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {icon && <span style={{ fontSize: '24px' }}>{icon}</span>}
              <Title level={2} style={{ margin: 0 }}>
                {title}
                {badge !== undefined && badge > 0 && (
                  <Badge
                    count={badge}
                    style={{
                      backgroundColor: token.colorError,
                      marginLeft: '8px',
                    }}
                  />
                )}
              </Title>
            </div>
            {subtitle && (
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {subtitle}
              </Text>
            )}
          </Space>
        </Col>
        <Col>
          <Space>
            {onRefresh && (
              <Button
                icon={<ReloadOutlined spin={loading} />}
                onClick={onRefresh}
                loading={loading}
              >
                Refresh
              </Button>
            )}
            {actions.map((action, index) => (
              <Button
                key={index}
                type={action.type || 'default'}
                icon={action.icon}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default PageHeader;
