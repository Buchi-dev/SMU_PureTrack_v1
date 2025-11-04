import type { ColumnsType } from 'antd/es/table';
import { Space, Tag, Tooltip, Button, Typography } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ToolOutlined,
  WifiOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { Device, DeviceStatus } from '../../../../schemas';
import { isDeviceRegistered } from '../../../../schemas';
import type { ReactNode } from 'react';

const { Text } = Typography;

// Status color mapping
const statusConfig: Record<DeviceStatus, { color: string; icon: ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
  error: { color: 'error', icon: <WarningOutlined /> },
  maintenance: { color: 'warning', icon: <ToolOutlined /> },
};

interface UseDeviceColumnsProps {
  activeTab: 'registered' | 'unregistered';
  token: any;
  onView: (device: Device) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  onRegister: (device: Device) => void;
}

export const useDeviceColumns = ({
  activeTab,
  token,
  onView,
  onEdit,
  onDelete,
  onRegister,
}: UseDeviceColumnsProps) => {
  // Table columns for registered devices
  const registeredColumns: ColumnsType<Device> = [
    {
      title: 'Device ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      fixed: 'left',
      width: 150,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text strong code style={{ fontSize: '12px' }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      ellipsis: true,
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '13px' }}>
            {text}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.type}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      filters: [
        { text: 'Online', value: 'online' },
        { text: 'Offline', value: 'offline' },
        { text: 'Maintenance', value: 'maintenance' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: DeviceStatus) => (
        <Tag
          icon={statusConfig[status].icon}
          color={statusConfig[status].color}
          style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
        >
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Registration',
      key: 'registration',
      width: 130,
      align: 'center',
      responsive: ['md'],
      filters: [
        { text: 'Registered', value: 'registered' },
        { text: 'Unregistered', value: 'unregistered' },
      ],
      onFilter: (value, record) => {
        const registered = isDeviceRegistered(record);
        return value === 'registered' ? registered : !registered;
      },
      render: (_, record) => {
        const registered = isDeviceRegistered(record);
        return registered ? (
          <Tag
            icon={<CheckCircleOutlined />}
            color="success"
            style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
          >
            REGISTERED
          </Tag>
        ) : (
          <Tag
            icon={<InfoCircleOutlined />}
            color="warning"
            style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
          >
            UNREGISTERED
          </Tag>
        );
      },
    },
    {
      title: 'Location',
      key: 'location',
      width: 200,
      responsive: ['lg'],
      ellipsis: true,
      render: (_, record) => {
        const registered = isDeviceRegistered(record);
        return (
          <Space size="small" style={{ width: '100%' }}>
            <EnvironmentOutlined
              style={{
                color: registered ? token.colorSuccess : token.colorTextDisabled,
                fontSize: '14px',
              }}
            />
            {registered ? (
              <Space direction="vertical" size={0} style={{ flex: 1 }}>
                <Text strong style={{ fontSize: '12px' }}>
                  {record.metadata?.location?.building || 'N/A'}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {record.metadata?.location?.floor || 'N/A'}
                </Text>
              </Space>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                Not assigned
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Network',
      key: 'network',
      width: 150,
      responsive: ['lg'],
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Space size="small">
            <WifiOutlined style={{ color: token.colorPrimary, fontSize: '12px' }} />
            <Text code style={{ fontSize: '11px' }}>
              {record.ipAddress}
            </Text>
          </Space>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Firmware: v{record.firmwareVersion}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: activeTab === 'unregistered' ? 120 : 140,
      align: 'center',
      render: (_, record) => {
        const isUnregistered = !isDeviceRegistered(record);

        return (
          <Space size={4}>
            {activeTab === 'unregistered' && isUnregistered ? (
              <Tooltip title="Register this device to a location">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => onRegister(record)}
                  size="small"
                  style={{ fontWeight: 500 }}
                >
                  Register
                </Button>
              </Tooltip>
            ) : (
              <>
                <Tooltip title="View Details">
                  <Button
                    type="default"
                    icon={<EyeOutlined />}
                    onClick={() => onView(record)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Edit Device">
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(record)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Delete Device">
                  <Button
                    type="default"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(record)}
                    size="small"
                  />
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  // Simplified columns for unregistered devices
  const unregisteredColumns: ColumnsType<Device> = [
    {
      title: 'Device ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      fixed: 'left',
      width: 160,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Space size="small">
            <WarningOutlined style={{ color: token.colorWarning, fontSize: '14px' }} />
            <Text strong code style={{ fontSize: '12px' }}>
              {text}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Device Information',
      key: 'deviceInfo',
      width: 280,
      render: (_, record) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space size="small" style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '14px' }}>
              {record.name}
            </Text>
            <Tag color="blue" style={{ fontSize: '10px', padding: '2px 6px' }}>
              {record.type}
            </Tag>
          </Space>
          <Space size="small" wrap>
            <WifiOutlined style={{ color: token.colorPrimary, fontSize: '12px' }} />
            <Text code style={{ fontSize: '11px' }}>
              {record.ipAddress}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              • v{record.firmwareVersion}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      filters: [
        { text: 'Online', value: 'online' },
        { text: 'Offline', value: 'offline' },
        { text: 'Maintenance', value: 'maintenance' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: DeviceStatus) => (
        <Tag
          icon={statusConfig[status].icon}
          color={statusConfig[status].color}
          style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
        >
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Sensors Detected',
      dataIndex: 'sensors',
      key: 'sensors',
      width: 250,
      responsive: ['lg'],
      render: (sensors: string[]) => (
        <Space wrap size={4}>
          {sensors.slice(0, 4).map((sensor) => (
            <Tag
              key={sensor}
              color="blue"
              style={{ margin: 0, fontSize: '11px', padding: '2px 6px' }}
            >
              {sensor}
            </Tag>
          ))}
          {sensors.length > 4 && (
            <Tooltip title={sensors.slice(4).join(', ')}>
              <Tag color="default" style={{ margin: 0, fontSize: '11px', padding: '2px 6px' }}>
                +{sensors.length - 4} more
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Registration Status',
      key: 'registrationStatus',
      width: 180,
      align: 'center',
      render: () => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Tag
            icon={<InfoCircleOutlined />}
            color="warning"
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '4px 8px',
              width: '100%',
            }}
          >
            UNREGISTERED
          </Tag>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Location not assigned
          </Text>
        </Space>
      ),
    },
    {
      title: 'Action Required',
      key: 'actions',
      fixed: 'right',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Assign this device to a building and floor location">
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => onRegister(record)}
            size="middle"
            style={{ fontWeight: 500 }}
          >
            Register Now
          </Button>
        </Tooltip>
      ),
    },
  ];

  return activeTab === 'registered' ? registeredColumns : unregisteredColumns;
};
