import { Card, Space, Tag, Button, Typography, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  WifiOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { DeviceWithReadings, DeviceStatus, DeviceUIStatus } from '../../../../schemas';
import { useThemeToken } from '../../../../theme';

const { Text, Title } = Typography;

// ✅ UI Status color mapping (uses centralized deviceStatus.util uiStatus)
const uiStatusConfig: Record<DeviceUIStatus, { color: string; icon: React.ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
  warning: { color: 'warning', icon: <WarningOutlined /> },
};

// Legacy status config for devices without uiStatus (fallback only)
const legacyStatusConfig: Record<DeviceStatus, { color: string; icon: React.ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
};

interface UnregisteredDeviceCardProps {
  device: DeviceWithReadings;
  onRegister: (device: DeviceWithReadings) => void;
}

export const UnregisteredDeviceCard = ({ device, onRegister }: UnregisteredDeviceCardProps) => {
  const token = useThemeToken();

  return (
    <Card
      hoverable
      style={{
        borderLeft: `4px solid ${token.colorWarning}`,
        backgroundColor: token.colorBgContainer,
        transition: 'all 0.3s ease',
      }}
      styles={{
        body: { padding: '20px' },
      }}
      className="unregistered-device-card"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Space direction="vertical" size={4}>
              <Space size="small">
                <InfoCircleOutlined style={{ color: token.colorInfo, fontSize: '16px' }} />
                <Title level={5} style={{ margin: 0, fontSize: '16px' }}>
                  {device.name}
                </Title>
              </Space>
              <Space size={4}>
                <Tag color="blue" style={{ fontSize: '11px' }}>
                  {device.type}
                </Tag>
                {/* ✅ Use centralized uiStatus from deviceStatus.util */}
                {(() => {
                  const status = device.uiStatus || device.status; // Fallback to backend status
                  const config = device.uiStatus 
                    ? uiStatusConfig[device.uiStatus] 
                    : legacyStatusConfig[device.status];
                  
                  return (
                    <Tooltip title={device.statusReason || `Device is ${status}`}>
                      <Tag
                        icon={config.icon}
                        color={config.color}
                        style={{ fontSize: '11px' }}
                      >
                        {status.toUpperCase()}
                      </Tag>
                    </Tooltip>
                  );
                })()}
              </Space>
            </Space>
          </div>
          <Tag
            icon={<InfoCircleOutlined />}
            color="warning"
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '4px 10px',
            }}
          >
            UNREGISTERED
          </Tag>
        </div>

        {/* Device ID Section */}
        <div
          style={{
            padding: '12px',
            backgroundColor: token.colorBgLayout,
            borderRadius: '6px',
          }}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              Device ID
            </Text>
            <Tooltip title={device.deviceId}>
              <Text
                code
                strong
                style={{ fontSize: '12px' }}
                ellipsis={{ tooltip: true }}
              >
                {device.deviceId}
              </Text>
            </Tooltip>
          </Space>
        </div>

        {/* Network Information */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                <WifiOutlined /> IP Address
              </Text>
              <Text code style={{ fontSize: '12px' }}>
                {device.ipAddress}
              </Text>
            </Space>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <Space direction="vertical" size={4}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Firmware Version
              </Text>
              <Text strong style={{ fontSize: '12px' }}>
                v{device.firmwareVersion}
              </Text>
            </Space>
          </div>
        </div>

        {/* Sensors Section */}
        <div>
          <Text
            type="secondary"
            style={{ fontSize: '11px', display: 'block', marginBottom: '8px' }}
          >
            Sensors Detected ({device.sensors?.length || 0})
          </Text>
          <Space wrap size={4}>
            {device.sensors && device.sensors.length > 0 ? (
              <>
                {device.sensors.slice(0, 6).map((sensor) => (
                  <Tag
                    key={sensor}
                    color="blue"
                    style={{ margin: 0, fontSize: '11px', padding: '2px 8px' }}
                  >
                    {sensor}
                  </Tag>
                ))}
                {device.sensors.length > 6 && (
                  <Tooltip title={device.sensors.slice(6).join(', ')}>
                    <Tag
                      color="default"
                      style={{ margin: 0, fontSize: '11px', padding: '2px 8px' }}
                    >
                      +{device.sensors.length - 6} more
                    </Tag>
                  </Tooltip>
                )}
              </>
            ) : (
              <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                No sensors detected
              </Text>
            )}
          </Space>
        </div>

        {/* Action Button */}
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => onRegister(device)}
          size="large"
          block
          style={{ fontWeight: 500, marginTop: '8px' }}
        >
          Register Device to Location
        </Button>

        {/* Footer Note */}
        <div
          style={{
            padding: '12px',
            backgroundColor: token.colorWarningBg,
            borderRadius: '6px',
            border: `1px solid ${token.colorWarningBorder}`,
          }}
        >
          <Text
            type="secondary"
            style={{ fontSize: '11px', display: 'block', textAlign: 'center' }}
          >
            <InfoCircleOutlined style={{ marginRight: '4px' }} />
            This device needs to be assigned to a building and floor before it can be used
          </Text>
        </div>
      </div>
    </Card>
  );
};
