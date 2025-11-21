import { Card, Row, Col, Statistic, Progress, Space, Typography } from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BellOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import { HEALTH_COLORS } from '../config/healthThresholds';

const { Text } = Typography;

interface QuickStatsProps {
  deviceStats: {
    total: number;
    online: number;
    offline: number;
    withReadings: number;
  };
  alertStats: {
    total: number;
    active: number;
    critical: number;
    warning: number;
    advisory: number;
  };
}

export const QuickStatsCard = memo<QuickStatsProps>(({ deviceStats, alertStats }) => {
  const deviceOnlinePercent = deviceStats.total > 0
    ? Math.round((deviceStats.online / deviceStats.total) * 100)
    : 0;

  const alertSeverityPercent = alertStats.total > 0
    ? Math.round((alertStats.critical / alertStats.total) * 100)
    : 0;

  return (
    <Row gutter={[16, 16]}>
      {/* Devices Card */}
      <Col xs={24} sm={12} lg={12}>
        <Card
          bordered={false}
          style={{
            background: `linear-gradient(135deg, ${HEALTH_COLORS.EXCELLENT}15 0%, ${HEALTH_COLORS.EXCELLENT}05 100%)`,
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Space>
              <RobotOutlined style={{ fontSize: 32, color: HEALTH_COLORS.EXCELLENT }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  IoT Devices
                </Text>
                <div>
                  <Text strong style={{ fontSize: 24 }}>
                    {deviceStats.total}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>
                    total devices
                  </Text>
                </div>
              </div>
            </Space>

            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title={
                    <Space>
                      <CheckCircleOutlined style={{ color: HEALTH_COLORS.EXCELLENT }} />
                      <span>Online</span>
                    </Space>
                  }
                  value={deviceStats.online}
                  suffix={`/ ${deviceStats.total}`}
                  valueStyle={{ color: HEALTH_COLORS.EXCELLENT, fontSize: 20 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={
                    <Space>
                      <CloseCircleOutlined style={{ color: HEALTH_COLORS.ERROR }} />
                      <span>Offline</span>
                    </Space>
                  }
                  value={deviceStats.offline}
                  suffix={`/ ${deviceStats.total}`}
                  valueStyle={{ color: HEALTH_COLORS.ERROR, fontSize: 20 }}
                />
              </Col>
            </Row>

            <div>
              <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Availability</Text>
                <Text strong>{deviceOnlinePercent}%</Text>
              </Space>
              <Progress
                percent={deviceOnlinePercent}
                strokeColor={
                  deviceOnlinePercent >= 80
                    ? HEALTH_COLORS.EXCELLENT
                    : deviceOnlinePercent >= 50
                    ? HEALTH_COLORS.WARNING
                    : HEALTH_COLORS.ERROR
                }
                status={deviceOnlinePercent >= 80 ? 'success' : 'normal'}
              />
            </div>
          </Space>
        </Card>
      </Col>

      {/* Alerts Card */}
      <Col xs={24} sm={12} lg={12}>
        <Card
          bordered={false}
          style={{
            background: `linear-gradient(135deg, ${HEALTH_COLORS.WARNING}15 0%, ${HEALTH_COLORS.WARNING}05 100%)`,
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Space>
              <BellOutlined style={{ fontSize: 32, color: HEALTH_COLORS.WARNING }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Water Quality Alerts
                </Text>
                <div>
                  <Text strong style={{ fontSize: 24 }}>
                    {alertStats.active}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>
                    active alerts
                  </Text>
                </div>
              </div>
            </Space>

            <Row gutter={8}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <WarningOutlined style={{ fontSize: 20, color: HEALTH_COLORS.ERROR }} />
                  <div>
                    <Text strong style={{ fontSize: 18, color: HEALTH_COLORS.ERROR }}>
                      {alertStats.critical}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Critical
                  </Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <WarningOutlined style={{ fontSize: 20, color: HEALTH_COLORS.WARNING }} />
                  <div>
                    <Text strong style={{ fontSize: 18, color: HEALTH_COLORS.WARNING }}>
                      {alertStats.warning}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Warning
                  </Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <InfoCircleOutlined style={{ fontSize: 20, color: HEALTH_COLORS.GOOD }} />
                  <div>
                    <Text strong style={{ fontSize: 18, color: HEALTH_COLORS.GOOD }}>
                      {alertStats.advisory}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Advisory
                  </Text>
                </div>
              </Col>
            </Row>

            <div>
              <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Critical Severity</Text>
                <Text strong>{alertSeverityPercent}%</Text>
              </Space>
              <Progress
                percent={alertSeverityPercent}
                strokeColor={
                  alertSeverityPercent > 50
                    ? HEALTH_COLORS.ERROR
                    : alertSeverityPercent > 20
                    ? HEALTH_COLORS.WARNING
                    : HEALTH_COLORS.EXCELLENT
                }
                status={alertSeverityPercent > 50 ? 'exception' : 'normal'}
              />
            </div>
          </Space>
        </Card>
      </Col>
    </Row>
  );
});

QuickStatsCard.displayName = 'QuickStatsCard';
