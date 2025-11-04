import {
  Card,
  Typography,
  Space,
  Tag,
  Empty,
  Button,
  List,
} from 'antd';
import {
  WarningOutlined,
  RightOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeToken } from '../../../../theme';
import type {
  WaterQualityAlert,
} from '../../../../schemas';
import {
  getSeverityColor,
  getParameterName,
  getParameterUnit,
} from '../../../../schemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface RecentAlertsCardProps {
  alerts: WaterQualityAlert[];
  loading: boolean;
  activeAlerts: number;
  criticalAlerts: number;
}

/**
 * Recent Alerts Summary Card
 * Displays a summary of recent alerts with link to full alert management
 */
export const RecentAlertsCard = ({
  alerts,
  loading,
  activeAlerts,
  criticalAlerts,
}: RecentAlertsCardProps) => {
  const token = useThemeToken();
  const navigate = useNavigate();

  // Show only the most recent 5 alerts
  const recentAlerts = alerts.slice(0, 5);

  return (
    <Card
      title={
        <Space>
          <WarningOutlined style={{ color: token.colorWarning }} />
          <span>Recent Alerts</span>
          {activeAlerts > 0 && (
            <Tag color="error">{activeAlerts} Active</Tag>
          )}
          {criticalAlerts > 0 && (
            <Tag color="error" icon={<WarningOutlined />}>
              {criticalAlerts} Critical
            </Tag>
          )}
        </Space>
      }
      extra={
        <Button
          type="link"
          icon={<RightOutlined />}
          onClick={() => navigate('/admin/alerts')}
        >
          View All Alerts
        </Button>
      }
      bordered={false}
      loading={loading}
    >
      {recentAlerts.length === 0 ? (
        <Empty 
          image={<BellOutlined style={{ fontSize: 48, color: token.colorSuccess }} />}
          description={
            <Space direction="vertical" size={4}>
              <Text strong>No Recent Alerts</Text>
              <Text type="secondary">All systems are operating normally</Text>
            </Space>
          }
        />
      ) : (
        <>
          <List
            dataSource={recentAlerts}
            renderItem={(alert) => {
              const time = alert.createdAt?.toDate?.() 
                ? alert.createdAt.toDate() 
                : (alert.createdAt ? new Date(alert.createdAt) : null);
              return (
                <List.Item
                  key={alert.alertId}
                  style={{
                    padding: '12px 16px',
                    borderLeft: `4px solid ${token[getSeverityColor(alert.severity) as keyof typeof token]}`,
                    marginBottom: 8,
                    background: alert.status === 'Active' ? '#fff1f0' : '#fafafa',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/admin/alerts')}
                >
                  <List.Item.Meta
                    title={
                      <Space size={8} wrap>
                        <Tag color={getSeverityColor(alert.severity)} style={{ margin: 0 }}>
                          {alert.severity}
                        </Tag>
                        <Text strong style={{ fontSize: 13 }}>
                          {getParameterName(alert.parameter)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {alert.currentValue.toFixed(2)} {getParameterUnit(alert.parameter)}
                        </Text>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text ellipsis style={{ fontSize: 12 }}>
                          {alert.message}
                        </Text>
                        <Space size={8} wrap style={{ fontSize: 11 }}>
                          <Text type="secondary">
                            {alert.deviceName || alert.deviceId}
                          </Text>
                          {alert.deviceBuilding && (
                            <>
                              <Text type="secondary">•</Text>
                              <Text type="secondary">{alert.deviceBuilding}</Text>
                            </>
                          )}
                          <Text type="secondary">•</Text>
                          <Text type="secondary">
                            {time ? dayjs(time).fromNow() : 'Unknown time'}
                          </Text>
                        </Space>
                      </Space>
                    }
                  />
                  <Tag color={alert.status === 'Active' ? 'error' : alert.status === 'Acknowledged' ? 'warning' : 'success'}>
                    {alert.status}
                  </Tag>
                </List.Item>
              );
            }}
          />
          
          {alerts.length > 5 && (
            <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <Button
                type="primary"
                icon={<BellOutlined />}
                onClick={() => navigate('/admin/alerts')}
              >
                View All {alerts.length} Alerts
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
