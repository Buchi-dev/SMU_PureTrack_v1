/**
 * RecentAlertsList Component
 * 
 * Displays a list of the most recent water quality alerts with
 * severity badges, timestamps, and device information.
 */
import { List, Badge, Typography, Space, Tag, Empty } from 'antd';
import { 
  WarningOutlined, 
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { WaterQualityAlert } from '../../../../schemas';
import { ALERT_STATUS } from '../../../../constants';
import { ResponsiveCard } from '../../../../components';
import { useResponsive } from '../../../../hooks';

const { Text } = Typography;

interface RecentAlertsListProps {
  alerts: WaterQualityAlert[];
  loading?: boolean;
  maxItems?: number;
}

/**
 * List of recent alerts sorted by creation time
 * 
 * @param props - Component props including alerts array
 * @returns Alert list with severity indicators
 */
export const RecentAlertsList = memo<RecentAlertsListProps>(({ 
  alerts, 
  loading = false,
  maxItems = 5
}) => {
  const { isMobile } = useResponsive();
  // Get recent alerts sorted by createdAt
  const recentAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => {
        // Handle both Firestore Timestamp and ISO date strings
        const getTime = (alert: WaterQualityAlert) => {
          if (alert.createdAt?.toMillis && typeof alert.createdAt.toMillis === 'function') {
            return alert.createdAt.toMillis();
          } else if (alert.createdAt) {
            return new Date(alert.createdAt as any).getTime();
          } else if (alert.timestamp) {
            return new Date(alert.timestamp as any).getTime();
          }
          return 0;
        };
        
        const timeA = getTime(a);
        const timeB = getTime(b);
        return timeB - timeA;
      })
      .slice(0, maxItems);
  }, [alerts, maxItems]);

  // Severity icon and color
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return {
          icon: <ExclamationCircleOutlined />,
          color: '#ff4d4f',
          tagColor: 'error'
        };
      case 'Warning':
        return {
          icon: <WarningOutlined />,
          color: '#faad14',
          tagColor: 'warning'
        };
      case 'Advisory':
        return {
          icon: <InfoCircleOutlined />,
          color: '#1890ff',
          tagColor: 'processing'
        };
      default:
        return {
          icon: <InfoCircleOutlined />,
          color: '#8c8c8c',
          tagColor: 'default'
        };
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: { toDate?: () => Date } | string | Date | null | undefined) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      const date = typeof timestamp === 'object' && 'toDate' in timestamp && timestamp.toDate ? timestamp.toDate() : new Date(timestamp as string | Date);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <ResponsiveCard
      size="small"
      loading={loading}
      compactMobile
      style={{ 
        backgroundColor: '#fafafa',
        borderLeft: '4px solid #1890ff',
        height: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
      styles={{
        body: {
          padding: isMobile ? '8px' : '12px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space align="center" size={isMobile ? 4 : 8}>
            <ClockCircleOutlined style={{ fontSize: isMobile ? '14px' : '16px', color: '#1890ff' }} />
            <Text strong style={{ fontSize: isMobile ? '12px' : '13px' }}>Recent Alerts</Text>
          </Space>
          <Badge 
            count={alerts.length} 
            showZero 
            style={{ backgroundColor: '#1890ff' }} 
          />
        </div>

        {/* Alerts List */}
        <div style={{ flex: 1, overflow: 'auto', maxHeight: isMobile ? '300px' : '400px' }}>
          {recentAlerts.length === 0 ? (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description="No recent alerts"
              style={{ marginTop: isMobile ? '10px' : '20px' }}
            />
          ) : (
            <List
              size="small"
              dataSource={recentAlerts}
              renderItem={(alert) => {
                const severityConfig = getSeverityConfig(alert.severity);
                return (
                  <List.Item
                    style={{
                      padding: isMobile ? '6px 0' : '8px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      {/* Alert Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <Space size={isMobile ? 4 : 6} align="start" style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ color: severityConfig.color, fontSize: isMobile ? '12px' : '14px', lineHeight: '20px' }}>
                            {severityConfig.icon}
                          </span>
                          <Text 
                            strong 
                            style={{ 
                              fontSize: isMobile ? '11px' : '12px',
                              lineHeight: '20px',
                              flex: 1,
                              wordBreak: 'break-word'
                            }}
                          >
                            {alert.message || 'Alert'}
                          </Text>
                        </Space>
                        <Tag 
                          color={severityConfig.tagColor} 
                          style={{ 
                            fontSize: isMobile ? '9px' : '10px', 
                            padding: '0 4px',
                            margin: 0,
                            lineHeight: '18px',
                            flexShrink: 0
                          }}
                        >
                          {alert.severity}
                        </Tag>
                      </div>

                      {/* Alert Details */}
                      <div style={{ paddingLeft: isMobile ? '16px' : '20px' }}>
                        <Space 
                          size={isMobile ? 8 : 12} 
                          split={<span style={{ color: '#d9d9d9' }}>•</span>}
                          wrap={isMobile}
                        >
                          <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '11px' }}>
                            {alert.deviceName || alert.deviceId || 'Unknown device'}
                          </Text>
                          <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '11px' }}>
                            {formatTimestamp(alert.createdAt)}
                          </Text>
                          {alert.status && (
                            <Text 
                              type="secondary" 
                              style={{ 
                                fontSize: isMobile ? '10px' : '11px',
                                color: alert.status === ALERT_STATUS.UNACKNOWLEDGED ? '#ff4d4f' : 
                                       alert.status === ALERT_STATUS.ACKNOWLEDGED ? '#faad14' : '#52c41a'
                              }}
                            >
                              {alert.status}
                            </Text>
                          )}
                        </Space>
                      </div>
                    </Space>
                  </List.Item>
                );
              }}
            />
          )}
        </div>

        {/* Footer */}
        {alerts.length > maxItems && (
          <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '11px' }}>
              Showing {maxItems} of {alerts.length} alerts
            </Text>
          </div>
        )}
      </Space>
    </ResponsiveCard>
  );
});

RecentAlertsList.displayName = 'RecentAlertsList';
