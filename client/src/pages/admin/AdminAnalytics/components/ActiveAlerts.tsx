/**
 * ActiveAlerts Component
 * 
 * Displays active water quality alerts
 */
import { Alert, Space, Tag, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { memo } from 'react';
import type { WaterQualityAlert } from '../../../../schemas';
import { ALERT_STATUS } from '../../../../constants';

const { Text } = Typography;

interface ActiveAlertsProps {
  alerts: WaterQualityAlert[];
}

const getSeverityColor = (severity: string): 'error' | 'warning' | 'default' | 'success' => {
  switch (severity) {
    case 'Critical':
      return 'error';
    case 'Warning':
      return 'warning';
    case 'Advisory':
      return 'success';
    default:
      return 'default';
  }
};

export const ActiveAlerts = memo<ActiveAlertsProps>(({ alerts }) => {
  // Only show active alerts
  const activeAlerts = alerts.filter(alert => alert.status === ALERT_STATUS.UNACKNOWLEDGED);

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <Alert
      message={`${activeAlerts.length} Active Alert(s) Detected`}
      description={
        <Space direction="vertical" style={{ width: '100%' }}>
          {activeAlerts.slice(0, 5).map((alert) => (
            <div key={alert.alertId}>
              <Tag color={getSeverityColor(alert.severity)}>
                {alert.severity.toUpperCase()}
              </Tag>
              <Text strong>{alert.parameter.toUpperCase()}: </Text>
              <Text>{alert.message || 'Alert detected'}</Text>
              {alert.currentValue && (
                <Text type="secondary"> (Value: {alert.currentValue.toFixed(2)})</Text>
              )}
            </div>
          ))}
          {activeAlerts.length > 5 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              And {activeAlerts.length - 5} more alerts...
            </Text>
          )}
        </Space>
      }
      type="warning"
      showIcon
      icon={<ExclamationCircleOutlined />}
      style={{ marginBottom: 16 }}
    />
  );
});

ActiveAlerts.displayName = 'ActiveAlerts';
