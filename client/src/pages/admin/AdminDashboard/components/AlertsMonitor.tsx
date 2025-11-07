import { Card, Table, Tag, Space, Typography, Statistic, Row, Col, Empty, Badge, Timeline } from 'antd';
import { 
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { WaterQualityAlert } from '../../../../schemas';

const { Text, Title } = Typography;

interface AlertsMonitorProps {
  alerts: WaterQualityAlert[];
  loading: boolean;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'Critical':
      return <CloseCircleOutlined />;
    case 'Warning':
      return <WarningOutlined />;
    case 'Advisory':
      return <InfoCircleOutlined />;
    default:
      return <InfoCircleOutlined />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'Critical':
      return 'error';
    case 'Warning':
      return 'warning';
    case 'Advisory':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'error';
    case 'Acknowledged':
      return 'warning';
    case 'Resolved':
      return 'success';
    default:
      return 'default';
  }
};

export const AlertsMonitor = memo<AlertsMonitorProps>(({ alerts, loading }) => {
  const columns: ColumnsType<WaterQualityAlert> = useMemo(() => [
    {
      title: 'Severity',
      key: 'severity',
      render: (_, record) => (
        <Tag 
          icon={getSeverityIcon(record.severity)}
          color={getSeverityColor(record.severity)}
        >
          {record.severity}
        </Tag>
      ),
      width: 120,
      filters: [
        { text: 'Critical', value: 'Critical' },
        { text: 'Warning', value: 'Warning' },
        { text: 'Advisory', value: 'Advisory' },
      ],
      onFilter: (value, record) => record.severity === value,
      defaultFilteredValue: ['Critical', 'Warning'], // Show critical and warning by default
    },
    {
      title: 'Device',
      key: 'device',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.deviceName || record.deviceId}</Text>
          {record.deviceBuilding && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.deviceBuilding}{record.deviceFloor ? `, ${record.deviceFloor}` : ''}
            </Text>
          )}
        </Space>
      ),
      width: 200,
    },
    {
      title: 'Parameter',
      key: 'parameter',
      render: (_, record) => {
        const parameterLabels: Record<string, string> = {
          tds: 'TDS',
          ph: 'pH',
          turbidity: 'Turbidity',
        };
        return (
          <Space direction="vertical" size={0}>
            <Text>{parameterLabels[record.parameter] || record.parameter}</Text>
            <Text type="danger" strong>{record.currentValue.toFixed(2)}</Text>
          </Space>
        );
      },
      width: 120,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      width: 250,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)}>
          {record.status}
        </Tag>
      ),
      width: 120,
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Acknowledged', value: 'Acknowledged' },
        { text: 'Resolved', value: 'Resolved' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Created',
      key: 'createdAt',
      render: (_, record) => {
        const date = record.createdAt?.toDate?.() || new Date(record.createdAt);
        const now = Date.now();
        const diff = now - date.getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 60) {
          return <Text type={minutes < 5 ? 'danger' : undefined}>{minutes}m ago</Text>;
        }
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
          return <Text>{hours}h ago</Text>;
        }
        return <Text type="secondary">{date.toLocaleDateString()}</Text>;
      },
      width: 120,
      sorter: (a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      },
      defaultSortOrder: 'ascend',
    },
  ], []);

  // Calculate statistics
  const stats = useMemo(() => {
    const active = alerts.filter(a => a.status === 'Active');
    return {
      total: alerts.length,
      active: active.length,
      critical: active.filter(a => a.severity === 'Critical').length,
      warning: active.filter(a => a.severity === 'Warning').length,
      acknowledged: alerts.filter(a => a.status === 'Acknowledged').length,
      resolved: alerts.filter(a => a.status === 'Resolved').length,
    };
  }, [alerts]);

  // Recent critical alerts for timeline
  const recentCriticalAlerts = useMemo(() => {
    return alerts
      .filter(a => a.severity === 'Critical' && a.status === 'Active')
      .slice(0, 5);
  }, [alerts]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Summary Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Total Alerts"
              value={stats.total}
              prefix={<BellOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Active"
              value={stats.active}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: stats.active > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Critical"
              value={stats.critical}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: stats.critical > 0 ? '#cf1322' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Warning"
              value={stats.warning}
              prefix={<WarningOutlined />}
              valueStyle={{ color: stats.warning > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Acknowledged"
              value={stats.acknowledged}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Resolved"
              value={stats.resolved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Critical Alerts Timeline */}
      {recentCriticalAlerts.length > 0 && (
        <Card 
          title={
            <Space>
              <Badge status="error" />
              <Title level={4} style={{ margin: 0 }}>Recent Critical Alerts</Title>
            </Space>
          }
        >
          <Timeline
            items={recentCriticalAlerts.map(alert => ({
              color: 'red',
              children: (
                <Space direction="vertical" size={0}>
                  <Text strong>{alert.deviceName || alert.deviceId}</Text>
                  <Text>{alert.message}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {alert.createdAt?.toDate?.()?.toLocaleString() || new Date(alert.createdAt).toLocaleString()}
                  </Text>
                </Space>
              ),
            }))}
          />
        </Card>
      )}

      {/* Alerts Table */}
      <Card title={<Title level={4} style={{ margin: 0 }}>All Alerts</Title>}>
        <Table
          columns={columns}
          dataSource={alerts}
          rowKey={(record) => record.alertId}
          loading={loading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} alerts`,
          }}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No alerts found"
              />
            ),
          }}
        />
      </Card>
    </Space>
  );
});

AlertsMonitor.displayName = 'AlertsMonitor';
