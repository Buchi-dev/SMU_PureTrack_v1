import { Row, Col, Statistic, Progress, Space, Typography } from 'antd';
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
import { ResponsiveCard } from '../../../../components';
import { useResponsive } from '../../../../hooks';

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
  const { isMobile } = useResponsive();
  
  const deviceOnlinePercent = deviceStats.total > 0
    ? Math.round((deviceStats.online / deviceStats.total) * 100)
    : 0;

  const alertSeverityPercent = alertStats.total > 0
    ? Math.round((alertStats.critical / alertStats.total) * 100)
    : 0;

  return (
    <Row gutter={[16, 16]}>
      {/* Devices Card */}
      <Col xs={24} sm={24} md={12} lg={12} xl={12}>
        <ResponsiveCard
          bordered={false}
          compactMobile
          style={{
            background: `linear-gradient(135deg, ${HEALTH_COLORS.EXCELLENT}15 0%, ${HEALTH_COLORS.EXCELLENT}05 100%)`,
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 'middle' : 'large'}>
            <Space align="start">
              <RobotOutlined style={{ fontSize: isMobile ? 28 : 32, color: HEALTH_COLORS.EXCELLENT }} />
              <div>
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, display: 'block' }}>
                  IoT Devices
                </Text>
                <div>
                  <Text strong style={{ fontSize: isMobile ? 20 : 24 }}>
                    {deviceStats.total}
                  </Text>
                  <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14, marginLeft: 8 }}>
                    total devices
                  </Text>
                </div>
              </div>
            </Space>

            <Row gutter={isMobile ? 8 : 16}>
              <Col span={12}>
                <Statistic
                  title={
                    <Space size="small">
                      <CheckCircleOutlined style={{ color: HEALTH_COLORS.EXCELLENT, fontSize: isMobile ? 14 : 16 }} />
                      <span style={{ fontSize: isMobile ? 12 : 14 }}>Online</span>
                    </Space>
                  }
                  value={deviceStats.online}
                  suffix={`/ ${deviceStats.total}`}
                  valueStyle={{ color: HEALTH_COLORS.EXCELLENT, fontSize: isMobile ? 16 : 20 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={
                    <Space size="small">
                      <CloseCircleOutlined style={{ color: HEALTH_COLORS.ERROR, fontSize: isMobile ? 14 : 16 }} />
                      <span style={{ fontSize: isMobile ? 12 : 14 }}>Offline</span>
                    </Space>
                  }
                  value={deviceStats.offline}
                  suffix={`/ ${deviceStats.total}`}
                  valueStyle={{ color: HEALTH_COLORS.ERROR, fontSize: isMobile ? 16 : 20 }}
                />
              </Col>
            </Row>

            <div>
              <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Availability</Text>
                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>{deviceOnlinePercent}%</Text>
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
                size={isMobile ? 'small' : 'default'}
              />
            </div>
          </Space>
        </ResponsiveCard>
      </Col>

      {/* Alerts Card */}
      <Col xs={24} sm={24} md={12} lg={12} xl={12}>
        <ResponsiveCard
          bordered={false}
          compactMobile
          style={{
            background: `linear-gradient(135deg, ${HEALTH_COLORS.WARNING}15 0%, ${HEALTH_COLORS.WARNING}05 100%)`,
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 'middle' : 'large'}>
            <Space align="start">
              <BellOutlined style={{ fontSize: isMobile ? 28 : 32, color: HEALTH_COLORS.WARNING }} />
              <div>
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, display: 'block' }}>
                  Water Quality Alerts
                </Text>
                <div>
                  <Text strong style={{ fontSize: isMobile ? 20 : 24 }}>
                    {alertStats.active}
                  </Text>
                  <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14, marginLeft: 8 }}>
                    active alerts
                  </Text>
                </div>
              </div>
            </Space>

            <Row gutter={isMobile ? 6 : 8}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <WarningOutlined style={{ fontSize: isMobile ? 16 : 20, color: HEALTH_COLORS.ERROR }} />
                  <div>
                    <Text strong style={{ fontSize: isMobile ? 16 : 18, color: HEALTH_COLORS.ERROR }}>
                      {alertStats.critical}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                    Critical
                  </Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <WarningOutlined style={{ fontSize: isMobile ? 16 : 20, color: HEALTH_COLORS.WARNING }} />
                  <div>
                    <Text strong style={{ fontSize: isMobile ? 16 : 18, color: HEALTH_COLORS.WARNING }}>
                      {alertStats.warning}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                    Warning
                  </Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <InfoCircleOutlined style={{ fontSize: isMobile ? 16 : 20, color: HEALTH_COLORS.GOOD }} />
                  <div>
                    <Text strong style={{ fontSize: isMobile ? 16 : 18, color: HEALTH_COLORS.GOOD }}>
                      {alertStats.advisory}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                    Advisory
                  </Text>
                </div>
              </Col>
            </Row>

            <div>
              <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>Critical Severity</Text>
                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>{alertSeverityPercent}%</Text>
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
                size={isMobile ? 'small' : 'default'}
              />
            </div>
          </Space>
        </ResponsiveCard>
      </Col>
    </Row>
  );
});

QuickStatsCard.displayName = 'QuickStatsCard';
