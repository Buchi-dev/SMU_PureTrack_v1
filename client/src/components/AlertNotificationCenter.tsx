/**
 * Alert Notification Center
 * Displays recent alerts in a dropdown from the header bell icon
 */

import { useState, useMemo } from 'react';
import {
  Badge,
  Button,
  Dropdown,
  List,
  Tag,
  Typography,
  Space,
  Empty,
  Divider,
  Spin,
} from 'antd';
import {
  BellOutlined,
  WarningOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAlerts } from '../hooks';
import { getSeverityColor } from '../schemas';
import { ROUTES } from '../router/routes';

const { Text } = Typography;

export default function AlertNotificationCenter() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Use the SWR-based hook for real-time alerts
  // Removed custom pollInterval - rely on global SWR cache shared across all components
  const { alerts: allAlerts, isLoading } = useAlerts({
    enabled: true,
  });

  // Filter for active/acknowledged alerts and limit to 10
  const alerts = useMemo(() => {
    return allAlerts
      .filter((a) => a.status === 'Active' || a.status === 'Acknowledged')
      .slice(0, 10);
  }, [allAlerts]);

  const unreadCount = useMemo(() => {
    return alerts.filter((a) => a.status === 'Active').length;
  }, [alerts]);

  const viewAllAlerts = () => {
    setDropdownOpen(false);
    // Navigate to appropriate alerts page based on current route
    if (location.pathname.includes('/staff')) {
      navigate(ROUTES.STAFF.ALERTS);
    } else {
      navigate(ROUTES.ADMIN.ALERTS);
    }
  };

  const getTimeSince = (timestamp: Date | string): string => {
    const now = Date.now();
    const alertTime = timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
    const diff = now - alertTime;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const dropdownContent = (
    <div
      style={{
        width: 380,
        maxHeight: 500,
        overflow: 'auto',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <BellOutlined style={{ fontSize: 18 }} />
          <Text strong>Alerts</Text>
          {unreadCount > 0 && (
            <Badge
              count={unreadCount}
              style={{ backgroundColor: '#ff4d4f' }}
            />
          )}
        </Space>
        <Button
          type="link"
          size="small"
          onClick={viewAllAlerts}
        >
          View All
        </Button>
      </div>

      {/* Alert List */}
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : alerts.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No active alerts"
            style={{ padding: 40 }}
          />
        ) : (
          <List
            dataSource={alerts}
            renderItem={(alert) => (
              <List.Item
                key={alert.alertId}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: alert.status === 'Active' ? '#fff1f0' : 'transparent',
                  transition: 'background 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    alert.status === 'Active' ? '#fff1f0' : 'transparent';
                }}
                onClick={() => {
                  setDropdownOpen(false);
                  // Navigate to appropriate alerts page based on current route
                  if (location.pathname.includes('/staff')) {
                    navigate(ROUTES.STAFF.ALERTS);
                  } else {
                    navigate(ROUTES.ADMIN.ALERTS);
                  }
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: getSeverityColor(alert.severity),
                        marginTop: 8,
                      }}
                    />
                  }
                  title={
                    <Space size={4} wrap>
                      <Tag
                        color={getSeverityColor(alert.severity)}
                        style={{ margin: 0, fontSize: 11, padding: '0 6px' }}
                      >
                        {alert.severity}
                      </Tag>
                      <Text strong style={{ fontSize: 13 }}>
                        {alert.parameter.toUpperCase()}
                      </Text>
                      {alert.status === 'Active' && (
                        <WarningOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Text
                        style={{
                          fontSize: 12,
                          display: 'block',
                          marginBottom: 4,
                        }}
                        ellipsis={{ tooltip: true }}
                        title={alert.message || `${alert.parameter.toUpperCase()} alert detected`}
                      >
                        {alert.message || `${alert.parameter.toUpperCase()} alert detected`}
                      </Text>
                      <Space size={8} wrap>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {alert.deviceName || alert.deviceId}
                        </Text>
                        {(alert.deviceBuilding || alert.deviceFloor) && (
                          <>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              •
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              📍 {[alert.deviceBuilding, alert.deviceFloor].filter(Boolean).join(', ')}
                            </Text>
                          </>
                        )}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          •
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {getTimeSince(alert.createdAt)}
                        </Text>
                      </Space>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div
            style={{
              padding: '8px 16px',
              textAlign: 'center',
            }}
          >
            <Button
              type="link"
              block
              onClick={viewAllAlerts}
              icon={<EyeOutlined />}
            >
              View All Alerts
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      popupRender={() => dropdownContent}
      trigger={['click']}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: '18px' }} />}
          size="large"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </Badge>
    </Dropdown>
  );
}
