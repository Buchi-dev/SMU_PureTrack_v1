import { Space, Tag, Typography, Row, Col, Divider } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import type { DeviceWithReadings, DeviceStatus, DeviceUIStatus } from '../../../../schemas';
import { formatLastSeen } from '../../../../utils/deviceStatus.util';

const { Text } = Typography;

const uiStatusConfig: Record<DeviceUIStatus, { color: string; icon: React.ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
  warning: { color: 'warning', icon: <WarningOutlined /> },
};

const legacyStatusConfig: Record<DeviceStatus, { color: string; icon: React.ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
};

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}

const InfoRow = ({ label, value, fullWidth = false }: InfoRowProps) => (
  <div style={{ width: fullWidth ? '100%' : undefined }}>
    <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>
      {label}
    </Text>
    <div style={{ fontSize: '13px' }}>{value}</div>
  </div>
);

interface MobileDeviceInfoProps {
  device: DeviceWithReadings;
}

export const MobileDeviceInfo = ({ device }: MobileDeviceInfoProps) => {
  const status = device.uiStatus || device.status;
  const config = device.uiStatus 
    ? uiStatusConfig[device.uiStatus] 
    : legacyStatusConfig[device.status];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* Device ID */}
      <InfoRow
        label="Device ID"
        value={<Text code strong style={{ fontSize: '12px', wordBreak: 'break-all' }}>{device.deviceId}</Text>}
        fullWidth
      />

      {/* Type and Status */}
      <Row gutter={[12, 12]}>
        <Col span={12}>
          <InfoRow
            label="Type"
            value={<Tag color="blue">{device.type}</Tag>}
          />
        </Col>
        <Col span={12}>
          <InfoRow
            label="Status"
            value={
              <Tag icon={config.icon} color={config.color}>
                {status.toUpperCase()}
              </Tag>
            }
          />
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0' }} />

      {/* Network Information */}
      <InfoRow
        label="MAC Address"
        value={<Text code style={{ fontSize: '11px' }}>{device.macAddress}</Text>}
        fullWidth
      />

      <InfoRow
        label="IP Address"
        value={
          <Space size="small">
            <WifiOutlined style={{ fontSize: '12px' }} />
            <Text code style={{ fontSize: '11px' }}>{device.ipAddress}</Text>
          </Space>
        }
        fullWidth
      />

      <Divider style={{ margin: '4px 0' }} />

      {/* Firmware and Sensors */}
      <Row gutter={[12, 12]}>
        <Col span={12}>
          <InfoRow
            label="Firmware"
            value={<Tag style={{ fontSize: '11px' }}>v{device.firmwareVersion}</Tag>}
          />
        </Col>
        <Col span={12}>
          <InfoRow
            label="Sensors"
            value={<Text strong>{device.sensors.length} active</Text>}
          />
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0' }} />

      {/* Timestamps */}
      <InfoRow
        label="Registered At"
        value={
          <Text style={{ fontSize: '12px' }}>
            {device.registeredAt?.seconds
              ? new Date(device.registeredAt.seconds * 1000).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Not registered'}
          </Text>
        }
        fullWidth
      />

      <InfoRow
        label="Last Seen"
        value={
          <Text style={{ fontSize: '12px' }}>
            {device.lastSeenMs !== undefined && device.lastSeenMs !== null
              ? formatLastSeen(device.lastSeenMs)
              : device.lastSeen?.seconds
              ? new Date(device.lastSeen.seconds * 1000).toLocaleString()
              : 'Never'}
          </Text>
        }
        fullWidth
      />
    </Space>
  );
};
