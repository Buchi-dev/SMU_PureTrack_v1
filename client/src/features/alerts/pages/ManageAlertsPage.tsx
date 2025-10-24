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
  Badge,
  Tooltip,
  Empty,
} from 'antd';
import { useThemeToken } from '../../../theme';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  EyeOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  WaterQualityAlert,
  AlertSeverity,
  AlertStatus,
  WaterParameter,
  AlertFilters,
} from '../../../types/alerts';
import {
  getParameterName,
  getParameterUnit,
  getSeverityColor,
  getStatusColor,
} from '../../../types/alerts';

import { AdminLayout } from '../../../components/layouts/AdminLayout';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ManageAlerts() {
  const token = useThemeToken();
  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<WaterQualityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<WaterQualityAlert | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [filters, setFilters] = useState<AlertFilters>({});

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
    advisory: 0,
  });

  // Load alerts from Firestore
  const loadAlerts = async () => {
    setLoading(true);
    try {
      const alertsRef = collection(db, 'alerts');
      const q = query(alertsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const alertsData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        alertId: doc.id,
        createdAt: doc.data().createdAt as Timestamp,
      })) as WaterQualityAlert[];

      setAlerts(alertsData);
      setFilteredAlerts(alertsData);
      calculateStats(alertsData);
    } catch (error) {
      console.error('Error loading alerts:', error);
      message.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

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

  // Apply filters
  const applyFilters = () => {
    let filtered = [...alerts];

    if (filters.severity && filters.severity.length > 0) {
      filtered = filtered.filter((a) => filters.severity!.includes(a.severity));
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((a) => filters.status!.includes(a.status));
    }

    if (filters.parameter && filters.parameter.length > 0) {
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
    message.success(`Showing ${filtered.length} alerts`);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setFilteredAlerts(alerts);
    calculateStats(alerts);
    message.info('Filters cleared');
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, {
        status: 'Acknowledged',
        acknowledgedAt: Timestamp.now(),
        acknowledgedBy: 'current-user-id', // Replace with actual user ID
      });
      message.success('Alert acknowledged');
      loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      message.error('Failed to acknowledge alert');
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId: string, notes?: string) => {
    try {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, {
        status: 'Resolved',
        resolvedAt: Timestamp.now(),
        resolvedBy: 'current-user-id', // Replace with actual user ID
        'metadata.resolutionNotes': notes || '',
      });
      message.success('Alert resolved');
      setDetailsVisible(false);
      loadAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      message.error('Failed to resolve alert');
    }
  };

  // View alert details
  const viewAlertDetails = (alert: WaterQualityAlert) => {
    setSelectedAlert(alert);
    setDetailsVisible(true);
  };

  useEffect(() => {
    loadAlerts();

    // Set up real-time listener
    const alertsRef = collection(db, 'alerts');
    const q = query(alertsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        alertId: doc.id,
        createdAt: doc.data().createdAt as Timestamp,
      })) as WaterQualityAlert[];

      setAlerts(alertsData);
      setFilteredAlerts(alertsData);
      calculateStats(alertsData);
    });

    return () => unsubscribe();
  }, []);

  // Table columns
  const columns: ColumnsType<WaterQualityAlert> = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: AlertSeverity) => (
        <Tag color={getSeverityColor(severity)} icon={<WarningOutlined />}>
          {severity}
        </Tag>
      ),
      sorter: (a, b) => {
        const order = { Critical: 3, Warning: 2, Advisory: 1 };
        return order[a.severity] - order[b.severity];
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: AlertStatus) => {
        const icon =
          status === 'Active' ? <ExclamationCircleOutlined /> :
            status === 'Acknowledged' ? <CheckCircleOutlined /> :
              <CloseCircleOutlined />;
        return (
          <Tag color={getStatusColor(status)} icon={icon}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: 'Parameter',
      dataIndex: 'parameter',
      key: 'parameter',
      width: 150,
      render: (param: WaterParameter) => (
        <Text strong>{param.toUpperCase()}</Text>
      ),
    },
    {
      title: 'Device',
      dataIndex: 'deviceName',
      key: 'deviceName',
      ellipsis: true,
      render: (name: string, record) => (
        <Tooltip title={record.deviceId}>
          <Text>{name || record.deviceId}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      width: 180,
      render: (_, record) => {
        if (record.deviceBuilding || record.deviceFloor) {
          const locationText = [record.deviceBuilding, record.deviceFloor]
            .filter(Boolean)
            .join(', ');
          return (
            <Text type="secondary">
              📍 {locationText}
            </Text>
          );
        }
        return <Text type="secondary" italic>Not configured</Text>;
      },
    },
    {
      title: 'Value',
      dataIndex: 'currentValue',
      key: 'currentValue',
      width: 120,
      render: (value: number, record) => (
        <Text strong>
          {value.toFixed(2)} {getParameterUnit(record.parameter)}
        </Text>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (timestamp: Timestamp) => (
        <Text type="secondary">
          {timestamp?.toDate().toLocaleString()}
        </Text>
      ),
      sorter: (a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
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
            <Tooltip title="Acknowledge Alert">
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
              onPressEnter={applyFilters}
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
            <Button type="primary" icon={<FilterOutlined />} onClick={applyFilters}>
              Apply Filters
            </Button>
            <Button icon={<ReloadOutlined />} onClick={clearFilters}>
              Clear
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadAlerts}>
              Refresh
            </Button>
          </Space>
        </Card>

        {/* Alerts Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredAlerts}
            rowKey="alertId"
            loading={loading}
            scroll={{ x: 1200 }}
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
          />
        </Card>

        {/* Alert Details Drawer */}
        <Drawer
          title="Alert Details"
          placement="right"
          width={600}
          open={detailsVisible}
          onClose={() => setDetailsVisible(false)}
          extra={
            <Space>
              {selectedAlert?.status === 'Active' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => acknowledgeAlert(selectedAlert.alertId)}
                >
                  Acknowledge
                </Button>
              )}
            </Space>
          }
        >
          {selectedAlert && (
            <div>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Status and Severity */}
                <Card size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Status:</Text>{' '}
                      <Tag color={getStatusColor(selectedAlert.status)}>
                        {selectedAlert.status}
                      </Tag>
                    </div>
                    <div>
                      <Text type="secondary">Severity:</Text>{' '}
                      <Tag color={getSeverityColor(selectedAlert.severity)}>
                        {selectedAlert.severity}
                      </Tag>
                    </div>
                    <div>
                      <Text type="secondary">Type:</Text>{' '}
                      <Tag>{selectedAlert.alertType}</Tag>
                    </div>
                  </Space>
                </Card>

                {/* Device and Parameter Info */}
                <Card size="small" title="Device Information">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Device:</Text> {selectedAlert.deviceName || selectedAlert.deviceId}
                    </div>
                    {(selectedAlert.deviceBuilding || selectedAlert.deviceFloor) && (
                      <div>
                        <Text strong>Location:</Text>{' '}
                        <Text>
                          📍 {[selectedAlert.deviceBuilding, selectedAlert.deviceFloor].filter(Boolean).join(', ')}
                        </Text>
                      </div>
                    )}
                    <div>
                      <Text strong>Parameter:</Text> {getParameterName(selectedAlert.parameter)}
                    </div>
                    <div>
                      <Text strong>Current Value:</Text>{' '}
                      <Text strong style={{ color: getSeverityColor(selectedAlert.severity) }}>
                        {selectedAlert.currentValue.toFixed(2)} {getParameterUnit(selectedAlert.parameter)}
                      </Text>
                    </div>
                    {selectedAlert.thresholdValue && (
                      <div>
                        <Text strong>Threshold:</Text> {selectedAlert.thresholdValue} {getParameterUnit(selectedAlert.parameter)}
                      </div>
                    )}
                    {selectedAlert.trendDirection && (
                      <div>
                        <Text strong>Trend:</Text> <Tag>{selectedAlert.trendDirection}</Tag>
                      </div>
                    )}
                  </Space>
                </Card>

                {/* Alert Message */}
                <Card size="small" title="Alert Message">
                  <Text>{selectedAlert.message}</Text>
                </Card>

                {/* Recommended Action */}
                <Card size="small" title="Recommended Action" style={{ background: '#fff3cd' }}>
                  <Text>{selectedAlert.recommendedAction}</Text>
                </Card>

                {/* Timestamps */}
                <Card size="small" title="Timeline">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Created:</Text>{' '}
                      {selectedAlert.createdAt?.toDate().toLocaleString()}
                    </div>
                    {selectedAlert.acknowledgedAt && (
                      <div>
                        <Text type="secondary">Acknowledged:</Text>{' '}
                        {selectedAlert.acknowledgedAt.toDate().toLocaleString()}
                      </div>
                    )}
                    {selectedAlert.resolvedAt && (
                      <div>
                        <Text type="secondary">Resolved:</Text>{' '}
                        {selectedAlert.resolvedAt.toDate().toLocaleString()}
                      </div>
                    )}
                  </Space>
                </Card>

                {/* Notifications Sent */}
                {selectedAlert.notificationsSent && selectedAlert.notificationsSent.length > 0 && (
                  <Card size="small" title="Notifications Sent">
                    <Badge
                      count={selectedAlert.notificationsSent.length}
                      style={{ backgroundColor: token.colorSuccess }}
                    >
                      <Text>{selectedAlert.notificationsSent.length} users notified</Text>
                    </Badge>
                  </Card>
                )}

                <Divider />

                {/* Resolve Alert Form */}
                {selectedAlert.status !== 'Resolved' && (
                  <Card size="small" title="Resolve Alert">
                    <Form
                      layout="vertical"
                      onFinish={(values) => resolveAlert(selectedAlert.alertId, values.notes)}
                    >
                      <Form.Item
                        name="notes"
                        label="Resolution Notes (optional)"
                      >
                        <TextArea
                          rows={4}
                          placeholder="Enter any notes about how this alert was resolved..."
                        />
                      </Form.Item>
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<CheckCircleOutlined />}
                          block
                        >
                          Mark as Resolved
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                )}
              </Space>
            </div>
          )}
        </Drawer>
      </div>
    </AdminLayout>
  );
}
