import { Card, Table, Tag, Space, Typography, Statistic, Row, Col, Empty } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  DatabaseOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { RealtimeDeviceData } from '../hooks/useRealtimeDevices';

const { Text, Title } = Typography;

interface DeviceMonitorProps {
  devices: RealtimeDeviceData[];
  loading: boolean;
}

export const DeviceMonitor = memo<DeviceMonitorProps>(({ devices, loading }) => {
  const columns: ColumnsType<RealtimeDeviceData> = useMemo(() => [
    {
      title: 'Device',
      key: 'device',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.device.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.device.deviceId}</Text>
        </Space>
      ),
      width: 200,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag 
          icon={record.isOnline ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={record.isOnline ? 'success' : 'error'}
        >
          {record.isOnline ? 'Online' : 'Offline'}
        </Tag>
      ),
      width: 100,
      filters: [
        { text: 'Online', value: true },
        { text: 'Offline', value: false },
      ],
      onFilter: (value, record) => record.isOnline === value,
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => {
        const location = record.device.metadata?.location;
        if (!location?.building || !location?.floor) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Space direction="vertical" size={0}>
            <Text>{location.building}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{location.floor}</Text>
          </Space>
        );
      },
      width: 150,
    },
    {
      title: 'TDS (ppm)',
      key: 'tds',
      render: (_, record) => {
        if (!record.latestReading) return <Text type="secondary">-</Text>;
        const value = record.latestReading.tds;
        const color = value > 500 ? 'red' : value > 300 ? 'orange' : 'green';
        return <Text style={{ color }}>{value.toFixed(0)}</Text>;
      },
      width: 100,
      sorter: (a, b) => (a.latestReading?.tds || 0) - (b.latestReading?.tds || 0),
    },
    {
      title: 'pH',
      key: 'ph',
      render: (_, record) => {
        if (!record.latestReading) return <Text type="secondary">-</Text>;
        const value = record.latestReading.ph;
        const color = value < 6.5 || value > 8.5 ? 'red' : value < 7 || value > 8 ? 'orange' : 'green';
        return <Text style={{ color }}>{value.toFixed(2)}</Text>;
      },
      width: 80,
      sorter: (a, b) => (a.latestReading?.ph || 0) - (b.latestReading?.ph || 0),
    },
    {
      title: 'Turbidity (NTU)',
      key: 'turbidity',
      render: (_, record) => {
        if (!record.latestReading) return <Text type="secondary">-</Text>;
        const value = record.latestReading.turbidity;
        const color = value > 5 ? 'red' : value > 1 ? 'orange' : 'green';
        return <Text style={{ color }}>{value.toFixed(2)}</Text>;
      },
      width: 120,
      sorter: (a, b) => (a.latestReading?.turbidity || 0) - (b.latestReading?.turbidity || 0),
    },
    {
      title: 'Last Update',
      key: 'lastUpdate',
      render: (_, record) => {
        if (!record.lastUpdateTime) return <Text type="secondary">Never</Text>;
        const now = Date.now();
        const diff = now - record.lastUpdateTime.getTime();
        const seconds = Math.floor(diff / 1000);
        
        if (seconds < 60) return <Text type="success">{seconds}s ago</Text>;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return <Text>{minutes}m ago</Text>;
        
        return <Text type="warning">{record.lastUpdateTime.toLocaleTimeString()}</Text>;
      },
      width: 120,
      sorter: (a, b) => {
        if (!a.lastUpdateTime) return 1;
        if (!b.lastUpdateTime) return -1;
        return b.lastUpdateTime.getTime() - a.lastUpdateTime.getTime();
      },
    },
  ], []);

  // Get devices with potential issues
  const devicesWithIssues = useMemo(() => {
    return devices.filter(d => {
      if (!d.latestReading || !d.isOnline) return false;
      const { tds, ph, turbidity } = d.latestReading;
      return tds > 500 || ph < 6.5 || ph > 8.5 || turbidity > 5;
    });
  }, [devices]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Summary Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Devices"
              value={devices.length}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Online"
              value={devices.filter(d => d.isOnline).length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Offline"
              value={devices.filter(d => !d.isOnline).length}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Issues Detected"
              value={devicesWithIssues.length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: devicesWithIssues.length > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Devices Table */}
      <Card title={<Title level={4} style={{ margin: 0 }}>Device Status & Readings</Title>}>
        <Table
          columns={columns}
          dataSource={devices}
          rowKey={(record) => record.device.deviceId}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} devices`,
          }}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No devices found"
              />
            ),
          }}
        />
      </Card>
    </Space>
  );
});

DeviceMonitor.displayName = 'DeviceMonitor';
