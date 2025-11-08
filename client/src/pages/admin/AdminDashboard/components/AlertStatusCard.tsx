import { Card, Space, Typography, Row, Col, Tag, Tooltip, Progress } from 'antd';
import { 
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { memo, useMemo } from 'react';

const { Text, Title } = Typography;

interface AlertStatusCardProps {
  alertStats: {
    total: number;
    active: number;
    critical: number;
    warning: number;
    advisory: number;
  };
  loading: boolean;
}

export const AlertStatusCard = memo<AlertStatusCardProps>(({ alertStats, loading }) => {
  const safeAlertStats = useMemo(() => ({
    total: alertStats?.total ?? 0,
    active: alertStats?.active ?? 0,
    critical: alertStats?.critical ?? 0,
    warning: alertStats?.warning ?? 0,
    advisory: alertStats?.advisory ?? 0,
  }), [alertStats]);

  const resolved = useMemo(() => 
    safeAlertStats.total - safeAlertStats.active,
    [safeAlertStats]
  );

  const statusColor = useMemo(() => {
    if (safeAlertStats.critical > 0) return '#ff4d4f';
    if (safeAlertStats.warning > 0) return '#faad14';
    if (safeAlertStats.active > 0) return '#1890ff';
    return '#52c41a';
  }, [safeAlertStats]);

  const statusText = useMemo(() => {
    if (safeAlertStats.critical > 0) return 'Critical';
    if (safeAlertStats.warning > 0) return 'Warning';
    if (safeAlertStats.active > 0) return 'Active';
    return 'All Clear';
  }, [safeAlertStats]);

  const statusIcon = useMemo(() => {
    if (safeAlertStats.critical > 0) return <ExclamationCircleOutlined />;
    if (safeAlertStats.warning > 0) return <WarningOutlined />;
    if (safeAlertStats.active > 0) return <InfoCircleOutlined />;
    return <CheckCircleOutlined />;
  }, [safeAlertStats]);

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <BellOutlined style={{ fontSize: '18px' }} />
          <span style={{ fontSize: '16px', fontWeight: 500 }}>Alert Status</span>
        </Space>
      }
      bordered={false}
      style={{ 
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        height: '100%',
        minHeight: '400px'
      }}
      bodyStyle={{ 
        padding: '24px',
        height: '100%'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Main Status Display */}
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ 
            fontSize: '56px', 
            color: statusColor,
            marginBottom: '12px',
            lineHeight: 1,
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {statusIcon}
          </div>
          <Title level={3} style={{ margin: '12px 0 8px 0', color: statusColor, fontSize: '24px' }}>
            {statusText}
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            {safeAlertStats.active} of {safeAlertStats.total} alerts active
          </Text>
        </div>

        {/* Alert Breakdown - 2x2 Grid */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Tooltip title="Critical alerts requiring immediate attention">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: safeAlertStats.critical > 0 ? '#ff4d4f' : '#e8e8e8',
                  backgroundColor: safeAlertStats.critical > 0 ? '#fff1f0' : '#fafafa',
                  borderRadius: '8px',
                  minHeight: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                bodyStyle={{ 
                  padding: '16px 12px',
                  width: '100%'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <ExclamationCircleOutlined style={{ fontSize: '32px', color: '#ff4d4f' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Critical</Text>
                  <Text strong style={{ fontSize: '20px', color: '#ff4d4f' }}>
                    {safeAlertStats.critical}
                  </Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
          <Col span={12}>
            <Tooltip title="Warning alerts that need attention">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: safeAlertStats.warning > 0 ? '#faad14' : '#e8e8e8',
                  backgroundColor: safeAlertStats.warning > 0 ? '#fffbe6' : '#fafafa',
                  borderRadius: '8px',
                  minHeight: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                bodyStyle={{ 
                  padding: '16px 12px',
                  width: '100%'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <WarningOutlined style={{ fontSize: '32px', color: '#faad14' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Warning</Text>
                  <Text strong style={{ fontSize: '20px', color: '#faad14' }}>
                    {safeAlertStats.warning}
                  </Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
          <Col span={12}>
            <Tooltip title="Advisory alerts for informational purposes">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: safeAlertStats.advisory > 0 ? '#1890ff' : '#e8e8e8',
                  backgroundColor: safeAlertStats.advisory > 0 ? '#e6f7ff' : '#fafafa',
                  borderRadius: '8px',
                  minHeight: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                bodyStyle={{ 
                  padding: '16px 12px',
                  width: '100%'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <InfoCircleOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Advisory</Text>
                  <Text strong style={{ fontSize: '20px', color: '#1890ff' }}>
                    {safeAlertStats.advisory}
                  </Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
          <Col span={12}>
            <Tooltip title="Resolved and cleared alerts">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: '#52c41a',
                  backgroundColor: '#f6ffed',
                  borderRadius: '8px',
                  minHeight: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                bodyStyle={{ 
                  padding: '16px 12px',
                  width: '100%'
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Resolved</Text>
                  <Text strong style={{ fontSize: '20px', color: '#52c41a' }}>
                    {resolved}
                  </Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
        </Row>

        {/* Alert Activity Progress */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: safeAlertStats.critical > 0 ? '#fff1f0' : safeAlertStats.warning > 0 ? '#fffbe6' : '#f6ffed',
          borderRadius: '8px',
          border: `1px solid ${safeAlertStats.critical > 0 ? '#ffccc7' : safeAlertStats.warning > 0 ? '#ffe58f' : '#b7eb8f'}`
        }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>Active Alerts</Text>
              <Text strong style={{ 
                fontSize: '18px',
                color: statusColor
              }}>
                {safeAlertStats.active}
              </Text>
            </div>
            <Progress 
              percent={safeAlertStats.total > 0 ? Math.round((safeAlertStats.active / safeAlertStats.total) * 100) : 0}
              strokeColor={statusColor}
              showInfo={false}
              strokeWidth={10}
            />
          </Space>
        </div>

        {/* Summary Tags */}
        <div style={{ textAlign: 'center' }}>
          <Space wrap size="small">
            <Tag 
              icon={<ClockCircleOutlined />} 
              color={safeAlertStats.active > 0 ? 'orange' : 'green'}
              style={{ padding: '4px 12px', fontSize: '13px' }}
            >
              {safeAlertStats.active} Active
            </Tag>
            <Tag 
              icon={<CheckCircleOutlined />} 
              color="success"
              style={{ padding: '4px 12px', fontSize: '13px' }}
            >
              {resolved} Resolved
            </Tag>
          </Space>
        </div>
      </Space>
    </Card>
  );
});

AlertStatusCard.displayName = 'AlertStatusCard';
