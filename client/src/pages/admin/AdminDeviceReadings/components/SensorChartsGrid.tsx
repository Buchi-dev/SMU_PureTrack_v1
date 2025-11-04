import { useMemo } from 'react';
import { Card, Row, Col } from 'antd';
import { Line } from '@ant-design/plots';
import type { SensorReading } from '../../../../schemas';

interface SensorChartsGridProps {
  sensorHistory: SensorReading[];
  thresholds: {
    turbidity: { min: number; max: number; unit: string; label: string };
    tds: { min: number; max: number; unit: string; label: string };
    ph: { min: number; max: number; unit: string; label: string };
  };
}

type SensorType = 'turbidity' | 'tds' | 'ph';

interface ChartDataPoint {
  timestamp: string;
  value: number;
  type: string;
}

export const SensorChartsGrid = ({ sensorHistory, thresholds }: SensorChartsGridProps) => {
  // Memoized chart data
  const chartData = useMemo(() => ({
    turbidity: sensorHistory.map(reading => ({
      timestamp: new Date(reading.timestamp).toLocaleTimeString(),
      value: reading.turbidity,
      type: thresholds.turbidity.label,
    })),
    tds: sensorHistory.map(reading => ({
      timestamp: new Date(reading.timestamp).toLocaleTimeString(),
      value: reading.tds,
      type: thresholds.tds.label,
    })),
    ph: sensorHistory.map(reading => ({
      timestamp: new Date(reading.timestamp).toLocaleTimeString(),
      value: reading.ph,
      type: thresholds.ph.label,
    })),
  }), [sensorHistory, thresholds]);

  const getChartConfig = (type: SensorType) => ({
    data: chartData[type],
    xField: 'timestamp',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    tooltip: {
      formatter: (datum: ChartDataPoint) => ({
        name: datum.type,
        value: `${datum.value} ${thresholds[type].unit}`,
      }),
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${v} ${thresholds[type].unit}`,
      },
    },
  });

  if (sensorHistory.length === 0) {
    return null;
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <Card title="Turbidity Trend" size="small">
          <Line {...getChartConfig('turbidity')} height={250} />
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card title="TDS Trend" size="small">
          <Line {...getChartConfig('tds')} height={250} />
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card title="pH Trend" size="small">
          <Line {...getChartConfig('ph')} height={250} />
        </Card>
      </Col>
    </Row>
  );
};
