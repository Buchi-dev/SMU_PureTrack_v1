import { Card, Row, Col, Progress, Typography, Space, Badge, Statistic } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  MailOutlined,
  ThunderboltOutlined,
  FireOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import type { SystemHealth } from '../../../../services/health.Service';
import { HEALTH_COLORS } from '../config/healthThresholds';

const { Text } = Typography;

interface SystemHealthCardProps {
  systemHealth: SystemHealth | null;
  loading: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'OK':
      return HEALTH_COLORS.EXCELLENT;
    case 'WARNING':
      return HEALTH_COLORS.WARNING;
    case 'NOT_CONFIGURED':
      return HEALTH_COLORS.CRITICAL;
    case 'FAILED':
    case 'ERROR':
      return HEALTH_COLORS.ERROR;
    default:
      return '#d9d9d9';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'OK':
      return <CheckCircleOutlined style={{ color: HEALTH_COLORS.EXCELLENT, fontSize: 20 }} />;
    case 'WARNING':
      return <WarningOutlined style={{ color: HEALTH_COLORS.WARNING, fontSize: 20 }} />;
    case 'NOT_CONFIGURED':
    case 'FAILED':
    case 'ERROR':
      return <CloseCircleOutlined style={{ color: HEALTH_COLORS.ERROR, fontSize: 20 }} />;
    default:
      return <WarningOutlined style={{ color: '#d9d9d9', fontSize: 20 }} />;
  }
};

export const SystemHealthCard = memo<SystemHealthCardProps>(({ systemHealth, loading }) => {
  if (!systemHealth) {
    return (
      <Card loading={loading} title="System Health" bordered={false}>
        <Text type="secondary">No health data available</Text>
      </Card>
    );
  }

  const { checks } = systemHealth;
  const memoryPercent = checks?.memory?.usage
    ? Math.round((checks.memory.usage.heapUsed / checks.memory.usage.heapTotal) * 100)
    : 0;

  return (
    <Card
      title={
        <Space>
          <CloudServerOutlined />
          <span>System Health Monitor</span>
          <Badge
            status={systemHealth.status === 'OK' ? 'success' : 'warning'}
            text={systemHealth.status}
          />
        </Space>
      }
      bordered={false}
      loading={loading}
    >
      <Row gutter={[16, 16]}>
        {/* Database Status */}
        <Col xs={24} sm={12} md={8}>
          <Card size="small" hoverable>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <DatabaseOutlined style={{ fontSize: 24, color: getStatusColor(checks?.database?.status || '') }} />
                <div>
                  <Text strong>Database</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {checks?.database?.name || 'N/A'}
                  </Text>
                </div>
              </Space>
              <Space>
                {getStatusIcon(checks?.database?.status || '')}
                <Text style={{ color: getStatusColor(checks?.database?.status || '') }}>
                  {checks?.database?.message || 'Unknown'}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Redis Status */}
        <Col xs={24} sm={12} md={8}>
          <Card size="small" hoverable>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <ThunderboltOutlined style={{ fontSize: 24, color: getStatusColor(checks?.redis?.status || '') }} />
                <div>
                  <Text strong>Redis Cache</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    In-memory store
                  </Text>
                </div>
              </Space>
              <Space>
                {getStatusIcon(checks?.redis?.status || '')}
                <Text style={{ color: getStatusColor(checks?.redis?.status || '') }}>
                  {checks?.redis?.message || 'Unknown'}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Firebase Auth Status */}
        <Col xs={24} sm={12} md={8}>
          <Card size="small" hoverable>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <FireOutlined style={{ fontSize: 24, color: getStatusColor(checks?.firebaseAuth?.status || '') }} />
                <div>
                  <Text strong>Firebase Auth</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Authentication
                  </Text>
                </div>
              </Space>
              <Space>
                {getStatusIcon(checks?.firebaseAuth?.status || '')}
                <Text style={{ color: getStatusColor(checks?.firebaseAuth?.status || '') }}>
                  {checks?.firebaseAuth?.message || 'Unknown'}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Email Queue Status */}
        <Col xs={24} sm={12} md={8}>
          <Card size="small" hoverable>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <MailOutlined style={{ fontSize: 24, color: getStatusColor(checks?.emailQueue?.status || '') }} />
                <div>
                  <Text strong>Email Queue</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {checks?.emailQueue?.stats
                      ? `${checks.emailQueue.stats.waiting} waiting`
                      : 'N/A'}
                  </Text>
                </div>
              </Space>
              <Space>
                {getStatusIcon(checks?.emailQueue?.status || '')}
                <Text style={{ color: getStatusColor(checks?.emailQueue?.status || '') }}>
                  {checks?.emailQueue?.message || 'Unknown'}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* API Key Status */}
        <Col xs={24} sm={12} md={8}>
          <Card size="small" hoverable>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <ApiOutlined style={{ fontSize: 24, color: getStatusColor(checks?.apiKey?.status || '') }} />
                <div>
                  <Text strong>Device API</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    IoT Authentication
                  </Text>
                </div>
              </Space>
              <Space>
                {getStatusIcon(checks?.apiKey?.status || '')}
                <Text style={{ color: getStatusColor(checks?.apiKey?.status || '') }}>
                  {checks?.apiKey?.message || 'Unknown'}
                </Text>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Memory Usage */}
        <Col xs={24} sm={12} md={8}>
          <Card size="small" hoverable>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <CloudServerOutlined style={{ fontSize: 24, color: getStatusColor(checks?.memory?.status || '') }} />
                <div>
                  <Text strong>Memory Usage</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {checks?.memory?.usage?.heapUsed || 0} / {checks?.memory?.usage?.heapTotal || 0} MB
                  </Text>
                </div>
              </Space>
              <Progress
                percent={memoryPercent}
                status={memoryPercent > 80 ? 'exception' : memoryPercent > 60 ? 'normal' : 'success'}
                strokeColor={memoryPercent > 80 ? HEALTH_COLORS.ERROR : memoryPercent > 60 ? HEALTH_COLORS.WARNING : HEALTH_COLORS.EXCELLENT}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* System Metrics Footer */}
      <Row gutter={16} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
        <Col xs={12} sm={6}>
          <Statistic
            title="Uptime"
            value={Math.floor((systemHealth.uptime || 0) / 60)}
            suffix="min"
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Response Time"
            value={systemHealth.responseTime || 'N/A'}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Environment"
            value={systemHealth.environment || 'N/A'}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="Version"
            value={systemHealth.version || 'N/A'}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
      </Row>
    </Card>
  );
});

SystemHealthCard.displayName = 'SystemHealthCard';
