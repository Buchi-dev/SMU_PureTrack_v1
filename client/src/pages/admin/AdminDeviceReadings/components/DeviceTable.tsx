import { Table, Tag, Badge, Tooltip, Space, Typography } from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import type { DeviceWithReadings } from '../../../../schemas';

const { Text } = Typography;

interface DeviceTableProps {
  devices: DeviceWithReadings[];
}

// Helper to get quality status for a parameter
const getQualityStatus = (
  param: 'ph' | 'tds' | 'turbidity',
  value: number
): { status: 'success' | 'warning' | 'error'; text: string } => {
  switch (param) {
    case 'ph':
      if (value >= 6.5 && value <= 8.5) return { status: 'success', text: 'Optimal' };
      if (value >= 6.0 && value <= 9.0) return { status: 'warning', text: 'Acceptable' };
      return { status: 'error', text: 'Critical' };
    case 'tds':
      if (value <= 300) return { status: 'success', text: 'Excellent' };
      if (value <= 500) return { status: 'warning', text: 'Good' };
      if (value <= 1000) return { status: 'warning', text: 'Fair' };
      return { status: 'error', text: 'Poor' };
    case 'turbidity':
      if (value <= 1) return { status: 'success', text: 'Excellent' };
      if (value <= 5) return { status: 'warning', text: 'Good' };
      return { status: 'error', text: 'Poor' };
    default:
      return { status: 'success', text: 'Normal' };
  }
};

export const DeviceTable = memo(({ devices }: DeviceTableProps) => {
  const columns = [
    {
      title: 'Device',
      key: 'device',
      width: 200,
      render: (device: DeviceWithReadings) => (
        <div>
          <div>
            <Text strong>{device.name}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {device.deviceId}
            </Text>
          </div>
          {device.metadata?.location && (
            <div>
              <EnvironmentOutlined style={{ marginRight: 4, color: '#1890ff' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {device.metadata.location.building}, {device.metadata.location.floor}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (device: DeviceWithReadings) => {
        const { severityLevel, status } = device;

        if (status === 'offline' || !device.latestReading) {
          return <Badge status="default" text="Offline" />;
        }

        switch (severityLevel) {
          case 'critical':
            return <Badge status="error" text="Critical" />;
          case 'warning':
            return <Badge status="warning" text="Warning" />;
          case 'normal':
            return <Badge status="success" text="Normal" />;
          default:
            return <Badge status="default" text="Unknown" />;
        }
      },
    },
    {
      title: 'pH Level',
      key: 'ph',
      width: 120,
      render: (device: DeviceWithReadings) => {
        if (!device.latestReading || typeof device.latestReading.ph !== 'number') {
          return <Text type="secondary">-</Text>;
        }

        const quality = getQualityStatus('ph', device.latestReading.ph);
        return (
          <div>
            <div>
              <Text strong>{device.latestReading.ph.toFixed(2)}</Text>
            </div>
            <Tag color={quality.status}>
              {quality.text}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'TDS (ppm)',
      key: 'tds',
      width: 120,
      render: (device: DeviceWithReadings) => {
        if (!device.latestReading || typeof device.latestReading.tds !== 'number') {
          return <Text type="secondary">-</Text>;
        }

        const quality = getQualityStatus('tds', device.latestReading.tds);
        return (
          <div>
            <div>
              <Text strong>{device.latestReading.tds.toFixed(0)}</Text>
            </div>
            <Tag color={quality.status}>
              {quality.text}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Turbidity (NTU)',
      key: 'turbidity',
      width: 140,
      render: (device: DeviceWithReadings) => {
        if (!device.latestReading || typeof device.latestReading.turbidity !== 'number') {
          return <Text type="secondary">-</Text>;
        }

        const quality = getQualityStatus('turbidity', device.latestReading.turbidity);
        return (
          <div>
            <div>
              <Text strong>{device.latestReading.turbidity.toFixed(2)}</Text>
            </div>
            <Tag color={quality.status}>
              {quality.text}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Last Update',
      key: 'timestamp',
      width: 150,
      render: (device: DeviceWithReadings) => {
        if (!device.latestReading) {
          return <Text type="secondary">-</Text>;
        }

        const timestamp = device.latestReading.timestamp;
        return (
          <Tooltip title={new Date(timestamp).toLocaleString()}>
            <div>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {new Date(timestamp).toLocaleTimeString()}
              </Text>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Alerts',
      key: 'alerts',
      width: 200,
      render: (device: DeviceWithReadings) => {
        const { activeAlerts } = device;

        if (activeAlerts.length === 0) {
          return <Text type="secondary">No alerts</Text>;
        }

        return (
          <div>
            <Space size={4} wrap>
              {activeAlerts.slice(0, 2).map((alert) => (
                <Tag
                  key={alert.alertId as string}
                  color={(alert.severity as string) === 'Critical' ? 'red' : 'orange'}
                >
                  {(alert.parameter as string).toUpperCase()}: {(alert.message as string) || 'Alert'}
                </Tag>
              ))}
              {activeAlerts.length > 2 && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  +{activeAlerts.length - 2} more
                </Text>
              )}
            </Space>
          </div>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={devices}
      rowKey="deviceId"
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} devices`,
      }}
      scroll={{ x: 1000 }}
      size="middle"
      bordered
    />
  );
});

DeviceTable.displayName = 'DeviceTable';