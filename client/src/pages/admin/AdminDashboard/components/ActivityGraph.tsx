import { Card, Space, Typography, Badge } from 'antd';
import { memo, useEffect, useRef } from 'react';

const { Text } = Typography;

interface ActivityGraphProps {
  dataPoints: number[];
  maxValue: number;
  color: string;
  height?: number;
}

/**
 * Mini sparkline graph for visualizing real-time activity
 */
export const ActivityGraph = memo<ActivityGraphProps>(({ 
  dataPoints, 
  maxValue, 
  color,
  height = 60 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const canvasHeight = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);

    if (dataPoints.length === 0) {
      // Draw placeholder
      ctx.strokeStyle = '#d9d9d9';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, canvasHeight / 2);
      ctx.lineTo(width, canvasHeight / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, `${color}40`);
    gradient.addColorStop(1, `${color}05`);

    // Calculate points
    const pointSpacing = width / Math.max(dataPoints.length - 1, 1);
    const normalize = (value: number) => {
      const safeMax = maxValue > 0 ? maxValue : 1;
      return canvasHeight - (value / safeMax) * (canvasHeight - 10);
    };

    // Draw filled area
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    dataPoints.forEach((value, index) => {
      const x = index * pointSpacing;
      const y = normalize(value);
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(width, canvasHeight);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    dataPoints.forEach((value, index) => {
      const x = index * pointSpacing;
      const y = normalize(value);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw dots on recent points
    if (dataPoints.length > 0) {
      const lastIndex = dataPoints.length - 1;
      const x = lastIndex * pointSpacing;
      const y = normalize(dataPoints[lastIndex]);
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

  }, [dataPoints, maxValue, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'block',
      }}
    />
  );
});

ActivityGraph.displayName = 'ActivityGraph';

interface ThroughputGraphCardProps {
  title: string;
  dataPoints: number[];
  currentValue: number;
  total: number;
  color: string;
  icon: React.ReactNode;
  active: boolean;
}

/**
 * Card component showing throughput with mini graph
 */
export const ThroughputGraphCard = memo<ThroughputGraphCardProps>(({
  title,
  dataPoints,
  currentValue,
  total,
  color,
  icon,
  active
}) => {
  const maxValue = Math.max(...dataPoints, 10); // Minimum scale of 10

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: '8px',
        borderLeft: `4px solid ${color}`,
        backgroundColor: '#fafafa',
        boxShadow: active ? `0 0 12px ${color}40` : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size={8}>
            <div style={{ fontSize: '18px', color }}>{icon}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {title}
            </Text>
          </Space>
          {active && (
            <Badge status="processing" />
          )}
        </div>

        {/* Current Value */}
        <div>
          <Space align="baseline" size={4}>
            <Text strong style={{ fontSize: '32px', color, lineHeight: 1 }}>
              {currentValue}
            </Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              msg/s
            </Text>
          </Space>
        </div>

        {/* Mini Graph */}
        <div style={{ marginTop: '8px' }}>
          <ActivityGraph
            dataPoints={dataPoints}
            maxValue={maxValue}
            color={color}
            height={50}
          />
        </div>

        {/* Total Counter */}
        <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
          Total: {total.toLocaleString()}
        </Text>
      </Space>
    </Card>
  );
});

ThroughputGraphCard.displayName = 'ThroughputGraphCard';
