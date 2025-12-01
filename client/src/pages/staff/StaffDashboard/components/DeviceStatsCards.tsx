/**
 * DeviceStatsCards Component
 * Displays device statistics in metric cards
 */

import { Row, Col, Card, Statistic, Space, Tooltip, Progress, Badge, Typography, Divider } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeToken } from '../../../../theme';

const { Text } = Typography;

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  warnings: number;
}

interface DeviceStatsCardsProps {
  stats: DeviceStats;
}

/**
 * Grid of cards showing device statistics
 * @param props - Component props
 */
export default function DeviceStatsCards({ stats }: DeviceStatsCardsProps) {
  const navigate = useNavigate();
  const token = useThemeToken();

  const uptimePercent = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0;

  return (
    <Row gutter={[16, 16]}>
      {/* Total Devices */}
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <Card
          hoverable
          onClick={() => navigate('/staff/devices')}
          style={{
            cursor: 'pointer',
            borderLeft: `4px solid ${token.colorInfo}`,
            transition: 'all 0.3s ease',
          }}
        >
          <Statistic
            title={
              <Space>
                <ApiOutlined style={{ color: token.colorInfo }} />
                <span>Total Devices</span>
              </Space>
            }
            value={stats.total}
            valueStyle={{ color: token.colorInfo, fontSize: '32px', fontWeight: 600 }}
            suffix={
              <Tooltip title="View all devices">
                <ArrowRightOutlined style={{ fontSize: '16px', marginLeft: '8px' }} />
              </Tooltip>
            }
          />
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Active monitoring devices
          </Text>
        </Card>
      </Col>

      {/* Online Devices */}
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <Card
          hoverable
          style={{
            borderLeft: `4px solid ${token.colorSuccess}`,
            transition: 'all 0.3s ease',
          }}
        >
          <Statistic
            title={
              <Space>
                <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                <span>Online Devices</span>
              </Space>
            }
            value={stats.online}
            valueStyle={{ color: token.colorSuccess, fontSize: '32px', fontWeight: 600 }}
            suffix={<Text type="secondary">/ {stats.total}</Text>}
          />
          <Progress
            percent={uptimePercent}
            strokeColor={{
              '0%': token.colorSuccess,
              '100%': token.colorSuccessActive,
            }}
            showInfo={false}
            style={{ marginTop: 8 }}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {uptimePercent}% uptime
          </Text>
        </Card>
      </Col>

      {/* Warnings */}
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <Card
          hoverable
          onClick={() => navigate('/staff/readings')}
          style={{
            cursor: 'pointer',
            borderLeft: `4px solid ${token.colorWarning}`,
            transition: 'all 0.3s ease',
          }}
        >
          <Badge count={stats.warnings} offset={[10, 0]}>
            <Statistic
              title={
                <Space>
                  <WarningOutlined style={{ color: token.colorWarning }} />
                  <span>Warnings</span>
                </Space>
              }
              value={stats.warnings}
              valueStyle={{ color: token.colorWarning, fontSize: '32px', fontWeight: 600 }}
              suffix={
                <Tooltip title="View warnings">
                  <ArrowRightOutlined style={{ fontSize: '16px', marginLeft: '8px' }} />
                </Tooltip>
              }
            />
          </Badge>
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Parameters out of range
          </Text>
        </Card>
      </Col>

      {/* Offline Devices */}
      <Col xs={24} sm={12} md={8} lg={6} xl={6}>
        <Card
          hoverable
          style={{
            borderLeft: `4px solid ${token.colorTextSecondary}`,
            transition: 'all 0.3s ease',
          }}
        >
          <Statistic
            title={
              <Space>
                <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                <span>Offline Devices</span>
              </Space>
            }
            value={stats.offline}
            valueStyle={{ color: token.colorTextSecondary, fontSize: '32px', fontWeight: 600 }}
          />
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Require attention
          </Text>
        </Card>
      </Col>
    </Row>
  );
}
