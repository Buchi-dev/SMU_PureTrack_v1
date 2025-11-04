import { Card, Row, Col, Space, Typography, Tag } from 'antd';

const { Text } = Typography;

const WATER_QUALITY_THRESHOLDS = {
  pH: {
    min: 6.5,
    max: 8.5,
    sources: 'EPPA, DOH (PNSDW), WHO',
    description: 'Recommended range for drinking water',
  },
  TDS: {
    excellent: 300,
    good: 600,
    acceptable: 1000,
    maxEPPA: 500,
    maxDOH_AA: 500,
    sources: 'EPPA, DOH (PNSDW), WHO',
  },
  Turbidity: {
    max: 5,
    unit: 'NTU',
    sources: 'EPPA, DOH (PNSDW), WHO',
    description: 'Maximum recommended for drinking water',
  },
};

interface WaterQualityAssessmentProps {
  metrics: {
    avgPH: number;
    avgTDS: number;
    avgTurbidity: number;
    totalReadings: number;
  } | undefined;
  waterQualityData: {
    period?: {
      start: string;
      end: string;
    };
  } | null;
}

export const WaterQualityAssessment = ({ metrics, waterQualityData }: WaterQualityAssessmentProps) => {
  if (!metrics) {
    return null;
  }

  return (
    <Card title="Water Quality Assessment & Standards">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Current Water Quality Status</Text>
            <div>
              <Text>pH Level: </Text>
              <Tag color={(metrics.avgPH >= WATER_QUALITY_THRESHOLDS.pH.min && 
                            metrics.avgPH <= WATER_QUALITY_THRESHOLDS.pH.max) ? 'success' : 'error'}>
                {(metrics.avgPH >= WATER_QUALITY_THRESHOLDS.pH.min && 
                  metrics.avgPH <= WATER_QUALITY_THRESHOLDS.pH.max) ? 'Within Standard' : 'Out of Range'}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                ({WATER_QUALITY_THRESHOLDS.pH.min}-{WATER_QUALITY_THRESHOLDS.pH.max})
              </Text>
            </div>
            <div>
              <Text>TDS Level: </Text>
              <Tag color={
                metrics.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.excellent ? 'success' : 
                metrics.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.good ? 'processing' :
                metrics.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.acceptable ? 'warning' : 'error'
              }>
                {metrics.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.excellent ? 'Excellent' : 
                 metrics.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.good ? 'Good' :
                 metrics.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.acceptable ? 'Acceptable' : 'Unsafe'}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                (EPPA/DOH: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxEPPA} ppm)
              </Text>
            </div>
            <div>
              <Text>Turbidity: </Text>
              <Tag color={metrics.avgTurbidity <= WATER_QUALITY_THRESHOLDS.Turbidity.max ? 'success' : 'error'}>
                {metrics.avgTurbidity <= WATER_QUALITY_THRESHOLDS.Turbidity.max ? 'Clear' : 'High Turbidity'}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                (Max: {WATER_QUALITY_THRESHOLDS.Turbidity.max} NTU)
              </Text>
            </div>
          </Space>
        </Col>
        <Col xs={24} md={12}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Regulatory Standards Applied</Text>
            <div>
              <Text strong style={{ fontSize: '12px' }}>pH: </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {WATER_QUALITY_THRESHOLDS.pH.min} - {WATER_QUALITY_THRESHOLDS.pH.max}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {WATER_QUALITY_THRESHOLDS.pH.sources} - {WATER_QUALITY_THRESHOLDS.pH.description}
              </Text>
            </div>
            <div>
              <Text strong style={{ fontSize: '12px' }}>TDS: </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Excellent: &lt;{WATER_QUALITY_THRESHOLDS.TDS.excellent}, 
                Good: {WATER_QUALITY_THRESHOLDS.TDS.excellent}-{WATER_QUALITY_THRESHOLDS.TDS.good}, 
                Max: {WATER_QUALITY_THRESHOLDS.TDS.acceptable} ppm
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {WATER_QUALITY_THRESHOLDS.TDS.sources} - EPPA/DOH Class AA: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxDOH_AA} ppm
              </Text>
            </div>
            <div>
              <Text strong style={{ fontSize: '12px' }}>Turbidity: </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Maximum: {WATER_QUALITY_THRESHOLDS.Turbidity.max} {WATER_QUALITY_THRESHOLDS.Turbidity.unit}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {WATER_QUALITY_THRESHOLDS.Turbidity.sources} - {WATER_QUALITY_THRESHOLDS.Turbidity.description}
              </Text>
            </div>
          </Space>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
        <Col xs={24} md={12}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Data Collection Period</Text>
            <div>
              <Text>Start: </Text>
              <Text type="secondary">
                {waterQualityData?.period?.start 
                  ? new Date(waterQualityData.period.start).toLocaleDateString() 
                  : 'N/A'}
              </Text>
            </div>
            <div>
              <Text>End: </Text>
              <Text type="secondary">
                {waterQualityData?.period?.end 
                  ? new Date(waterQualityData.period.end).toLocaleDateString() 
                  : 'N/A'}
              </Text>
            </div>
            <div>
              <Text>Total Readings: </Text>
              <Text strong>{metrics.totalReadings || 0}</Text>
            </div>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};
