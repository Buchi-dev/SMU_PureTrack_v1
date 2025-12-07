/**
 * Device Performance Component
 * 
 * Displays device-level performance metrics including:
 * - Uptime percentage
 * - Reading counts
 * - Water quality scores
 * - Alert counts
 */
import { Card, Table, Tag, Progress, Typography, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { memo } from 'react';
import { useThemeToken } from '../../../../theme';
import { useTableScroll } from '../../../../hooks';
import type { DevicePerformanceMetrics } from '../../../../schemas/analytics.schema';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface DevicePerformanceProps {
  devicePerformance: DevicePerformanceMetrics[];
  loading?: boolean;
}

export const DevicePerformance = memo<DevicePerformanceProps>(({ 
  devicePerformance,
  loading = false 
}) => {
  const token = useThemeToken();
  const tableScroll = useTableScroll({ offsetHeight: 400 });

  const getQualityScoreColor = (score: number): string => {
    if (score >= 90) return token.colorSuccess;
    if (score >= 75) return token.colorInfo;
    if (score >= 60) return token.colorWarning;
    return token.colorError;
  };

  const getQualityScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const columns: ColumnsType<DevicePerformanceMetrics> = [
    {
      title: 'Device',
      dataIndex: 'deviceName',
      key: 'deviceName',
      fixed: 'left',
      width: 150,
      sorter: (a, b) => a.deviceName.localeCompare(b.deviceName),
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          {record.location && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.location}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Uptime',
      dataIndex: 'uptimePercentage',
      key: 'uptimePercentage',
      width: 120,
      sorter: (a, b) => a.uptimePercentage - b.uptimePercentage,
      render: (uptime: number) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Text strong>{uptime.toFixed(1)}%</Text>
          <Progress 
            percent={parseFloat(uptime.toFixed(1))} 
            size="small"
            strokeColor={uptime >= 95 ? token.colorSuccess : uptime >= 80 ? token.colorWarning : token.colorError}
            showInfo={false}
          />
        </Space>
      ),
    },
    {
      title: 'Quality Score',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      width: 140,
      sorter: (a, b) => a.qualityScore - b.qualityScore,
      render: (score: number) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Tag color={getQualityScoreColor(score)}>
            {score}/100 - {getQualityScoreLabel(score)}
          </Tag>
          <Progress 
            percent={score} 
            size="small"
            strokeColor={getQualityScoreColor(score)}
            showInfo={false}
          />
        </Space>
      ),
    },
    {
      title: 'Avg pH',
      dataIndex: 'avgPh',
      key: 'avgPh',
      width: 100,
      sorter: (a, b) => a.avgPh - b.avgPh,
      render: (ph: number) => {
        const inRange = ph >= 6.5 && ph <= 8.5;
        return (
          <Space>
            <Text strong style={{ color: inRange ? token.colorSuccess : token.colorError }}>
              {ph.toFixed(2)}
            </Text>
            {inRange ? (
              <CheckCircleOutlined style={{ color: token.colorSuccess }} />
            ) : (
              <WarningOutlined style={{ color: token.colorError }} />
            )}
          </Space>
        );
      },
    },
    {
      title: 'Avg TDS',
      dataIndex: 'avgTds',
      key: 'avgTds',
      width: 100,
      sorter: (a, b) => a.avgTds - b.avgTds,
      render: (tds: number) => {
        const inRange = tds <= 500;
        return (
          <Space>
            <Text strong style={{ color: inRange ? token.colorSuccess : token.colorError }}>
              {tds.toFixed(0)}
            </Text>
            {inRange ? (
              <CheckCircleOutlined style={{ color: token.colorSuccess }} />
            ) : (
              <WarningOutlined style={{ color: token.colorError }} />
            )}
          </Space>
        );
      },
    },
    {
      title: 'Avg Turbidity',
      dataIndex: 'avgTurbidity',
      key: 'avgTurbidity',
      width: 120,
      sorter: (a, b) => a.avgTurbidity - b.avgTurbidity,
      render: (turbidity: number) => {
        const inRange = turbidity <= 5;
        return (
          <Space>
            <Text strong style={{ color: inRange ? token.colorSuccess : token.colorError }}>
              {turbidity.toFixed(2)}
            </Text>
            {inRange ? (
              <CheckCircleOutlined style={{ color: token.colorSuccess }} />
            ) : (
              <WarningOutlined style={{ color: token.colorError }} />
            )}
          </Space>
        );
      },
    },
    {
      title: 'Alerts',
      dataIndex: 'alertCount',
      key: 'alertCount',
      width: 100,
      sorter: (a, b) => a.alertCount - b.alertCount,
      render: (count: number) => (
        <Tag color={count === 0 ? 'success' : count <= 3 ? 'warning' : 'error'}>
          {count} alert{count !== 1 ? 's' : ''}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_: unknown, record: { qualityScore: number; uptimePercentage: number; alertCount: number }) => {
        const isHealthy = 
          record.qualityScore >= 75 && 
          record.uptimePercentage >= 90 && 
          record.alertCount <= 2;

        return isHealthy ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Healthy</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">Issues</Tag>
        );
      },
    },
  ];

  return (
    <Card 
      title={<Title level={4}>Device Performance Analytics</Title>}
      loading={loading}
    >
      <Table
        columns={columns}
        dataSource={devicePerformance}
        rowKey="deviceId"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} devices`,
        }}
        scroll={tableScroll}
      />
    </Card>
  );
});

DevicePerformance.displayName = 'DevicePerformance';
