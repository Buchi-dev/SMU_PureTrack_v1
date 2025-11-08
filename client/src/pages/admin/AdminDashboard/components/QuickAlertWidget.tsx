import { Card, Space, Typography, Badge } from 'antd';
import { 
  WarningOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import { HEALTH_COLORS } from '../config';

const { Text } = Typography;

interface QuickAlertWidgetProps {
  criticalCount: number;
  offlineDevices: number;
  loading?: boolean;
}

export const QuickAlertWidget = memo<QuickAlertWidgetProps>(({ 
  criticalCount,
  offlineDevices,
  loading = false
}) => {
  const hasIssues = criticalCount > 0 || offlineDevices > 0;
  const totalIssues = criticalCount + offlineDevices;

  return (
    <Card 
      size="small"
      loading={loading}
      style={{ 
        backgroundColor: hasIssues ? '#fff1f0' : '#f6ffed',
        borderLeft: `4px solid ${hasIssues ? HEALTH_COLORS.ERROR : HEALTH_COLORS.EXCELLENT}`,
        minHeight: '155px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        boxShadow: hasIssues ? '0 0 12px rgba(255, 77, 79, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
      }}
      bodyStyle={{ 
        width: '100%',
        padding: '16px'
      }}
    >
      <Space 
        direction="vertical"
        size="small"
        style={{ width: '100%' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space align="center" size={8}>
            <div style={{ 
              fontSize: '20px', 
              color: hasIssues ? HEALTH_COLORS.ERROR : HEALTH_COLORS.EXCELLENT,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center'
            }}>
              {hasIssues ? <WarningOutlined /> : <ExclamationCircleOutlined />}
            </div>
            <Text type="secondary" style={{ 
              fontSize: '12px', 
              lineHeight: '1.2',
            }}>
              System Alerts
            </Text>
          </Space>
          {hasIssues && (
            <Badge count={totalIssues} style={{ backgroundColor: HEALTH_COLORS.ERROR }} />
          )}
        </div>

        {/* Alert Counts */}
        <div style={{ marginTop: '8px' }}>
          {criticalCount > 0 ? (
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExclamationCircleOutlined style={{ color: HEALTH_COLORS.ERROR, fontSize: '16px' }} />
                <Text strong style={{ fontSize: '20px', color: HEALTH_COLORS.ERROR }}>
                  {criticalCount}
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Critical Alert{criticalCount > 1 ? 's' : ''}
                </Text>
              </div>
            </Space>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ExclamationCircleOutlined style={{ color: HEALTH_COLORS.EXCELLENT, fontSize: '16px' }} />
              <Text style={{ fontSize: '14px', color: HEALTH_COLORS.EXCELLENT }}>
                No Critical Alerts
              </Text>
            </div>
          )}
        </div>

        {/* Offline Devices */}
        <div style={{ marginTop: '4px' }}>
          {offlineDevices > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WarningOutlined style={{ color: HEALTH_COLORS.WARNING, fontSize: '14px' }} />
              <Text style={{ fontSize: '12px', color: '#666' }}>
                {offlineDevices} device{offlineDevices > 1 ? 's' : ''} offline
              </Text>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WarningOutlined style={{ color: HEALTH_COLORS.EXCELLENT, fontSize: '14px' }} />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                All devices online
              </Text>
            </div>
          )}
        </div>

        {/* Status Message */}
        <div style={{ 
          marginTop: '8px', 
          padding: '6px 8px', 
          backgroundColor: hasIssues ? '#fff' : 'transparent',
          borderRadius: '4px',
          border: hasIssues ? '1px solid #ffccc7' : 'none'
        }}>
          <Text type="secondary" style={{ fontSize: '11px', lineHeight: '1.3' }}>
            {hasIssues 
              ? 'Immediate attention required'
              : 'All systems operational'
            }
          </Text>
        </div>
      </Space>
    </Card>
  );
});

QuickAlertWidget.displayName = 'QuickAlertWidget';
