import { Card, Row, Col, Space, Badge, Empty } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { SensorMetricCard } from './SensorMetricCard';
import type { SensorReading } from '../../../../schemas';

interface CurrentReadingsCardProps {
  latestReading: SensorReading | null;
  thresholds: {
    turbidity: { min: number; max: number; unit: string; label: string };
    tds: { min: number; max: number; unit: string; label: string };
    ph: { min: number; max: number; unit: string; label: string };
  };
}

export const CurrentReadingsCard = ({ latestReading, thresholds }: CurrentReadingsCardProps) => {
  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined />
          <span>Current Readings</span>
          <Badge status="processing" text="Live" />
        </Space>
      }
    >
      {latestReading ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={8}>
            <SensorMetricCard
              type="turbidity"
              value={latestReading.turbidity}
              threshold={thresholds.turbidity}
            />
          </Col>
          <Col xs={24} sm={24} md={8}>
            <SensorMetricCard
              type="tds"
              value={latestReading.tds}
              threshold={thresholds.tds}
            />
          </Col>
          <Col xs={24} sm={24} md={8}>
            <SensorMetricCard
              type="ph"
              value={latestReading.ph}
              threshold={thresholds.ph}
            />
          </Col>
        </Row>
      ) : (
        <Empty description="No sensor data available" />
      )}
    </Card>
  );
};
