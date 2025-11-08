import { Card, Statistic, Row, Col, Tag } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { MqttBridgeStatus } from '../../../../services/mqtt.service';
import { HEALTH_COLORS } from '../config';

interface MetricsGridProps {
  status: MqttBridgeStatus | null;
  loading: boolean;
}

const cardStyle = { 
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};

export const MetricsGrid = memo(({ status, loading }: MetricsGridProps) => {
  const metrics = status?.metrics;

  const failedColor = useMemo(() => 
    metrics?.failed ? HEALTH_COLORS.ERROR : HEALTH_COLORS.UNKNOWN,
    [metrics?.failed]
  );

  const circuitBreakerTag = useMemo(() => ({
    color: metrics?.circuitBreakerOpen ? 'error' : 'success',
    text: metrics?.circuitBreakerOpen ? 'Alert' : 'Normal'
  }), [metrics?.circuitBreakerOpen]);

  const circuitBreakerValue = useMemo(() => 
    metrics?.circuitBreakerOpen ? 'OPEN' : 'CLOSED',
    [metrics?.circuitBreakerOpen]
  );

  const circuitBreakerColor = useMemo(() => 
    metrics?.circuitBreakerOpen ? HEALTH_COLORS.ERROR : HEALTH_COLORS.EXCELLENT,
    [metrics?.circuitBreakerOpen]
  );

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card 
          loading={loading}
          bordered={false}
          style={cardStyle}
        >
          <Statistic
            title="Messages Received"
            value={metrics?.received || 0}
            prefix={<ArrowDownOutlined style={{ color: HEALTH_COLORS.EXCELLENT }} />}
            valueStyle={{ color: HEALTH_COLORS.EXCELLENT, fontWeight: 600 }}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card 
          loading={loading}
          bordered={false}
          style={cardStyle}
        >
          <Statistic
            title="Messages Published"
            value={metrics?.published || 0}
            prefix={<ArrowUpOutlined style={{ color: HEALTH_COLORS.INFO }} />}
            valueStyle={{ color: HEALTH_COLORS.INFO, fontWeight: 600 }}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card 
          loading={loading}
          bordered={false}
          style={cardStyle}
        >
          <Statistic
            title="Failed Messages"
            value={metrics?.failed || 0}
            prefix={<WarningOutlined style={{ color: failedColor }} />}
            valueStyle={{ 
              color: failedColor,
              fontWeight: 600 
            }}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card 
          loading={loading}
          bordered={false}
          style={cardStyle}
        >
          <Statistic
            title="Buffer Flushes"
            value={metrics?.flushes || 0}
            prefix={<SyncOutlined style={{ color: HEALTH_COLORS.WARNING }} />}
            valueStyle={{ color: HEALTH_COLORS.WARNING, fontWeight: 600 }}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={12}>
        <Card 
          loading={loading}
          bordered={false}
          style={{
            ...cardStyle,
            height: '100%'
          }}
        >
          <Statistic
            title="Circuit Breaker Status"
            value={circuitBreakerValue}
            valueStyle={{ 
              color: circuitBreakerColor,
              fontWeight: 600 
            }}
            suffix={
              <Tag color={circuitBreakerTag.color}>
                {circuitBreakerTag.text}
              </Tag>
            }
          />
        </Card>
      </Col>
    </Row>
  );
});
