import { Card, Space, Typography, Row, Col, Tag, Tooltip, Badge } from 'antd';
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
          <BellOutlined />
          <span>Alert Status</span>
        </Space>
      }
      bordered={false}
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        height: '100%'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Main Status Display */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ 
            fontSize: '48px', 
            color: statusColor,
            marginBottom: '8px',
            lineHeight: 1
          }}>
            {statusIcon}
          </div>
          <Title level={4} style={{ margin: '8px 0 4px 0', color: statusColor }}>
            {statusText}
          </Title>
          <Text type="secondary">
            {safeAlertStats.active} of {safeAlertStats.total} alerts active
          </Text>
        </div>

        {/* Alert Breakdown */}
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <Tooltip title="Critical alerts requiring immediate attention">
              <Card 
                size="small" 
                style={{ 
                  textAlign: 'center',
                  borderColor: safeAlertStats.critical > 0 ? '#ff4d4f' : '#d9d9d9',
                  backgroundColor: safeAlertStats.critical > 0 ? '#fff1f0' : '#fafafa'
                }}
              >
                <Badge count={safeAlertStats.critical} showZero style={{ backgroundColor: '#cf1322' }}>
                  <ExclamationCircleOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
                </Badge>
                <div style={{ marginTop: '8px' }}>
                  <Text strong style={{ color: '#ff4d4f' }}>Critical</Text>
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
                  borderColor: safeAlertStats.warning > 0 ? '#faad14' : '#d9d9d9',
                  backgroundColor: safeAlertStats.warning > 0 ? '#fffbe6' : '#fafafa'
                }}
              >
                <Badge count={safeAlertStats.warning} showZero style={{ backgroundColor: '#fa8c16' }}>
                  <WarningOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                </Badge>
                <div style={{ marginTop: '8px' }}>
                  <Text strong style={{ color: '#faad14' }}>Warning</Text>
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
                  borderColor: safeAlertStats.advisory > 0 ? '#1890ff' : '#d9d9d9',
                  backgroundColor: safeAlertStats.advisory > 0 ? '#e6f7ff' : '#fafafa'
                }}
              >
                <Badge count={safeAlertStats.advisory} showZero style={{ backgroundColor: '#1890ff' }}>
                  <InfoCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                </Badge>
                <div style={{ marginTop: '8px' }}>
                  <Text strong style={{ color: '#1890ff' }}>Advisory</Text>
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
                  borderColor: '#d9d9d9',
                  backgroundColor: '#fafafa'
                }}
              >
                <Badge count={resolved} showZero style={{ backgroundColor: '#52c41a' }}>
                  <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                </Badge>
                <div style={{ marginTop: '8px' }}>
                  <Text strong style={{ color: '#52c41a' }}>Resolved</Text>
                </div>
              </Card>
            </Tooltip>
          </Col>
        </Row>

        {/* Summary Tags */}
        <div style={{ textAlign: 'center' }}>
          <Space wrap>
            <Tag icon={<ClockCircleOutlined />} color={safeAlertStats.active > 0 ? 'orange' : 'green'}>
              {safeAlertStats.active} Active
            </Tag>
            <Tag icon={<CheckCircleOutlined />} color="success">
              {resolved} Resolved
            </Tag>
          </Space>
        </div>
      </Space>
    </Card>
  );
});

AlertStatusCard.displayName = 'AlertStatusCard';
