import { Table, Tag, Badge, Tooltip, Space, Typography } from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  DashboardOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import type { DeviceWithReadings } from '../../../../schemas';
import { useTableScroll, useResponsive } from '../../../../hooks';
import { SensorHealthIndicator } from '../../../../components';

const { Text } = Typography;

interface DeviceTableProps {
  devices: DeviceWithReadings[];
}

// Helper to get quality status for a parameter with icon
const getQualityStatus = (
  param: 'ph' | 'tds' | 'turbidity',
  value: number
): { status: 'success' | 'warning' | 'error'; text: string; icon: React.ReactNode } => {
  switch (param) {
    case 'ph':
      if (value >= 6.5 && value <= 8.5) return { 
        status: 'success', 
        text: 'Optimal',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      };
      if (value >= 6.0 && value <= 9.0) return { 
        status: 'warning', 
        text: 'Acceptable',
        icon: <WarningOutlined style={{ color: '#faad14' }} />
      };
      return { 
        status: 'error', 
        text: 'Critical',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      };
    case 'tds':
      if (value <= 300) return { 
        status: 'success', 
        text: 'Excellent',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      };
      if (value <= 500) return { 
        status: 'warning', 
        text: 'Good',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      };
      if (value <= 1000) return { 
        status: 'warning', 
        text: 'Fair',
        icon: <WarningOutlined style={{ color: '#faad14' }} />
      };
      return { 
        status: 'error', 
        text: 'Poor',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      };
    case 'turbidity':
      if (value <= 1) return { 
        status: 'success', 
        text: 'Excellent',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      };
      if (value <= 5) return { 
        status: 'warning', 
        text: 'Good',
        icon: <WarningOutlined style={{ color: '#faad14' }} />
      };
      return { 
        status: 'error', 
        text: 'Poor',
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      };
    default:
      return { 
        status: 'success', 
        text: 'Normal',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      };
  }
};

export const DeviceTable = memo(({ devices }: DeviceTableProps) => {
  const { isMobile } = useResponsive();

  // Mobile-optimized columns (Device, Status, Sensors)
  const mobileColumns = [
    {
      title: 'Device',
      key: 'device',
      ellipsis: false,
      render: (device: DeviceWithReadings) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '13px', display: 'block', lineHeight: 1.3 }}>
            {device.name}
          </Text>
          <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
            {device.deviceId}
          </Text>
          {device.metadata?.location && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              <EnvironmentOutlined style={{ marginRight: 2 }} />
              {device.metadata.location.building}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 70,
      align: 'center' as const,
      render: (device: DeviceWithReadings) => {
        const { severityLevel, status } = device;

        if (status === 'offline' || !device.latestReading) {
          return (
            <Tooltip title="Offline">
              <CloseCircleOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
            </Tooltip>
          );
        }

        switch (severityLevel) {
          case 'critical':
            return (
              <Tooltip title="Critical">
                <CloseCircleOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
              </Tooltip>
            );
          case 'warning':
            return (
              <Tooltip title="Warning">
                <WarningOutlined style={{ fontSize: '24px', color: '#faad14' }} />
              </Tooltip>
            );
          case 'normal':
            return (
              <Tooltip title="Normal">
                <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
              </Tooltip>
            );
          default:
            return (
              <Tooltip title="Unknown">
                <CloseCircleOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
              </Tooltip>
            );
        }
      },
    },
    {
      title: 'Sensors',
      key: 'sensors',
      render: (device: DeviceWithReadings) => {
        if (!device.latestReading) {
          return <Text type="secondary" style={{ fontSize: '11px' }}>No data</Text>;
        }

        const phValue = device.latestReading?.pH ?? device.latestReading?.ph;
        const tdsValue = device.latestReading?.tds;
        const turbidityValue = device.latestReading?.turbidity;

        const phQuality = getQualityStatus('ph', phValue ?? 0);
        const tdsQuality = getQualityStatus('tds', tdsValue ?? 0);
        const turbidityQuality = getQualityStatus('turbidity', turbidityValue ?? 0);

        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {phQuality.icon}
              <Text style={{ fontSize: '11px' }}>
                pH: <strong>{typeof phValue === 'number' ? phValue.toFixed(2) : '-'}</strong>
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {tdsQuality.icon}
              <Text style={{ fontSize: '11px' }}>
                TDS: <strong>{typeof tdsValue === 'number' ? tdsValue.toFixed(0) : '-'}</strong>
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {turbidityQuality.icon}
              <Text style={{ fontSize: '11px' }}>
                NTU: <strong>{typeof turbidityValue === 'number' ? turbidityValue.toFixed(2) : '-'}</strong>
              </Text>
            </div>
          </Space>
        );
      },
    },
  ];

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
      width: 180,
      render: (device: DeviceWithReadings) => {
        // Handle both pH (capital H) and ph (lowercase) for backwards compatibility
        const phValue = device.latestReading?.pH ?? device.latestReading?.ph;
        const phValid = device.latestReading?.pH_valid;
        
        if (!device.latestReading) {
          return <Text type="secondary">-</Text>;
        }

        const quality = getQualityStatus('ph', phValue ?? 0);
        return (
          <Space direction="vertical" size={2}>
            <Space align="center" size={8}>
              <ExperimentOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
              <Text strong style={{ fontSize: '16px' }}>
                {typeof phValue === 'number' ? phValue.toFixed(2) : '-'}
              </Text>
            </Space>
            <Space align="center" size={4}>
              {typeof phValue === 'number' && phValid !== false ? (
                <>
                  {quality.icon}
                  <Tag color={quality.status} style={{ margin: 0 }}>
                    {quality.text}
                  </Tag>
                </>
              ) : (
                <SensorHealthIndicator 
                  sensor="pH" 
                  value={phValue} 
                  valid={phValid}
                  mode="tag"
                  size="small"
                />
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'TDS (ppm)',
      key: 'tds',
      width: 180,
      render: (device: DeviceWithReadings) => {
        const tdsValue = device.latestReading?.tds;
        const tdsValid = device.latestReading?.tds_valid;

        if (!device.latestReading) {
          return <Text type="secondary">-</Text>;
        }

        const quality = getQualityStatus('tds', tdsValue ?? 0);
        return (
          <Space direction="vertical" size={2}>
            <Space align="center" size={8}>
              <DashboardOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
              <Text strong style={{ fontSize: '16px' }}>
                {typeof tdsValue === 'number' ? tdsValue.toFixed(0) : '-'}
              </Text>
            </Space>
            <Space align="center" size={4}>
              {typeof tdsValue === 'number' && tdsValid !== false ? (
                <>
                  {quality.icon}
                  <Tag color={quality.status} style={{ margin: 0 }}>
                    {quality.text}
                  </Tag>
                </>
              ) : (
                <SensorHealthIndicator 
                  sensor="tds" 
                  value={tdsValue} 
                  valid={tdsValid}
                  mode="tag"
                  size="small"
                />
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Turbidity (NTU)',
      key: 'turbidity',
      width: 180,
      render: (device: DeviceWithReadings) => {
        const turbidityValue = device.latestReading?.turbidity;
        const turbidityValid = device.latestReading?.turbidity_valid;

        if (!device.latestReading) {
          return <Text type="secondary">-</Text>;
        }

        const quality = getQualityStatus('turbidity', turbidityValue ?? 0);
        return (
          <Space direction="vertical" size={2}>
            <Space align="center" size={8}>
              <EyeOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
              <Text strong style={{ fontSize: '16px' }}>
                {typeof turbidityValue === 'number' ? turbidityValue.toFixed(2) : '-'}
              </Text>
            </Space>
            <Space align="center" size={4}>
              {typeof turbidityValue === 'number' && turbidityValid !== false ? (
                <>
                  {quality.icon}
                  <Tag color={quality.status} style={{ margin: 0 }}>
                    {quality.text}
                  </Tag>
                </>
              ) : (
                <SensorHealthIndicator 
                  sensor="turbidity" 
                  value={turbidityValue} 
                  valid={turbidityValid}
                  mode="tag"
                  size="small"
                />
              )}
            </Space>
          </Space>
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

  const tableScroll = useTableScroll({ offsetHeight: 400 });

  return (
    <Table
      columns={isMobile ? mobileColumns : columns}
      dataSource={devices}
      rowKey="deviceId"
      pagination={{
        pageSize: isMobile ? 5 : 20,
        showSizeChanger: !isMobile,
        showQuickJumper: !isMobile,
        showTotal: (total, range) => isMobile 
          ? `${total} devices` 
          : `${range[0]}-${range[1]} of ${total} devices`,
        size: isMobile ? 'small' : 'default',
      }}
      scroll={isMobile ? undefined : tableScroll}
      size={isMobile ? 'small' : 'middle'}
      bordered={!isMobile}
    />
  );
});

DeviceTable.displayName = 'DeviceTable';