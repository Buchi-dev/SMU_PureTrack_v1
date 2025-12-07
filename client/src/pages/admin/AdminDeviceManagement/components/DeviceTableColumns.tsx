import type { ColumnsType } from 'antd/es/table';
import { Space, Tag, Tooltip, Button, Typography } from 'antd';
import type { GlobalToken } from 'antd/es/theme/interface';
import {
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WifiOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import type { DeviceWithReadings, DeviceStatus, DeviceUIStatus } from '../../../../schemas';
import { isDeviceRegistered } from '../../../../schemas';
import type { ReactNode } from 'react';
import { useResponsive } from '../../../../hooks';

const { Text } = Typography;

// ✅ UI Status color mapping (uses centralized deviceStatus.util uiStatus)
const uiStatusConfig: Record<DeviceUIStatus, { color: string; icon: ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
  warning: { color: 'warning', icon: <WarningOutlined /> },
};

// Legacy status config for devices without uiStatus (fallback only)
const legacyStatusConfig: Record<DeviceStatus, { color: string; icon: ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
};

interface UseDeviceColumnsProps {
  activeTab: 'registered' | 'unregistered';
  token: GlobalToken;
  onView: (device: DeviceWithReadings) => void;
  onDelete?: (device: DeviceWithReadings) => void;
  onRegister: (device: DeviceWithReadings) => void;
  onRecover?: (device: DeviceWithReadings) => void;
}

export const useDeviceColumns = ({
  activeTab,
  token,
  onView,
  onDelete,
  onRegister,
  onRecover,
}: UseDeviceColumnsProps) => {
  const { isMobile } = useResponsive();

  // Mobile-optimized columns (3 columns: Device ID, Status, Actions)
  const mobileColumns: ColumnsType<DeviceWithReadings> = [
    {
      title: 'Device ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      ellipsis: false,
      render: (text, record) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Text 
            strong 
            code 
            style={{ 
              fontSize: '13px', 
              display: 'block',
              wordBreak: 'break-all',
              lineHeight: 1.3,
            }}
          >
            {text}
          </Text>
          <Text 
            type="secondary" 
            style={{ 
              fontSize: '12px',
              display: 'block',
              lineHeight: 1.2,
            }}
          >
            {record.name}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'uiStatus',
      key: 'uiStatus',
      width: 60,
      align: 'center',
      render: (_: unknown, record: DeviceWithReadings) => {
        const status = record.uiStatus || record.status;
        const config = record.uiStatus 
          ? uiStatusConfig[record.uiStatus] 
          : legacyStatusConfig[record.status];
        
        return (
          <Tooltip title={status.toUpperCase()}>
            <div
              style={{
                fontSize: '24px',
                color: config.color === 'success' 
                  ? '#52c41a' 
                  : config.color === 'warning' 
                  ? '#faad14' 
                  : '#d9d9d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {config.icon}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, record) => {
        const isUnregistered = !isDeviceRegistered(record);

        return (
          <Space size={4} direction="vertical">
            {activeTab === 'unregistered' && isUnregistered ? (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => onRegister(record)}
                size="small"
                style={{ width: '100%' }}
              >
                Register
              </Button>
            ) : onRecover ? (
              <>
                <Button
                  type="default"
                  icon={<EyeOutlined />}
                  onClick={() => onView(record)}
                  size="small"
                  block
                />
                <Button
                  type="primary"
                  icon={<RollbackOutlined />}
                  onClick={() => onRecover(record)}
                  size="small"
                  block
                />
              </>
            ) : (
              <>
                <Button
                  type="default"
                  icon={<EyeOutlined />}
                  onClick={() => onView(record)}
                  size="small"
                  block
                />
                {onDelete && (
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(record)}
                    size="small"
                    block
                  />
                )}
              </>
            )}
          </Space>
        );
      },
    },
  ];

  // Table columns for registered devices
  const registeredColumns: ColumnsType<DeviceWithReadings> = [
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
      dataIndex: 'uiStatus',
      key: 'uiStatus',
      width: 120,
      align: 'center',
      filters: [
        { text: 'Online', value: 'online' },
        { text: 'Offline', value: 'offline' },
        { text: 'Warning', value: 'warning' },
      ],
      onFilter: (value, record) => (record.uiStatus || record.status) === value,
      render: (_: unknown, record: DeviceWithReadings) => {
        // Use centralized uiStatus from deviceStatus.util (computed in useDevices)
        const status = record.uiStatus || record.status; // Fallback to backend status
        const config = record.uiStatus 
          ? uiStatusConfig[record.uiStatus] 
          : legacyStatusConfig[record.status];
        
        return (
          <Tooltip title={record.statusReason || `Device is ${status}`}>
            <Tag
              icon={config.icon}
              color={config.color}
              style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
            >
              {status.toUpperCase()}
            </Tag>
          </Tooltip>
        );
      },
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
                color: (registered ? token.colorSuccess : token.colorTextDisabled) as string,
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
            <WifiOutlined style={{ color: token.colorPrimary as string, fontSize: '12px' }} />
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
            ) : onRecover ? (
              // Deleted devices - show recover button
              <>
                <Tooltip title="View Details">
                  <Button
                    type="default"
                    icon={<EyeOutlined />}
                    onClick={() => onView(record)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Recover Device">
                  <Button
                    type="primary"
                    icon={<RollbackOutlined />}
                    onClick={() => onRecover(record)}
                    size="small"
                    style={{ fontWeight: 500 }}
                  >
                    Recover
                  </Button>
                </Tooltip>
              </>
            ) : (
              // Registered devices - show view and delete
              <>
                <Tooltip title="View Details">
                  <Button
                    type="default"
                    icon={<EyeOutlined />}
                    onClick={() => onView(record)}
                    size="small"
                  />
                </Tooltip>
                {onDelete && (
                  <Tooltip title="Delete Device">
                    <Button
                      type="default"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onDelete(record)}
                      size="small"
                    />
                  </Tooltip>
                )}
              </>
            )}
          </Space>
        );
      },
    },
  ];

  // Simplified columns for unregistered devices
  const unregisteredColumns: ColumnsType<DeviceWithReadings> = [
    {
      title: 'Device ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip title={text}>
          <Space size="small">
            <InfoCircleOutlined style={{ color: token.colorInfo as string, fontSize: '14px' }} />
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
            <WifiOutlined style={{ color: token.colorPrimary as string, fontSize: '12px' }} />
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
      align: 'center',
      filters: [
        { text: 'Online', value: 'online' },
        { text: 'Offline', value: 'offline' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: DeviceStatus) => {
        const config = legacyStatusConfig[status]; // Use legacy config for unregistered devices
        return (
          <Tag
            icon={config.icon}
            color={config.color}
            style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
          >
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Sensors Detected',
      dataIndex: 'sensors',
      key: 'sensors',
      render: (sensors: string[]) => (
        <Space wrap size={4}>
          {sensors && sensors.length > 0 ? (
            <>
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
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              No sensors detected
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Registration',
      key: 'registrationStatus',
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
            }}
          >
            UNREGISTERED
          </Tag>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            No location
          </Text>
        </Space>
      ),
    },
    {
      title: 'Action Required',
      key: 'actions',
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

  // Return mobile columns if on mobile device, otherwise return full columns
  if (isMobile) {
    return mobileColumns;
  }

  return activeTab === 'registered' ? registeredColumns : unregisteredColumns;
};
