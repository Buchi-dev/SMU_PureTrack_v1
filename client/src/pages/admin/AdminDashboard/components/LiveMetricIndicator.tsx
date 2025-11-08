import { Card, Space, Typography, Badge } from 'antd';
import { memo, useState, useEffect, useRef } from 'react';

const { Text } = Typography;

interface LiveMetricIndicatorProps {
  title: string;
  currentValue: number; // Current rate (e.g., msg/s)
  totalValue: number; // Total accumulated value
  icon: React.ReactNode;
  color: string;
  tooltip?: string;
  loading?: boolean;
  unit?: string;
  subtitle?: string;
  dataHistory?: number[]; // Array of historical values for mini graph
}

export const LiveMetricIndicator = memo<LiveMetricIndicatorProps>(({ 
  title, 
  currentValue,
  totalValue,
  icon, 
  color,
  tooltip,
  loading = false,
  unit = 'msg/s',
  subtitle,
  dataHistory = []
}) => {
  const [isActive, setIsActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detect if metric is active
  useEffect(() => {
    setIsActive(currentValue > 0);
  }, [currentValue]);

  // Draw mini sparkline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dataHistory.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const maxValue = Math.max(...dataHistory, 1);
    const pointSpacing = width / Math.max(dataHistory.length - 1, 1);

    // Draw filled area
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}10`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    dataHistory.forEach((value, index) => {
      const x = index * pointSpacing;
      const y = height - (value / maxValue) * height;
      ctx.lineTo(x, y);
    });
    
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    dataHistory.forEach((value, index) => {
      const x = index * pointSpacing;
      const y = height - (value / maxValue) * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

  }, [dataHistory, color]);

  const content = (
    <Card 
      size="small"
      loading={loading}
      style={{ 
        backgroundColor: '#fafafa',
        borderLeft: `4px solid ${color}`,
        minHeight: '155px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        boxShadow: isActive ? `0 0 12px ${color}40` : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
      }}
      bodyStyle={{ 
        width: '100%',
        padding: '16px'
      }}
    >
      <Space 
        direction="vertical"
        size="small"
        style={{ width: '100%' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space align="center" size={8}>
            <div style={{ 
              fontSize: '20px', 
              color,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center'
            }}>
              {icon}
            </div>
            <Text type="secondary" style={{ 
              fontSize: '12px', 
              lineHeight: '1.2',
            }}>
              {title}
            </Text>
          </Space>
          {isActive && (
            <Badge status="processing" />
          )}
        </div>

        {/* Current Rate */}
        <div>
          <Space align="baseline" size={4}>
            <Text strong style={{ 
              fontSize: '32px',
              lineHeight: '1',
              color
            }}>
              {currentValue}
            </Text>
            <Text type="secondary" style={{ 
              fontSize: '12px',
            }}>
              {unit}
            </Text>
          </Space>
        </div>

        {/* Mini Graph */}
        {dataHistory.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <canvas
              ref={canvasRef}
              width={200}
              height={30}
              style={{
                width: '100%',
                height: '30px',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Total Count */}
        <div style={{ marginTop: '4px' }}>
          <Text type="secondary" style={{ 
            fontSize: '11px',
            display: 'block',
            lineHeight: '1.2'
          }}>
            {subtitle || `Total: ${totalValue.toLocaleString()}`}
          </Text>
        </div>
      </Space>
    </Card>
  );

  return tooltip ? (
    <div title={tooltip}>
      {content}
    </div>
  ) : content;
});

LiveMetricIndicator.displayName = 'LiveMetricIndicator';
