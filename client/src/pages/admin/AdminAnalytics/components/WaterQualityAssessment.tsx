/**
 * WaterQualityAssessment Component
 * 
 * Displays water quality assessment and regulatory standards compliance
 */
import { Card, Row, Col, Space, Typography, Tag } from 'antd';
import { memo } from 'react';
import type { WaterQualityMetrics } from '../hooks';
import type { Device } from '../../../../schemas';
import type { WaterQualityAlert } from '../../../../schemas';
import { ALERT_STATUS } from '../../../../constants';

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
  metrics: WaterQualityMetrics;
  devices: Device[];
  alerts: WaterQualityAlert[];
}

export const WaterQualityAssessment = memo<WaterQualityAssessmentProps>(({ 
  metrics, 
  devices,
  alerts 
}) => {
  if (!metrics || devices.length === 0) {
    return (
      <Card title="Water Quality Assessment & Standards">
        <Text type="secondary">No water quality data available for assessment</Text>
      </Card>
    );
  }

  const activeAlerts = alerts.filter(a => a.status === ALERT_STATUS.UNACKNOWLEDGED);

  return (
    <Card title="Water Quality Assessment & Standards">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Current Water Quality Status</Text>
            <div>
              <Text>pH Level: </Text>
              <Tag color={(metrics.averagePh >= WATER_QUALITY_THRESHOLDS.pH.min && 
                            metrics.averagePh <= WATER_QUALITY_THRESHOLDS.pH.max) ? 'success' : 'error'}>
                {(metrics.averagePh >= WATER_QUALITY_THRESHOLDS.pH.min && 
                  metrics.averagePh <= WATER_QUALITY_THRESHOLDS.pH.max) ? 'Within Standard' : 'Out of Range'}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                ({WATER_QUALITY_THRESHOLDS.pH.min}-{WATER_QUALITY_THRESHOLDS.pH.max})
              </Text>
            </div>
            <div>
              <Text>TDS Level: </Text>
              <Tag color={
                metrics.averageTds <= WATER_QUALITY_THRESHOLDS.TDS.excellent ? 'success' : 
                metrics.averageTds <= WATER_QUALITY_THRESHOLDS.TDS.good ? 'processing' :
                metrics.averageTds <= WATER_QUALITY_THRESHOLDS.TDS.acceptable ? 'warning' : 'error'
              }>
                {metrics.averageTds <= WATER_QUALITY_THRESHOLDS.TDS.excellent ? 'Excellent' : 
                 metrics.averageTds <= WATER_QUALITY_THRESHOLDS.TDS.good ? 'Good' :
                 metrics.averageTds <= WATER_QUALITY_THRESHOLDS.TDS.acceptable ? 'Acceptable' : 'Unsafe'}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                (EPPA/DOH: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxEPPA} ppm)
              </Text>
            </div>
            <div>
              <Text>Turbidity: </Text>
              <Tag color={metrics.averageTurbidity <= WATER_QUALITY_THRESHOLDS.Turbidity.max ? 'success' : 'error'}>
                {metrics.averageTurbidity <= WATER_QUALITY_THRESHOLDS.Turbidity.max ? 'Clear' : 'High Turbidity'}
              </Tag>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                (Max: {WATER_QUALITY_THRESHOLDS.Turbidity.max} NTU)
              </Text>
            </div>
            <div style={{ marginTop: 16 }}>
              <Text strong>Active Monitoring</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Monitoring {devices.length} device{devices.length !== 1 ? 's' : ''} with {metrics.totalReadings} total readings
                </Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''} requiring attention
                </Text>
              </div>
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
    </Card>
  );
});

WaterQualityAssessment.displayName = 'WaterQualityAssessment';
