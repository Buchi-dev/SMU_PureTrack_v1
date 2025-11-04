/**
 * Manage Alerts Page
 * View, manage, and configure water quality alerts
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Typography,
  Statistic,
  Row,
  Col,
  message,
  Drawer,
  Form,
  Divider,
  Tooltip,
  Empty,
} from 'antd';
import { useThemeToken } from '../../../theme';
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  EyeOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  TabletOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { alertsService } from '../../../services/alerts.Service';
import type {
  WaterQualityAlert,
  AlertFiltersExtended,
} from '../../../schemas';
import {
  getParameterUnit,
  getParameterName,
  getSeverityColor,
  getStatusColor,
} from '../../../schemas';
import { AdminLayout } from '../../../components/layouts/AdminLayout';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const AdminAlerts = () => {
  const token = useThemeToken();
  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<WaterQualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<WaterQualityAlert | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [filters, setFilters] = useState<AlertFiltersExtended>({});

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
    advisory: 0,
  });

  // Calculate statistics
  const calculateStats = (alertsData: WaterQualityAlert[]) => {
    const stats = {
      total: alertsData.length,
      active: alertsData.filter((a) => a.status === 'Active').length,
      acknowledged: alertsData.filter((a) => a.status === 'Acknowledged').length,
      resolved: alertsData.filter((a) => a.status === 'Resolved').length,
      critical: alertsData.filter((a) => a.severity === 'Critical').length,
      warning: alertsData.filter((a) => a.severity === 'Warning').length,
      advisory: alertsData.filter((a) => a.severity === 'Advisory').length,
    };
    setStats(stats);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    message.info('Filters cleared');
  };

  // Auto-apply filters when alerts or filters change
  useEffect(() => {
    let filtered = [...alerts];

    if (filters.severity?.length) {
      filtered = filtered.filter((a) => filters.severity!.includes(a.severity));
    }

    if (filters.status?.length) {
      filtered = filtered.filter((a) => filters.status!.includes(a.status));
    }

    if (filters.parameter?.length) {
      filtered = filtered.filter((a) => filters.parameter!.includes(a.parameter));
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.message.toLowerCase().includes(term) ||
          a.deviceName?.toLowerCase().includes(term) ||
          a.deviceId.toLowerCase().includes(term)
      );
    }

    setFilteredAlerts(filtered);
    calculateStats(filtered);
  }, [alerts, filters]);

  // WRITE: Acknowledge alert via Cloud Function
  const acknowledgeAlert = async (alertId: string) => {
    try {
      await alertsService.acknowledgeAlert(alertId);
      message.success('Alert acknowledged successfully');
    } catch (error: any) {
      console.error('Error acknowledging alert:', error);
      message.error(error.message || 'Failed to acknowledge alert');
    }
  };

  // WRITE: Resolve alert via Cloud Function
  const resolveAlert = async (alertId: string, notes?: string) => {
    try {
      await alertsService.resolveAlert(alertId, notes);
      message.success('Alert resolved successfully');
      setDetailsVisible(false);
    } catch (error: any) {
      console.error('Error resolving alert:', error);
      message.error(error.message || 'Failed to resolve alert');
    }
  };

  const viewAlertDetails = (alert: WaterQualityAlert) => {
    setSelectedAlert(alert);
    setDetailsVisible(true);
  };

  // READ: Subscribe to real-time alerts from Firestore
  useEffect(() => {
    const unsubscribe = alertsService.subscribeToAlerts(
      (alertsData) => {
        setAlerts(alertsData);
        setFilteredAlerts(alertsData);
        calculateStats(alertsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading alerts:', error);
        message.error('Failed to load alerts');
        setLoading(false);
      },
      100 // Get more alerts for management page
    );

    return () => unsubscribe();
  }, []);

  // Table columns
  const columns: ColumnsType<WaterQualityAlert> = [
    {
      title: 'Alert Status',
      key: 'alertStatus',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={getSeverityColor(record.severity)} icon={<WarningOutlined />}>
            {record.severity}
          </Tag>
          <Tag 
            color={getStatusColor(record.status)} 
            icon={
              record.status === 'Active' ? <ExclamationCircleOutlined /> :
              record.status === 'Acknowledged' ? <CheckCircleOutlined /> :
              <CloseCircleOutlined />
            }
          >
            {record.status}
          </Tag>
        </Space>
      ),
      sorter: (a, b) => {
        const order = { Critical: 3, Warning: 2, Advisory: 1 };
        return order[a.severity] - order[b.severity];
      },
    },
    {
      title: 'Measurement',
      key: 'measurement',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '12px' }}>{record.parameter.toUpperCase()}</Text>
          <Text strong style={{ color: getSeverityColor(record.severity) }}>
            {record.currentValue.toFixed(2)} {getParameterUnit(record.parameter)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Device & Location',
      key: 'deviceLocation',
      width: 220,
      render: (_, record) => {
        const locationText = [record.deviceBuilding, record.deviceFloor]
          .filter(Boolean)
          .join(', ');
        return (
          <Space direction="vertical" size={2}>
            <Tooltip title={record.deviceId}>
              <Text strong ellipsis>{record.deviceName || record.deviceId}</Text>
            </Tooltip>
            {locationText ? (
              <Space size={4}>
                <EnvironmentOutlined style={{ fontSize: '10px', color: token.colorTextTertiary }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {locationText}
                </Text>
              </Space>
            ) : (
              <Text type="secondary" italic style={{ fontSize: '12px' }}>No location</Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Alert Details',
      key: 'alertDetails',
      ellipsis: true,
      render: (_, record) => {
        let timeStr = 'N/A';
        if (record.createdAt?.toDate) {
          try {
            const date = record.createdAt.toDate();
            timeStr = date.toLocaleString();
          } catch (error) {
            console.error('Error formatting timestamp:', error);
          }
        }
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Text ellipsis>{record.message}</Text>
            <Space size={4}>
              <ClockCircleOutlined style={{ fontSize: '10px', color: token.colorTextTertiary }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {timeStr}
              </Text>
            </Space>
          </Space>
        );
      },
      sorter: (a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="View Details" getPopupContainer={(trigger) => trigger.parentElement || document.body}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => viewAlertDetails(record)}
            >
              View
            </Button>
          </Tooltip>
          {record.status === 'Active' && (
            <Tooltip title="Acknowledge Alert" getPopupContainer={(trigger) => trigger.parentElement || document.body}>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => acknowledgeAlert(record.alertId)}
              >
                Acknowledge
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div>
        <Title level={2}>
          <BellOutlined /> Water Quality Alerts
        </Title>
        <Text type="secondary">
          Monitor and manage real-time water quality alerts
        </Text>

        {/* Statistics */}
        <Row gutter={16} style={{ marginTop: 24, marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Alerts"
                value={stats.total}
                prefix={<BellOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Alerts"
                value={stats.active}
                valueStyle={{ color: token.colorError }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Critical Alerts"
                value={stats.critical}
                valueStyle={{ color: token.colorError }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Resolved"
                value={stats.resolved}
                valueStyle={{ color: token.colorSuccess }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters and Actions */}
        <Card style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Search alerts..."
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              allowClear
            />
            <Select
              mode="multiple"
              placeholder="Severity"
              style={{ minWidth: 150 }}
              value={filters.severity}
              onChange={(value) => setFilters({ ...filters, severity: value })}
              options={[
                { label: 'Critical', value: 'Critical' },
                { label: 'Warning', value: 'Warning' },
                { label: 'Advisory', value: 'Advisory' },
              ]}
            />
            <Select
              mode="multiple"
              placeholder="Status"
              style={{ minWidth: 150 }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              options={[
                { label: 'Active', value: 'Active' },
                { label: 'Acknowledged', value: 'Acknowledged' },
                { label: 'Resolved', value: 'Resolved' },
              ]}
            />
            <Select
              mode="multiple"
              placeholder="Parameter"
              style={{ minWidth: 150 }}
              value={filters.parameter}
              onChange={(value) => setFilters({ ...filters, parameter: value })}
              options={[
                { label: 'TDS', value: 'tds' },
                { label: 'pH', value: 'ph' },
                { label: 'Turbidity', value: 'turbidity' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={clearFilters}>
              Clear Filters
            </Button>
            <Text type="secondary">
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </Text>
          </Space>
        </Card>

        {/* Alerts Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredAlerts}
            rowKey="alertId"
            loading={loading}
            scroll={{ x: 1200, y: 600 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} alerts`,
            }}
            locale={{
              emptyText: (
                <Empty description="No alerts found">
                  <Text type="secondary">
                    All systems are operating normally
                  </Text>
                </Empty>
              ),
            }}
            sticky
          />
        </Card>

        {/* Alert Details Drawer - Redesigned */}
        <Drawer
          title={
            <Space>
              <WarningOutlined style={{ fontSize: 20 }} />
              <span>Alert Details</span>
            </Space>
          }
          placement="right"
          width={650}
          open={detailsVisible}
          onClose={() => setDetailsVisible(false)}
          styles={{
            body: { padding: 0 }
          }}
        >
          {selectedAlert && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Header Section with Status */}
              <div style={{ 
                padding: '24px 24px 20px', 
                background: `linear-gradient(135deg, ${getSeverityColor(selectedAlert.severity)}15 0%, ${getSeverityColor(selectedAlert.severity)}05 100%)`,
                borderBottom: `3px solid ${getSeverityColor(selectedAlert.severity)}`
              }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Space size={8}>
                    <Tag 
                      color={getSeverityColor(selectedAlert.severity)} 
                      icon={<WarningOutlined />}
                      style={{ fontSize: 14, padding: '4px 12px', fontWeight: 600 }}
                    >
                      {selectedAlert.severity}
                    </Tag>
                    <Tag 
                      color={getStatusColor(selectedAlert.status)}
                      icon={
                        selectedAlert.status === 'Active' ? <ExclamationCircleOutlined /> :
                        selectedAlert.status === 'Acknowledged' ? <CheckCircleOutlined /> :
                        <CloseCircleOutlined />
                      }
                      style={{ fontSize: 14, padding: '4px 12px' }}
                    >
                      {selectedAlert.status}
                    </Tag>
                    <Tag style={{ fontSize: 12, padding: '2px 8px' }}>
                      {selectedAlert.alertType}
                    </Tag>
                  </Space>
                  
                  {/* Quick Actions */}
                  {selectedAlert.status === 'Active' && (
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => acknowledgeAlert(selectedAlert.alertId)}
                      block
                      size="large"
                    >
                      Acknowledge Alert
                    </Button>
                  )}
                </Space>
              </div>

              {/* Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  
                  {/* Alert Message - Prominent */}
                  <div style={{
                    padding: 16,
                    background: token.colorBgContainer,
                    borderLeft: `4px solid ${getSeverityColor(selectedAlert.severity)}`,
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
                      Alert Message
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 15, lineHeight: 1.6 }}>
                        {selectedAlert.message}
                      </Text>
                    </div>
                  </div>

                  {/* Measurement Info - Visual Cards */}
                  <Row gutter={12}>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#f5f5f5' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Parameter</Text>
                        <div style={{ marginTop: 4 }}>
                          <Text strong style={{ fontSize: 16, color: token.colorPrimary }}>
                            {getParameterName(selectedAlert.parameter)}
                          </Text>
                        </div>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" style={{ textAlign: 'center', background: '#f5f5f5' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Current Value</Text>
                        <div style={{ marginTop: 4 }}>
                          <Text strong style={{ 
                            fontSize: 18, 
                            color: getSeverityColor(selectedAlert.severity),
                            fontWeight: 700
                          }}>
                            {selectedAlert.currentValue.toFixed(2)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                            {getParameterUnit(selectedAlert.parameter)}
                          </Text>
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {selectedAlert.thresholdValue && (
                    <Card size="small" style={{ background: '#fff9e6' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Threshold Limit</Text>
                          <div>
                            <Text strong style={{ fontSize: 16 }}>
                              {selectedAlert.thresholdValue} {getParameterUnit(selectedAlert.parameter)}
                            </Text>
                          </div>
                        </div>
                        {selectedAlert.trendDirection && (
                          <Tag color="orange">{selectedAlert.trendDirection}</Tag>
                        )}
                      </Space>
                    </Card>
                  )}

                  <Divider style={{ margin: '8px 0' }} />

                  {/* Device Information */}
                  <div>
                    <Space style={{ fontSize: 14, marginBottom: 12 }}>
                      <TabletOutlined />
                      <Text strong>Device Information</Text>
                    </Space>
                    <Card size="small" bodyStyle={{ padding: 16 }}>
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Device Name</Text>
                          <div>
                            <Text strong>{selectedAlert.deviceName || selectedAlert.deviceId}</Text>
                          </div>
                        </div>
                        {(selectedAlert.deviceBuilding || selectedAlert.deviceFloor) && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Location</Text>
                            <div>
                              <Space size={4}>
                                <EnvironmentOutlined style={{ color: token.colorPrimary }} />
                                <Text>
                                  {[selectedAlert.deviceBuilding, selectedAlert.deviceFloor].filter(Boolean).join(', ')}
                                </Text>
                              </Space>
                            </div>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: token.colorTextTertiary }}>
                          ID: {selectedAlert.deviceId}
                        </div>
                      </Space>
                    </Card>
                  </div>

                  {/* Recommended Action */}
                  <div style={{
                    padding: 16,
                    background: '#fffbe6',
                    border: '1px solid #ffe58f',
                    borderRadius: 8
                  }}>
                    <Space align="start">
                      <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 18, marginTop: 2 }} />
                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>
                          Recommended Action
                        </Text>
                        <Text style={{ fontSize: 14, lineHeight: 1.6 }}>
                          {selectedAlert.recommendedAction}
                        </Text>
                      </div>
                    </Space>
                  </div>

                  <Divider style={{ margin: '8px 0' }} />

                  {/* Timeline */}
                  <div>
                    <Space style={{ fontSize: 14, marginBottom: 12 }}>
                      <ClockCircleOutlined />
                      <Text strong>Timeline</Text>
                    </Space>
                    <Card size="small" bodyStyle={{ padding: 16 }}>
                      <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">Created</Text>
                          <Text strong>
                            {selectedAlert.createdAt?.toDate ? 
                              selectedAlert.createdAt.toDate().toLocaleString() : 
                              'N/A'}
                          </Text>
                        </div>
                        {selectedAlert.acknowledgedAt && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Acknowledged</Text>
                            <Text>
                              {selectedAlert.acknowledgedAt.toDate ? 
                                selectedAlert.acknowledgedAt.toDate().toLocaleString() : 
                                'N/A'}
                            </Text>
                          </div>
                        )}
                        {selectedAlert.resolvedAt && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Resolved</Text>
                            <Text style={{ color: token.colorSuccess }}>
                              {selectedAlert.resolvedAt.toDate ? 
                                selectedAlert.resolvedAt.toDate().toLocaleString() : 
                                'N/A'}
                            </Text>
                          </div>
                        )}
                      </Space>
                    </Card>
                  </div>

                  {/* Notifications */}
                  {selectedAlert.notificationsSent && selectedAlert.notificationsSent.length > 0 && (
                    <Card size="small" style={{ background: '#f6ffed' }}>
                      <Space>
                        <BellOutlined style={{ color: token.colorSuccess }} />
                        <Text>
                          <Text strong style={{ color: token.colorSuccess }}>
                            {selectedAlert.notificationsSent.length}
                          </Text>
                          {' '}user{selectedAlert.notificationsSent.length !== 1 ? 's' : ''} notified
                        </Text>
                      </Space>
                    </Card>
                  )}

                  {/* Resolve Alert Form */}
                  {selectedAlert.status !== 'Resolved' && (
                    <div style={{ 
                      padding: 20, 
                      background: token.colorBgContainer,
                      border: '1px solid #d9d9d9',
                      borderRadius: 8,
                      marginTop: 8
                    }}>
                      <Space style={{ fontSize: 14, marginBottom: 16 }}>
                        <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                        <Text strong>Resolve This Alert</Text>
                      </Space>
                      <Form
                        layout="vertical"
                        onFinish={(values) => resolveAlert(selectedAlert.alertId, values.notes)}
                      >
                        <Form.Item
                          name="notes"
                          label="Resolution Notes"
                          extra="Describe how the issue was resolved or any actions taken"
                        >
                          <TextArea
                            rows={4}
                            placeholder="Example: Checked water filtration system, replaced filter cartridge, water quality returned to normal levels."
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
                            style={{ 
                              background: token.colorSuccess,
                              borderColor: token.colorSuccess,
                              height: 44
                            }}
                          >
                            Mark as Resolved
                          </Button>
                        </Form.Item>
                      </Form>
                    </div>
                  )}
                </Space>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AdminLayout>
  );

};
