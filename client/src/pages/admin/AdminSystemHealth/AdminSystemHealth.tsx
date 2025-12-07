/**
 * AdminSystemHealth - System Health Monitoring Page
 * 
 * Displays real-time system health metrics for:
 * - CPU usage and cores
 * - Memory usage
 * - Storage/Disk usage
 * - MongoDB database metrics
 * 
 * Features:
 * - Auto-refresh every 30 seconds
 * - Manual refresh button
 * - Status indicators (OK, Warning, Critical, Error)
 * - Last updated timestamp
 */

import { memo, useMemo } from 'react';
import { Card, Row, Col, Statistic, Badge, Space, Typography, Alert, Spin } from 'antd';
import {
  ApiOutlined,
  DatabaseOutlined,
  HddOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { AdminLayout } from '../../../components/layouts';
import { PageHeader } from '../../../components/PageHeader';
import { useHealth, useHealthStatusBadge } from '../../../hooks/useHealth';
import type { HealthStatus } from '../../../services/health.Service';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

/**
 * Get status icon component
 */
const getStatusIcon = (status: HealthStatus) => {
  switch (status) {
    case 'ok':
      return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />;
    case 'warning':
      return <WarningOutlined style={{ color: '#faad14', fontSize: 24 }} />;
    case 'critical':
    case 'error':
      return <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 24 }} />;
    case 'unknown':
    default:
      return <QuestionCircleOutlined style={{ color: '#d9d9d9', fontSize: 24 }} />;
  }
};

/**
 * Get status badge color
 */
const getStatusColor = (status: HealthStatus): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'ok':
      return 'success';
    case 'warning':
      return 'warning';
    case 'critical':
    case 'error':
      return 'error';
    case 'unknown':
    default:
      return 'default';
  }
};

/**
 * Health Metric Card Component
 */
interface HealthCardProps {
  title: string;
  icon: React.ReactNode;
  status: HealthStatus;
  children: React.ReactNode;
}

const HealthCard = memo(({ title, icon, status, children }: HealthCardProps) => {
  const statusBadge = useHealthStatusBadge(status);
  
  return (
    <Card
      hoverable
      style={{ height: '100%' }}
      styles={{
        body: { padding: 24 },
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header with icon and title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            {icon}
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
          </Space>
          {getStatusIcon(status)}
        </div>

        {/* Status Badge */}
        <Badge
          status={getStatusColor(status)}
          text={statusBadge.text.toUpperCase()}
        />

        {/* Metrics */}
        {children}
      </Space>
    </Card>
  );
});

HealthCard.displayName = 'HealthCard';

/**
 * Main Component
 */
export const AdminSystemHealth = memo(() => {
  // Fetch health metrics via WebSocket (10s server broadcast)
  const { health, isLoading } = useHealth(); // 🔥 NO POLLING - WebSocket broadcasts system:health every 10s
  
  // Error state - derive from health data
  const error = !health && !isLoading ? new Error('Failed to load health data') : null;

  // Format last updated time
  const lastUpdatedText = useMemo(() => {
    if (!health?.timestamp) return 'Never';
    return dayjs(health.timestamp).fromNow();
  }, [health?.timestamp]);

  // Format bytes helper function
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Handle manual refresh - just trigger re-render by updating timestamp
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Page Header */}
        <PageHeader
          title="System Health Monitor"
          icon={<ThunderboltOutlined />}
          description={`Real-time system health monitoring • Last updated: ${lastUpdatedText}`}
          actions={[
            {
              key: 'refresh',
              label: 'Refresh',
              icon: <ReloadOutlined spin={isLoading} />,
              onClick: handleRefresh,
              loading: isLoading,
            },
          ]}
        />

        {/* Error Alert */}
        {error && (
          <Alert
            message="Failed to Load Health Metrics"
            description={error.message}
            type="error"
            showIcon
            closable
          />
        )}

        {/* Loading State */}
        {isLoading && !health && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Loading health metrics...</Text>
            </div>
          </div>
        )}

        {/* Health Cards Grid */}
        {health && (
          <>
            {/* Overall Status Banner */}
            {health.overallStatus !== 'ok' && (
              <Alert
                message={
                  health.overallStatus === 'critical' || health.overallStatus === 'error'
                    ? 'Critical System Issues Detected'
                    : 'System Performance Warning'
                }
                description="One or more system components require attention. Check the metrics below for details."
                type={
                  health.overallStatus === 'critical' || health.overallStatus === 'error'
                    ? 'error'
                    : 'warning'
                }
                showIcon
              />
            )}

            <Row gutter={[24, 24]}>
              {/* CPU Card */}
              <Col xs={24} sm={24} md={12} lg={12} xl={6}>
                <HealthCard
                  title="CPU"
                  icon={<ApiOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                  status={health.cpu.status}
                >
                  <Statistic
                    title="Usage"
                    value={health.cpu.usagePercent}
                    suffix="%"
                    valueStyle={{ color: health.cpu.usagePercent > 80 ? '#cf1322' : undefined }}
                  />
                  <Text type="secondary">Cores: {health.cpu.cores}</Text>
                </HealthCard>
              </Col>

              {/* Memory Card */}
              <Col xs={24} sm={24} md={12} lg={12} xl={6}>
                <HealthCard
                  title="Memory"
                  icon={<ThunderboltOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
                  status={health.memory.status}
                >
                  <Statistic
                    title="Usage"
                    value={health.memory.usagePercent}
                    suffix="%"
                    valueStyle={{ color: health.memory.usagePercent > 85 ? '#cf1322' : undefined }}
                  />
                  <Text type="secondary">
                    {health.memory.usedGB.toFixed(2)} GB / {health.memory.totalGB.toFixed(2)} GB
                  </Text>
                </HealthCard>
              </Col>

              {/* Storage Card */}
              <Col xs={24} sm={24} md={12} lg={12} xl={6}>
                <HealthCard
                  title="Storage"
                  icon={<HddOutlined style={{ fontSize: 24, color: '#faad14' }} />}
                  status={health.storage.status}
                >
                  <Statistic
                    title="Usage"
                    value={health.storage.usagePercent}
                    suffix="%"
                    valueStyle={{ color: health.storage.usagePercent > 80 ? '#cf1322' : undefined }}
                  />
                  <Text type="secondary">
                    {health.storage.usedGB.toFixed(2)} GB / {health.storage.totalGB.toFixed(2)} GB
                  </Text>
                </HealthCard>
              </Col>

              {/* Database Card */}
              <Col xs={24} sm={24} md={12} lg={12} xl={6}>
                <HealthCard
                  title="Database"
                  icon={<DatabaseOutlined style={{ fontSize: 24, color: '#722ed1' }} />}
                  status={health.database.status}
                >
                  <Statistic
                    title="Connection"
                    value={
                      health.database.connectionStatus === 'connected'
                        ? 'Connected'
                        : 'Disconnected'
                    }
                    valueStyle={{
                      fontSize: 16,
                      color: health.database.connectionStatus === 'connected' ? '#52c41a' : '#cf1322',
                    }}
                  />
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text type="secondary">
                      Storage: {formatBytes(health.database.storageSize)}
                    </Text>
                    <Text type="secondary">
                      Response: {health.database.responseTime}ms
                    </Text>
                  </Space>
                </HealthCard>
              </Col>
            </Row>
          </>
        )}
      </Space>
    </AdminLayout>
  );
});

AdminSystemHealth.displayName = 'AdminSystemHealth';
