import { Card, Space, Button, Tooltip, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useThemeToken } from '../../theme';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DataCardProps {
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
  extra?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  bordered?: boolean;
  size?: 'large' | 'medium' | 'small';
  onClick?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}

export const DataCard = ({
  title,
  icon,
  children,
  extra,
  footer,
  hoverable = true,
  bordered = true,
  size = 'medium',
  onClick,
  actionLabel,
  onAction,
  loading = false,
}: DataCardProps) => {
  const token = useThemeToken();

  const cardStyle: React.CSSProperties = {
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
  };

  const paddingMap = {
    large: '24px',
    medium: '16px',
    small: '12px',
  };

  return (
    <Card
      hoverable={hoverable}
      bordered={bordered}
      style={cardStyle}
      onClick={onClick}
      loading={loading}
      title={
        <Space>
          {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
          <Text strong>{title}</Text>
        </Space>
      }
      extra={
        extra || (actionLabel && onAction ? (
          <Tooltip title={actionLabel}>
            <Button
              type="text"
              size="small"
              icon={<ArrowRightOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
            />
          </Tooltip>
        ) : null)
      }
      styles={{
        body: { padding: paddingMap[size] },
      }}
    >
      {children}
      {footer && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {footer}
        </div>
      )}
    </Card>
  );
};

export default DataCard;
