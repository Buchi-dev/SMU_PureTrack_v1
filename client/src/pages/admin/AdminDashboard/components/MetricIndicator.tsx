import { Card, Space, Typography, Progress, Tooltip } from 'antd';
import { memo } from 'react';
import { OVERALL_HEALTH_THRESHOLDS, HEALTH_COLORS } from '../config';

const { Text } = Typography;

interface MetricIndicatorProps {
  title: string;
  percent: number;
  icon: React.ReactNode;
  tooltip?: string;
  loading?: boolean;
  inverse?: boolean; // For metrics where higher is worse (like RAM usage)
  subtitle?: string; // Additional info to display below the percentage
}

export const MetricIndicator = memo<MetricIndicatorProps>(({ 
  title, 
  percent, 
  icon, 
  tooltip,
  loading = false,
  inverse = false,
  subtitle
}) => {
  const getHealthColor = (value: number) => {
    // For inverse metrics (like RAM usage), invert the color logic
    const effectiveValue = inverse ? (100 - value) : value;
    
    if (effectiveValue >= OVERALL_HEALTH_THRESHOLDS.EXCELLENT_MIN) return HEALTH_COLORS.EXCELLENT;
    if (effectiveValue >= OVERALL_HEALTH_THRESHOLDS.GOOD_MIN) return HEALTH_COLORS.GOOD;
    if (effectiveValue >= OVERALL_HEALTH_THRESHOLDS.FAIR_MIN) return HEALTH_COLORS.CRITICAL;
    return HEALTH_COLORS.ERROR;
  };

  const content = (
    <Card 
      size="small"
      loading={loading}
      style={{ 
        backgroundColor: '#fafafa',
        borderLeft: `4px solid ${getHealthColor(percent)}`,
        minHeight: '105px',
        height: '100%',
        display: 'flex',
        alignItems: 'center'
      }}
      bodyStyle={{ 
        width: '100%',
        padding: '12px 16px'
      }}
    >
      <Space 
        style={{ 
          width: '100%', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Space align="center">
          <div style={{ 
            fontSize: '24px', 
            color: getHealthColor(percent),
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            {icon}
          </div>
          <div>
            <Text type="secondary" style={{ 
              fontSize: '12px', 
              display: 'block',
              lineHeight: '1.2',
              marginBottom: '4px'
            }}>
              {title}
            </Text>
            <Text strong style={{ 
              fontSize: '20px',
              lineHeight: '1.2',
              display: 'block'
            }}>
              {percent}%
            </Text>
            {subtitle && (
              <Text type="secondary" style={{ 
                fontSize: '11px', 
                display: 'block',
                lineHeight: '1.3',
                marginTop: '4px',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {subtitle}
              </Text>
            )}
          </div>
        </Space>
        <Progress 
          type="circle" 
          percent={percent} 
          strokeColor={getHealthColor(percent)}
          width={48}
          strokeWidth={6}
          format={() => ''}
        />
      </Space>
    </Card>
  );

  return tooltip ? (
    <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{tooltip}</div>}>
      {content}
    </Tooltip>
  ) : content;
});

MetricIndicator.displayName = 'MetricIndicator';

MetricIndicator.displayName = 'MetricIndicator';
