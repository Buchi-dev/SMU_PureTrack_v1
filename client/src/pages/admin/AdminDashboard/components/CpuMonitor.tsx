import { Card, Progress, Typography, Space, Row, Col, Statistic } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { MqttBridgeHealth, MqttBridgeStatus } from '../../../../services/mqtt.service';
import { HEALTH_COLORS } from '../config';

const { Text } = Typography;

interface CpuMonitorProps {
  health: MqttBridgeHealth | null;
  status: MqttBridgeStatus | null;
  loading: boolean;
}

const getCpuHealth = (cpuPercent: number) => {
  if (cpuPercent >= 85) {
    return {
      status: 'exception' as const,
      color: HEALTH_COLORS.ERROR,
      statusText: 'Critical',
    };
  } else if (cpuPercent >= 70) {
    return {
      status: 'normal' as const,
      color: HEALTH_COLORS.WARNING,
      statusText: 'High',
    };
  } else if (cpuPercent >= 50) {
    return {
      status: 'normal' as const,
      color: HEALTH_COLORS.INFO,
      statusText: 'Moderate',
    };
  } else {
    return {
      status: 'success' as const,
      color: HEALTH_COLORS.EXCELLENT,
      statusText: 'Good',
    };
  }
};

export const CpuMonitor = memo(({ health, loading }: CpuMonitorProps) => {
  const cpu = health?.checks?.cpu;
  const cpuCurrent = cpu?.current || 0;
  const cpuAverage = cpu?.average || 0;
  const cpuPeak = cpu?.peak || 0;

  const currentHealth = useMemo(() => getCpuHealth(cpuCurrent), [cpuCurrent]);
  const averageHealth = useMemo(() => getCpuHealth(cpuAverage), [cpuAverage]);

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <ThunderboltOutlined style={{ fontSize: '20px' }} />
          <span>CPU Usage</span>
        </Space>
      }
      bordered={false}
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        height: '100%'
      }}
    >
      <Row gutter={24}>
        {/* Current CPU */}
        <Col xs={24} lg={12}>
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '14px' }}>Current CPU</Text>
              <Text strong style={{ color: currentHealth.color, fontSize: '16px' }}>
                {cpuCurrent.toFixed(1)}%
              </Text>
            </div>
            <Progress 
              percent={Math.min(cpuCurrent, 100)} 
              status={currentHealth.status}
              strokeWidth={16}
              showInfo={false}
              strokeColor={currentHealth.color}
            />
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Status: <Text strong style={{ color: currentHealth.color }}>{currentHealth.statusText}</Text>
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                {cpuCurrent < 85 ? 'Normal operation' : 'High load detected'}
              </Text>
            </div>
          </div>
        </Col>

        {/* Average CPU */}
        <Col xs={24} lg={12}>
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: '14px' }}>Average CPU (1 min)</Text>
              <Text strong style={{ color: averageHealth.color, fontSize: '16px' }}>
                {cpuAverage.toFixed(1)}%
              </Text>
            </div>
            <Progress 
              percent={Math.min(cpuAverage, 100)} 
              status={averageHealth.status}
              strokeWidth={16}
              showInfo={false}
              strokeColor={averageHealth.color}
            />
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Peak: <Text strong style={{ color: HEALTH_COLORS.WARNING }}>{cpuPeak.toFixed(1)}%</Text>
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                {cpuAverage < 70 ? 'Stable' : 'Elevated'}
              </Text>
            </div>
          </div>
        </Col>
      </Row>

      {/* CPU Statistics Row */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={8}>
          <Statistic
            title="Current"
            value={cpuCurrent.toFixed(1)}
            suffix="%"
            valueStyle={{ fontSize: '18px', color: currentHealth.color }}
          />
        </Col>
        <Col xs={8}>
          <Statistic
            title="Average"
            value={cpuAverage.toFixed(1)}
            suffix="%"
            valueStyle={{ fontSize: '18px', color: averageHealth.color }}
          />
        </Col>
        <Col xs={8}>
          <Statistic
            title="Peak"
            value={cpuPeak.toFixed(1)}
            suffix="%"
            valueStyle={{ fontSize: '18px', color: HEALTH_COLORS.WARNING }}
          />
        </Col>
      </Row>

      {/* CPU Thresholds Info */}
      <div style={{ marginTop: '20px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
          <strong>Thresholds:</strong>
        </Text>
        <Space direction="vertical" size={2}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            • <Text style={{ color: HEALTH_COLORS.EXCELLENT }}>Good</Text>: 0-50%
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            • <Text style={{ color: HEALTH_COLORS.INFO }}>Moderate</Text>: 50-70%
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            • <Text style={{ color: HEALTH_COLORS.WARNING }}>High</Text>: 70-85% (Degraded)
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            • <Text style={{ color: HEALTH_COLORS.ERROR }}>Critical</Text>: 85-100% (Unhealthy)
          </Text>
        </Space>
      </div>
    </Card>
  );
});

CpuMonitor.displayName = 'CpuMonitor';
