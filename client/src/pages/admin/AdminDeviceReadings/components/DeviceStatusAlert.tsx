import { Alert } from 'antd';
import type { Device } from '../../../../schemas';

interface DeviceStatusAlertProps {
  device: Device | undefined;
}

export const DeviceStatusAlert = ({ device }: DeviceStatusAlertProps) => {
  if (!device || device.status === 'online') {
    return null;
  }

  return (
    <Alert
      message="Device Offline"
      description={`The selected device is currently ${device.status}. Data may not be up to date.`}
      type="warning"
      showIcon
      closable
      style={{ marginBottom: 24 }}
    />
  );
};
