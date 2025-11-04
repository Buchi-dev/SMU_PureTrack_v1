import { Row, Col, Card, Statistic, Typography } from 'antd';
import {
  RiseOutlined,
  LineChartOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';

const { Text } = Typography;

const WATER_QUALITY_THRESHOLDS = {
  pH: {
    min: 6.5,
    max: 8.5,
  },
  TDS: {
    excellent: 300,
    good: 600,
    acceptable: 1000,
    maxEPPA: 500,
  },
  Turbidity: {
    max: 5,
  },
};

interface WaterQualityMetricsProps {
  metrics: {
    avgPH: number;
    maxPH: number;
    minPH: number;
    avgTDS: number;
    maxTDS: number;
    minTDS: number;
    avgTurbidity: number;
    maxTurbidity: number;
    minTurbidity: number;
  } | undefined;
}

export const WaterQualityMetrics = ({ metrics }: WaterQualityMetricsProps) => {
  const token = useThemeToken();

  if (!metrics) {
    return null;
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Average pH Level"
            value={metrics.avgPH || 0}
            precision={2}
            prefix={<RiseOutlined />}
            valueStyle={{ 
              color: (metrics.avgPH >= WATER_QUALITY_THRESHOLDS.pH.min && 
                      metrics.avgPH <= WATER_QUALITY_THRESHOLDS.pH.max) 
                ? token.colorSuccess 
                : token.colorError 
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Min: {metrics.minPH.toFixed(2)}</Text>
            <Text type="secondary" style={{ float: 'right' }}>Max: {metrics.maxPH.toFixed(2)}</Text>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Standard: {WATER_QUALITY_THRESHOLDS.pH.min} - {WATER_QUALITY_THRESHOLDS.pH.max}
            </Text>
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Average TDS"
            value={metrics.avgTDS || 0}
            precision={1}
            suffix="ppm"
            prefix={<LineChartOutlined />}
            valueStyle={{ 
              color: (metrics.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.excellent) 
                ? token.colorSuccess 
                : (metrics.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.good)
                ? token.colorInfo
                : (metrics.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.acceptable)
                ? token.colorWarning
                : token.colorError
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Min: {metrics.minTDS.toFixed(1)}</Text>
            <Text type="secondary" style={{ float: 'right' }}>Max: {metrics.maxTDS.toFixed(1)}</Text>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Standard: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxEPPA} ppm (EPPA/DOH)
            </Text>
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Average Turbidity"
            value={metrics.avgTurbidity || 0}
            precision={2}
            suffix="NTU"
            prefix={<FallOutlined />}
            valueStyle={{ 
              color: (metrics.avgTurbidity <= WATER_QUALITY_THRESHOLDS.Turbidity.max) 
                ? token.colorSuccess 
                : token.colorError 
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Min: {metrics.minTurbidity.toFixed(2)}</Text>
            <Text type="secondary" style={{ float: 'right' }}>Max: {metrics.maxTurbidity.toFixed(2)}</Text>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Standard: ≤{WATER_QUALITY_THRESHOLDS.Turbidity.max} NTU (WHO/DOH)
            </Text>
          </div>
        </Card>
      </Col>
    </Row>
  );
};
