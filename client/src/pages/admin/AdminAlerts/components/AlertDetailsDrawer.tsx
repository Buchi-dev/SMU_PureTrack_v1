import {
  Drawer,
  Space,
  Tag,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Form,
  Input,
  Tabs,
} from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  TabletOutlined,
  BellOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import {
  getParameterUnit,
  getParameterName,
  getSeverityColor,
  getStatusColor,
} from '../../../../schemas';
import type { WaterQualityAlert } from '../../../../schemas';

const { Text } = Typography;
const { TextArea } = Input;

// Helper to convert Ant Design color names to actual color values
const getColorValue = (colorName: string, token: ReturnType<typeof useThemeToken>): string => {
  const colorMap: Record<string, string> = {
    'error': token.colorError,
    'warning': token.colorWarning,
    'success': token.colorSuccess,
    'processing': token.colorInfo,
    'default': token.colorTextSecondary,
  };
  return colorMap[colorName] || token.colorTextSecondary;
};
const { TextArea } = Input;

interface AlertDetailsDrawerProps {
  visible: boolean;
  alert: WaterQualityAlert | null;
  onClose: () => void;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string, notes?: string) => Promise<boolean>;
  isAcknowledging?: (alertId: string) => boolean;
  isResolving?: (alertId: string) => boolean;
}

/**
 * Alert Details Drawer Component (Streamlined)
 * Tabbed interface for faster workflows
 */
export const AlertDetailsDrawer: React.FC<AlertDetailsDrawerProps> = ({
  visible,
  alert,
  onClose,
  onAcknowledge,
  onResolve,
  isAcknowledging = () => false,
  isResolving = () => false,
}) => {
  const token = useThemeToken();
  const [form] = Form.useForm();

  const handleResolve = async (values: { notes?: string }) => {
    if (alert) {
      const success = await onResolve(alert.alertId, values.notes);
      if (success) {
        form.resetFields();
        onClose();
      }
    }
  };

  const handleQuickResolve = async () => {
    if (alert) {
      const success = await onResolve(alert.alertId, 'Quick resolved by admin');
      if (success) {
        onClose();
      }
    }
  };

  if (!alert) return null;

  const acknowledging = isAcknowledging(alert.alertId);
  const resolving = isResolving(alert.alertId);

  return (
    <Drawer
      title={
        <Space>
          <WarningOutlined style={{ fontSize: 20, color: getColorValue(getSeverityColor(alert.severity), token) }} />
          <span>{alert.parameter.toUpperCase()} Alert</span>
          <Tag color={getSeverityColor(alert.severity)} style={{ marginLeft: 8 }}>
            {alert.severity}
          </Tag>
        </Space>
      }
      placement="right"
      width={650}
      open={visible}
      onClose={onClose}
      styles={{
        body: { padding: 0 }
      }}
      extra={
        <Space>
          {alert.status === 'Active' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => onAcknowledge(alert.alertId)}
              loading={acknowledging}
              size="small"
            >
              Acknowledge
            </Button>
          )}
          {alert.status !== 'Resolved' && (
            <Button
              type="primary"
              danger
              icon={<CheckCircleOutlined />}
              onClick={handleQuickResolve}
              loading={resolving}
              size="small"
            >
              Quick Resolve
            </Button>
          )}
        </Space>
      }
    >
      <div style={{ height: '100%', overflowY: 'auto' }}>
        {/* Status Banner */}
        <div style={{ 
          padding: '16px 24px', 
          background: `linear-gradient(135deg, ${getColorValue(getSeverityColor(alert.severity), token)}15 0%, ${getColorValue(getSeverityColor(alert.severity), token)}05 100%)`,
          borderBottom: `2px solid ${getColorValue(getSeverityColor(alert.severity), token)}`
        }}>
          <Space>
            <Tag 
              color={getStatusColor(alert.status)}
              icon={
                alert.status === 'Active' ? <ExclamationCircleOutlined /> :
                alert.status === 'Acknowledged' ? <CheckCircleOutlined /> :
                <CloseCircleOutlined />
              }
              style={{ fontSize: 14, padding: '4px 12px' }}
            >
              {alert.status}
            </Tag>
            <Text type="secondary">{alert.alertType}</Text>
          </Space>
        </div>

        {/* Tabbed Content */}
        <Tabs
          defaultActiveKey="overview"
          style={{ padding: '0 24px' }}
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <Space direction="vertical" size={16} style={{ width: '100%', paddingBottom: 24 }}>
                  {/* Alert Message */}
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                        ALERT MESSAGE
                      </Text>
                      <Text style={{ fontSize: 14 }}>{alert.message}</Text>
                    </Space>
                  </Card>

                  {/* Measurement Cards */}
                  <Row gutter={12}>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#f5f5f5' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Parameter</Text>
                        <div style={{ marginTop: 4 }}>
                          <Text strong style={{ fontSize: 15, color: token.colorPrimary }}>
                            {getParameterName(alert.parameter)}
                          </Text>
                        </div>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#f5f5f5' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Current Value</Text>
                        <div style={{ marginTop: 4 }}>
                          <Text strong style={{ 
                            fontSize: 17, 
                            color: getColorValue(getSeverityColor(alert.severity), token),
                            fontWeight: 700
                          }}>
                            {alert.currentValue.toFixed(2)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                            {getParameterUnit(alert.parameter)}
                          </Text>
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {alert.thresholdValue && (
                    <Card size="small" style={{ background: '#fff9e6', borderColor: '#ffe58f' }}>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Text type="secondary" style={{ fontSize: 11 }}>Threshold</Text>
                          <div>
                            <Text strong style={{ fontSize: 15 }}>
                              {alert.thresholdValue} {getParameterUnit(alert.parameter)}
                            </Text>
                          </div>
                        </Col>
                        {alert.trendDirection && (
                          <Col>
                            <Tag color="orange">{alert.trendDirection}</Tag>
                          </Col>
                        )}
                      </Row>
                    </Card>
                  )}

                  {/* Recommended Action */}
                  <Card 
                    size="small" 
                    style={{ background: '#fffbe6', borderColor: '#ffe58f' }}
                  >
                    <Space align="start">
                      <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 16, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                          Recommended Action
                        </Text>
                        <Text style={{ fontSize: 13 }}>
                          {alert.recommendedAction}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Space>
              ),
            },
            {
              key: 'device',
              label: 'Device Info',
              children: (
                <Space direction="vertical" size={16} style={{ width: '100%', paddingBottom: 24 }}>
                  <Card size="small">
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <div>
                        <Space>
                          <TabletOutlined style={{ color: token.colorPrimary }} />
                          <Text strong>{alert.deviceName || alert.deviceId}</Text>
                        </Space>
                      </div>
                      {(alert.deviceBuilding || alert.deviceFloor) && (
                        <div>
                          <Space>
                            <EnvironmentOutlined style={{ color: token.colorPrimary }} />
                            <Text>
                              {[alert.deviceBuilding, alert.deviceFloor].filter(Boolean).join(', ')}
                            </Text>
                          </Space>
                        </div>
                      )}
                      <Divider style={{ margin: '8px 0' }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Device ID: {alert.deviceId}
                      </Text>
                    </Space>
                  </Card>

                  {/* Notifications */}
                  {alert.notificationsSent && alert.notificationsSent.length > 0 && (
                    <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                      <Space>
                        <BellOutlined style={{ color: token.colorSuccess }} />
                        <Text>
                          <Text strong style={{ color: token.colorSuccess }}>
                            {alert.notificationsSent.length}
                          </Text>
                          {' '}user{alert.notificationsSent.length !== 1 ? 's' : ''} notified
                        </Text>
                      </Space>
                    </Card>
                  )}
                </Space>
              ),
            },
            {
              key: 'timeline',
              label: 'Timeline',
              children: (
                <Space direction="vertical" size={12} style={{ width: '100%', paddingBottom: 24 }}>
                  <Card size="small">
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <ClockCircleOutlined style={{ color: token.colorPrimary }} />
                          <Text type="secondary">Created</Text>
                        </Space>
                        <Text strong>
                          {alert.createdAt?.toDate ? 
                            alert.createdAt.toDate().toLocaleString() : 
                            'N/A'}
                        </Text>
                      </div>
                      {alert.acknowledgedAt && (
                        <>
                          <Divider style={{ margin: '8px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                              <CheckCircleOutlined style={{ color: token.colorWarning }} />
                              <Text type="secondary">Acknowledged</Text>
                            </Space>
                            <Text>
                              {alert.acknowledgedAt.toDate ? 
                                alert.acknowledgedAt.toDate().toLocaleString() : 
                                'N/A'}
                            </Text>
                          </div>
                          {alert.acknowledgedBy && (
                            <Text type="secondary" style={{ fontSize: 11, paddingLeft: 24 }}>
                              by {alert.acknowledgedBy}
                            </Text>
                          )}
                        </>
                      )}
                      {alert.resolvedAt && (
                        <>
                          <Divider style={{ margin: '8px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                              <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                              <Text type="secondary">Resolved</Text>
                            </Space>
                            <Text style={{ color: token.colorSuccess }}>
                              {alert.resolvedAt.toDate ? 
                                alert.resolvedAt.toDate().toLocaleString() : 
                                'N/A'}
                            </Text>
                          </div>
                          {alert.resolvedBy && (
                            <Text type="secondary" style={{ fontSize: 11, paddingLeft: 24 }}>
                              by {alert.resolvedBy}
                            </Text>
                          )}
                          {alert.resolutionNotes && (
                            <Card size="small" style={{ marginTop: 8, background: '#f0f0f0' }}>
                              <Text style={{ fontSize: 12 }}>{alert.resolutionNotes}</Text>
                            </Card>
                          )}
                        </>
                      )}
                    </Space>
                  </Card>
                </Space>
              ),
            },
            {
              key: 'resolve',
              label: 'Resolve',
              disabled: alert.status === 'Resolved',
              children: (
                <div style={{ paddingBottom: 24 }}>
                  <Card size="small">
                    <Space style={{ fontSize: 14, marginBottom: 16 }}>
                      <InfoCircleOutlined style={{ color: token.colorInfo }} />
                      <Text strong>Resolve This Alert</Text>
                    </Space>
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={handleResolve}
                    >
                      <Form.Item
                        name="notes"
                        label="Resolution Notes (Optional)"
                        extra="Describe the actions taken to resolve this alert"
                      >
                        <TextArea
                          rows={4}
                          placeholder="Example: Replaced filter cartridge, water quality returned to normal levels."
                          style={{ fontSize: 13 }}
                        />
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<CheckCircleOutlined />}
                          size="large"
                          block
                          loading={resolving}
                          disabled={resolving}
                          style={{ 
                            background: token.colorSuccess,
                            borderColor: token.colorSuccess,
                            height: 44
                          }}
                        >
                          {resolving ? 'Resolving...' : 'Mark as Resolved'}
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Drawer>
  );
};
