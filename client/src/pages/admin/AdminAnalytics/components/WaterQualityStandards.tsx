import { Alert, Row, Col, Typography } from 'antd';

const { Text } = Typography;

const WATER_QUALITY_THRESHOLDS = {
  pH: {
    min: 6.5,
    max: 8.5,
    sources: 'EPPA, DOH (PNSDW), WHO',
  },
  TDS: {
    maxEPPA: 500,
    excellent: 300,
    good: 600,
    acceptable: 1000,
  },
  Turbidity: {
    max: 5,
    unit: 'NTU',
    sources: 'EPPA, DOH (PNSDW), WHO',
  },
};

export const WaterQualityStandards = () => {
  return (
    <Alert
      message="Water Quality Standards Applied"
      description={
        <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
          <Col xs={24} sm={8}>
            <Text strong>pH Level</Text>
            <br />
            <Text type="secondary">
              Range: {WATER_QUALITY_THRESHOLDS.pH.min} - {WATER_QUALITY_THRESHOLDS.pH.max}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {WATER_QUALITY_THRESHOLDS.pH.sources}
            </Text>
          </Col>
          <Col xs={24} sm={8}>
            <Text strong>TDS (Total Dissolved Solids)</Text>
            <br />
            <Text type="secondary">
              EPPA/DOH: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxEPPA} ppm, WHO Max: {WATER_QUALITY_THRESHOLDS.TDS.acceptable} ppm
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Excellent: &lt;{WATER_QUALITY_THRESHOLDS.TDS.excellent}, Good: {WATER_QUALITY_THRESHOLDS.TDS.excellent}-{WATER_QUALITY_THRESHOLDS.TDS.good} ppm
            </Text>
          </Col>
          <Col xs={24} sm={8}>
            <Text strong>Turbidity</Text>
            <br />
            <Text type="secondary">
              Maximum: {WATER_QUALITY_THRESHOLDS.Turbidity.max} {WATER_QUALITY_THRESHOLDS.Turbidity.unit}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {WATER_QUALITY_THRESHOLDS.Turbidity.sources}
            </Text>
          </Col>
        </Row>
      }
      type="info"
      showIcon
      style={{ marginBottom: 0 }}
    />
  );
};
