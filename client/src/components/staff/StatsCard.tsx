import { Card, Statistic, Progress, Typography, Space, Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { useThemeToken } from '../../theme';

const { Text } = Typography;

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  suffix?: string;
  prefix?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  color?: string;
  progress?: number;
  description?: string;
  tooltip?: string;
  onClick?: () => void;
  hoverable?: boolean;
  loading?: boolean;
  size?: 'large' | 'medium' | 'small';
}

export const StatsCard = ({
  title,
  value,
  icon,
  suffix,
  prefix,
  trend,
  trendValue,
  color,
  progress,
  description,
  tooltip,
  onClick,
  hoverable = true,
  loading = false,
  size = 'medium',
}: StatsCardProps) => {
  const token = useThemeToken();

  const cardStyle: React.CSSProperties = {
    cursor: onClick ? 'pointer' : 'default',
    borderLeft: `4px solid ${color || token.colorInfo}`,
    transition: 'all 0.3s ease',
    height: '100%',
  };

  const cardContent = (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        loading={loading}
        valueStyle={{
          color: color || token.colorInfo,
          fontSize: size === 'large' ? '32px' : size === 'small' ? '20px' : '28px',
          fontWeight: 600,
        }}
      />
      {icon && (
        <div style={{ marginBottom: '8px', fontSize: '18px', color: color || token.colorInfo }}>
          {icon}
        </div>
      )}
      {progress !== undefined && (
        <Progress percent={progress} size="small" strokeColor={color || token.colorInfo} />
      )}
      {description && (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {description}
        </Text>
      )}
      {trendValue !== undefined && trend && (
        <Text
          style={{
            color:
              trend === 'up'
                ? token.colorSuccess
                : trend === 'down'
                ? token.colorError
                : token.colorTextSecondary,
            fontSize: '12px',
          }}
        >
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}%
        </Text>
      )}
    </Space>
  );

  const card = (
    <Card hoverable={hoverable} style={cardStyle} onClick={onClick}>
      {tooltip ? <Tooltip title={tooltip}>{cardContent}</Tooltip> : cardContent}
    </Card>
  );

  return card;
};

export default StatsCard;
