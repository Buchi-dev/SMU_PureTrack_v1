import { Tooltip, Tag, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { memo } from 'react';

export interface SensorHealthIndicatorProps {
  /** Sensor name (pH, TDS, Turbidity) */
  sensor: 'pH' | 'tds' | 'turbidity';
  /** Sensor reading value */
  value: number | null | undefined;
  /** Sensor validity flag from Arduino */
  valid?: boolean;
  /** Display mode: 'icon-only' | 'tag' | 'full' */
  mode?: 'icon-only' | 'tag' | 'full';
  /** Size: 'small' | 'default' | 'large' */
  size?: 'small' | 'default' | 'large';
}

const getSensorStatus = (
  sensor: string,
  value: number | null | undefined,
  valid?: boolean
): {
  status: 'healthy' | 'invalid' | 'disconnected' | 'calibration';
  color: string;
  icon: React.ReactNode;
  text: string;
  description: string;
} => {
  // Check if sensor is disconnected or returning null
  if (value === null || value === undefined) {
    return {
      status: 'disconnected',
      color: '#8c8c8c',
      icon: <DisconnectOutlined />,
      text: 'No Data',
      description: `${sensor} sensor is not providing data. Check connection or calibration.`,
    };
  }

  // Check Arduino validity flag
  if (valid === false) {
    return {
      status: 'invalid',
      color: '#ff4d4f',
      icon: <CloseCircleOutlined />,
      text: 'Invalid',
      description: `${sensor} reading is out of valid range. Sensor may need calibration or maintenance.`,
    };
  }

  // Check for zero reading (possible calibration issue)
  if (value === 0) {
    return {
      status: 'calibration',
      color: '#faad14',
      icon: <ExclamationCircleOutlined />,
      text: 'Check Sensor',
      description: `${sensor} is reading 0. Sensor may need calibration or is not submerged properly.`,
    };
  }

  // Sensor is working properly
  return {
    status: 'healthy',
    color: '#52c41a',
    icon: <CheckCircleOutlined />,
    text: 'Healthy',
    description: `${sensor} sensor is functioning normally.`,
  };
};

const SensorHealthIndicator = memo<SensorHealthIndicatorProps>(
  ({ sensor, value, valid, mode = 'tag', size = 'default' }) => {
    const sensorName = sensor === 'pH' ? 'pH' : sensor.charAt(0).toUpperCase() + sensor.slice(1);
    const status = getSensorStatus(sensorName, value, valid);

    const iconSize = size === 'small' ? 12 : size === 'large' ? 18 : 14;
    const iconStyle = { fontSize: `${iconSize}px`, color: status.color };

    // Icon only mode
    if (mode === 'icon-only') {
      return (
        <Tooltip title={status.description}>
          <span style={iconStyle}>{status.icon}</span>
        </Tooltip>
      );
    }

    // Tag mode (compact)
    if (mode === 'tag') {
      return (
        <Tooltip title={status.description}>
          <Tag
            icon={status.icon}
            color={status.status === 'healthy' ? 'success' : status.status === 'disconnected' ? 'default' : 'error'}
            style={{ margin: 0, fontSize: size === 'small' ? '11px' : size === 'large' ? '14px' : '12px' }}
          >
            {status.text}
          </Tag>
        </Tooltip>
      );
    }

    // Full mode (with sensor name)
    return (
      <Tooltip title={status.description}>
        <Space size={4}>
          <span style={iconStyle}>{status.icon}</span>
          <Tag
            color={status.status === 'healthy' ? 'success' : status.status === 'disconnected' ? 'default' : 'error'}
            style={{ margin: 0 }}
          >
            {sensorName}: {status.text}
          </Tag>
        </Space>
      </Tooltip>
    );
  }
);

SensorHealthIndicator.displayName = 'SensorHealthIndicator';

export default SensorHealthIndicator;
