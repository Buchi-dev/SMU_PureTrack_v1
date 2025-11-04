import { Select, Space, Badge, Typography } from 'antd';
import type { Device } from '../../../../schemas';

const { Text } = Typography;
const { Option } = Select;

interface DeviceSelectorProps {
  devices: Device[];
  selectedDeviceId: string;
  loading: boolean;
  onChange: (deviceId: string) => void;
}

export const DeviceSelector = ({
  devices,
  selectedDeviceId,
  loading,
  onChange,
}: DeviceSelectorProps) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="small">
      <Text strong>Select Device:</Text>
      <Select
        style={{ width: '100%', minWidth: 300 }}
        placeholder="Select a device to view sensor readings"
        value={selectedDeviceId || undefined}
        onChange={onChange}
        loading={loading}
        size="large"
      >
        {devices.map(device => (
          <Option key={device.deviceId} value={device.deviceId}>
            <Space>
              <Badge status={device.status === 'online' ? 'success' : 'default'} />
              {device.name} ({device.deviceId})
            </Space>
          </Option>
        ))}
      </Select>
    </Space>
  );
};
