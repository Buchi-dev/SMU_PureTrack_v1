import { Card, Statistic, Row, Col, Tag } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  SyncOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { MqttBridgeStatus } from '../hooks';

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
    metrics?.failed ? '#ff4d4f' : '#8c8c8c',
    [metrics?.failed]
  );

  const dlqColor = useMemo(() => 
    metrics?.messagesInDLQ ? '#ff4d4f' : '#52c41a',
    [metrics?.messagesInDLQ]
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
    metrics?.circuitBreakerOpen ? '#ff4d4f' : '#52c41a',
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
            prefix={<ArrowDownOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a', fontWeight: 600 }}
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
            prefix={<ArrowUpOutlined style={{ color: '#1890ff' }} />}
            valueStyle={{ color: '#1890ff', fontWeight: 600 }}
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
            prefix={<SyncOutlined style={{ color: '#722ed1' }} />}
            valueStyle={{ color: '#722ed1', fontWeight: 600 }}
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
            title="Commands Processed"
            value={metrics?.commands || 0}
            prefix={<ThunderboltOutlined style={{ color: '#fa8c16' }} />}
            valueStyle={{ color: '#fa8c16', fontWeight: 600 }}
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
            title="Dead Letter Queue"
            value={metrics?.messagesInDLQ || 0}
            prefix={<InboxOutlined style={{ color: dlqColor }} />}
            valueStyle={{ 
              color: dlqColor,
              fontWeight: 600 
            }}
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
