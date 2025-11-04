import { Alert, Space, Tag, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { AlertData } from '../../../../schemas';

const { Text } = Typography;

interface ActiveAlertsProps {
  alerts: AlertData[];
}

const getSeverityColor = (severity: string): 'error' | 'warning' | 'default' | 'success' => {
  switch (severity.toLowerCase()) {
    case 'high':
    case 'critical':
      return 'error';
    case 'warning':
    case 'medium':
      return 'warning';
    case 'low':
    case 'advisory':
      return 'success';
    default:
      return 'default';
  }
};

export const ActiveAlerts = ({ alerts }: ActiveAlertsProps) => {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <Alert
      message={`${alerts.length} Active Alert(s) Detected`}
      description={
        <Space direction="vertical" style={{ width: '100%' }}>
          {alerts.map((alert, index) => (
            <div key={index}>
              <Tag color={getSeverityColor(alert.severity)}>
                {alert.severity.toUpperCase()}
              </Tag>
              <Text strong>{alert.parameter}: </Text>
              <Text>{alert.message} (Value: {alert.value})</Text>
            </div>
          ))}
        </Space>
      }
      type="warning"
      showIcon
      icon={<ExclamationCircleOutlined />}
      style={{ marginBottom: 16 }}
    />
  );
};
