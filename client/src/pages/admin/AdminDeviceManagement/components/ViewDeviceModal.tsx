import type { ReactNode } from 'react';
import {
  Modal,
  Descriptions,
  Tag,
  Space,
  Card,
  Button,
  Typography,
  Alert,
  message,
  Popconfirm,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ToolOutlined,
  WifiOutlined,
  ApiOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  DashboardOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { Device, DeviceStatus } from '../../../../schemas';
import { isDeviceRegistered } from '../../../../schemas';
import { useThemeToken } from '../../../../theme';
import { sendDeviceCommand } from '../../../../utils/mqtt';

const { Text } = Typography;

interface ViewDeviceModalProps {
  visible: boolean;
  device: Device | null;
  onClose: () => void;
}

const statusConfig: Record<DeviceStatus, { color: string; icon: ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
  error: { color: 'error', icon: <WarningOutlined /> },
  maintenance: { color: 'warning', icon: <ToolOutlined /> },
};

export const ViewDeviceModal = ({ visible, device, onClose }: ViewDeviceModalProps) => {
  const token = useThemeToken();

  if (!device) return null;

  // Command handlers
  const handleRestartDevice = () => {
    sendDeviceCommand(device.deviceId, 'restart');
    message.success(`Restart command sent to ${device.name}`);
  };

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined style={{ color: token.colorPrimary }} />
          <span>Device Details - {device.name}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Space key="commands">
          <Popconfirm
            title="Restart Device"
            description="Are you sure you want to restart this device?"
            onConfirm={handleRestartDevice}
            okText="Restart"
            cancelText="Cancel"
          >
            <Button icon={<ReloadOutlined />} danger>
              Restart
            </Button>
          </Popconfirm>

          <Button key="close" type="primary" onClick={onClose}>
            Close
          </Button>
        </Space>,
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Device Information */}
        <Card title={<><DashboardOutlined /> Device Information</>} size="small">
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Device ID">
              <Text code strong>{device.deviceId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Name">
              <Text strong>{device.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="blue">{device.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag icon={statusConfig[device.status].icon} color={statusConfig[device.status].color}>
                {device.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="MAC Address">
              <Text code>{device.macAddress}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="IP Address">
              <Space>
                <WifiOutlined />
                <Text code>{device.ipAddress}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Firmware Version">
              <Tag>{device.firmwareVersion}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Sensors">
              <Space wrap size="small">
                {device.sensors.map((sensor) => (
                  <Tag key={sensor} color="cyan">{sensor}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Registered At" span={2}>
              {device.registeredAt?.seconds
                ? new Date(device.registeredAt.seconds * 1000).toLocaleString()
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Seen" span={2}>
              {device.lastSeen?.seconds
                ? new Date(device.lastSeen.seconds * 1000).toLocaleString()
                : 'Never'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Location Information */}
        <Card 
          title={
            <Space>
              <EnvironmentOutlined />
              <span>Location Information</span>
              {isDeviceRegistered(device) ? (
                <Tag icon={<CheckCircleOutlined />} color="success">REGISTERED</Tag>
              ) : (
                <Tag icon={<InfoCircleOutlined />} color="warning">UNREGISTERED</Tag>
              )}
            </Space>
          } 
          size="small"
        >
          {device.metadata?.location ? (
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Building" span={2}>
                <Text strong>{device.metadata.location.building || 'Not set'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Floor" span={2}>
                <Text strong>{device.metadata.location.floor || 'Not set'}</Text>
              </Descriptions.Item>
              {device.metadata.location.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  <Text>{device.metadata.location.notes}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <Alert
              message="No Location Set"
              description="This device has not been assigned a location. Please edit the device to add location information for registration."
              type="warning"
              showIcon
              icon={<EnvironmentOutlined />}
            />
          )}
        </Card>

        {/* Additional Metadata */}
        {device.metadata && (device.metadata.description || device.metadata.owner) && (
          <Card title="Additional Information" size="small">
            <Descriptions bordered column={2} size="small">
              {device.metadata.description && (
                <Descriptions.Item label="Description" span={2}>
                  {device.metadata.description}
                </Descriptions.Item>
              )}
              {device.metadata.owner && (
                <Descriptions.Item label="Owner" span={2}>
                  {device.metadata.owner}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}

        {/* Device Commands */}
        <Card title={<><SettingOutlined /> Device Commands</>} size="small">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text strong>Available Commands:</Text>
            <Space wrap size="small">
              <Tag color="red">
                <ReloadOutlined /> Restart - Reboot the device
              </Tag>
            </Space>
            <Alert
              message="Command Execution"
              description="Commands are sent directly to the device via MQTT. The device must be online to receive commands."
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          </Space>
        </Card>

        {/* Status Messages */}
        {device.status === 'offline' && (
          <Alert
            message="Device Offline"
            description="This device is currently offline. Sensor data is not available."
            type="warning"
            showIcon
          />
        )}

        {device.status === 'error' && (
          <Alert
            message="Device Error"
            description="This device is reporting an error state. Please check the device logs."
            type="error"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};
