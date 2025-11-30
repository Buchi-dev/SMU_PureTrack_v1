import { Row, Col, Typography, Spin } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { Device } from '../../../../schemas';
import { useThemeToken } from '../../../../theme';
import { UnregisteredDeviceCard } from './UnregisteredDeviceCard';

const { Text, Title } = Typography;

interface UnregisteredDevicesGridProps {
  devices: Device[];
  loading: boolean;
  onRegister: (device: Device) => void;
}

export const UnregisteredDevicesGrid = ({
  devices,
  loading,
  onRegister,
}: UnregisteredDevicesGridProps) => {
  const token = useThemeToken();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          backgroundColor: token.colorBgContainer,
          borderRadius: '8px',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CheckCircleOutlined
          style={{
            fontSize: '80px',
            color: token.colorSuccess,
            marginBottom: '24px',
          }}
        />
        <Title
          level={3}
          style={{
            margin: '0 0 12px 0',
            color: token.colorText,
          }}
        >
          All Devices Registered!
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          Great job! All your devices have been assigned to locations.
        </Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Info Banner */}
      <div
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          backgroundColor: token.colorWarningBg,
          border: `1px solid ${token.colorWarningBorder}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <InfoCircleOutlined
          style={{
            fontSize: '20px',
            color: token.colorWarning,
          }}
        />
        <div style={{ flex: 1 }}>
          <Text
            strong
            style={{
              fontSize: '14px',
              color: token.colorWarningText,
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {devices.length} Unregistered Device{devices.length !== 1 ? 's' : ''} Detected
          </Text>
          <Text
            style={{
              fontSize: '13px',
              color: token.colorTextSecondary,
            }}
          >
            These devices need to be assigned to a location before they can be used. Click the
            "Register Device to Location" button on each card.
          </Text>
        </div>
      </div>

      {/* Cards Grid */}
      <Row gutter={[16, 16]}>
        {devices.map((device) => (
          <Col
            key={device.deviceId}
            xs={24}
            sm={24}
            md={12}
            lg={12}
            xl={8}
            xxl={6}
          >
            <UnregisteredDeviceCard device={device} onRegister={onRegister} />
          </Col>
        ))}
      </Row>
    </div>
  );
};
