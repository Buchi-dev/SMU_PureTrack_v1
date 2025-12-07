/**
 * StaffAlerts - Alert Management View for Staff Role
 * Displays and manages water quality alerts
 * 
 * Architecture: Uses global hooks useAlerts(), useDevices()
 */

import { useState, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  Statistic,
  Modal,
  Input,
  Typography,
  Empty,
  Tooltip,
  message,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  EyeOutlined,
  AlertOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { ALERT_STATUS } from '../../../constants';
import { useThemeToken } from '../../../theme';
import { useAlerts, useAlertMutations, useTableScroll, useResponsive } from '../../../hooks';
import { PageHeader } from '../../../components/staff';
import CompactAlertStats from './components/CompactAlertStats';
import { getSeverityColor } from '../../../schemas';
import type { WaterQualityAlert } from '../../../schemas';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;
const { TextArea } = Input;

/**
 * StaffAlerts component - displays all water quality alerts
 */
export const StaffAlerts = () => {
  const token = useThemeToken();
  const { isMobile } = useResponsive();
  const tableScroll = useTableScroll({ offsetHeight: 450 });
  
  // State for filters and modals
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [parameterFilter, setParameterFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<WaterQualityAlert | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolveAllModalVisible, setResolveAllModalVisible] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ✅ GLOBAL HOOKS - Real-time alert data via WebSocket
  // Pass filters to backend for server-side filtering
  const { 
    alerts: filteredAlerts,
    stats,
    isLoading, 
    refetch 
  } = useAlerts({ 
    filters: {
      status: statusFilter !== 'all' ? statusFilter as any : undefined,
      severity: severityFilter !== 'all' ? severityFilter as any : undefined,
      parameter: parameterFilter !== 'all' ? parameterFilter as any : undefined,
    },
    // 🔥 NO POLLING - WebSocket broadcasts alert:new/resolved instantly
  });
  
  const { 
    acknowledgeAlert, 
    resolveAlert, 
    resolveAllAlerts,
    isLoading: mutationLoading 
  } = useAlertMutations();

  // Handle refresh with loading state
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refetch();
      setTimeout(() => setIsRefreshing(false), 500);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
    }
  };

  // ✅ Use backend-provided stats instead of client-side calculation
  // Backend returns aggregated statistics with the filtered data
  const filteredStats = useMemo(() => {
    if (!stats) {
      return {
        total: filteredAlerts.length,
        active: 0,
        acknowledged: 0,
        resolved: 0,
        critical: 0,
        warning: 0,
        advisory: 0,
      };
    }

    // Map backend stats to UI display format
    const byStatus = stats.byStatus.reduce((acc, item) => {
      acc[item._id.toLowerCase()] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = stats.bySeverity.reduce((acc, item) => {
      acc[item._id.toLowerCase()] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: filteredAlerts.length,
      active: byStatus['unacknowledged'] || 0,
      acknowledged: byStatus['acknowledged'] || 0,
      resolved: byStatus['resolved'] || 0,
      critical: bySeverity['critical'] || 0,
      warning: bySeverity['warning'] || 0,
      advisory: bySeverity['advisory'] || 0,
    };
  }, [filteredAlerts.length, stats]);

  // Handle alert acknowledgment
  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      message.success('Alert acknowledged successfully');
      await refetch();
    } catch (error) {
      message.error('Failed to acknowledge alert');
      console.error('Acknowledge error:', error);
    }
  };

  // Handle alert resolution
  const handleResolve = async () => {
    if (!selectedAlert) return;
    
    try {
      await resolveAlert(selectedAlert.alertId, resolutionNotes);
      message.success('Alert resolved successfully');
      setResolveModalVisible(false);
      setResolutionNotes('');
      setSelectedAlert(null);
      await refetch();
    } catch (error) {
      message.error('Failed to resolve alert');
      console.error('Resolve error:', error);
    }
  };

  // Handle resolve all alerts
  const handleResolveAll = async () => {
    try {
      // Build filters based on current filter state
      const filters: { severity?: string; parameter?: string } = {};
      if (severityFilter !== 'all') {
        filters.severity = severityFilter;
      }
      if (parameterFilter !== 'all') {
        filters.parameter = parameterFilter;
      }

      const result = await resolveAllAlerts(resolutionNotes, filters);
      message.success(`Successfully resolved ${result.resolvedCount} alert(s)`);
      setResolveAllModalVisible(false);
      setResolutionNotes('');
      await refetch();
    } catch (error) {
      message.error('Failed to resolve all alerts');
      console.error('Resolve all error:', error);
    }
  };

  // Open alert details modal
  const handleViewDetails = (alert: WaterQualityAlert) => {
    setSelectedAlert(alert);
    setDetailsModalVisible(true);
  };

  // Open resolve modal
  const handleOpenResolveModal = (alert: WaterQualityAlert) => {
    setSelectedAlert(alert);
    setResolveModalVisible(true);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return 'Invalid date';
    }
  };

  // Get time since alert
  const getTimeSince = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    try {
      const now = Date.now();
      const alertTime = timestamp?.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
      const diff = now - alertTime;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    } catch {
      return 'N/A';
    }
  };

  // Get status icon and color
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Active':
        return { 
          icon: <ExclamationCircleOutlined />, 
          color: token.colorError,
          bgColor: '#fff1f0'
        };
      case 'Acknowledged':
        return { 
          icon: <CheckCircleOutlined />, 
          color: token.colorWarning,
          bgColor: '#fffbe6'
        };
      case 'Resolved':
        return { 
          icon: <CloseCircleOutlined />, 
          color: token.colorSuccess,
          bgColor: '#f6ffed'
        };
      default:
        return { 
          icon: <BellOutlined />, 
          color: token.colorTextSecondary,
          bgColor: '#fafafa'
        };
    }
  };

  // Table columns definition
  const mobileColumns: ColumnsType<WaterQualityAlert> = useMemo(() => [
    {
      title: 'Alert',
      key: 'alert',
      ellipsis: false,
      render: (_, record) => {
        const statusConfig = getStatusConfig(record.status);
        
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space size={4} wrap>
              <Text strong style={{ fontSize: '12px', wordBreak: 'break-word' }}>
                {record.deviceName || record.deviceId}
              </Text>
              <Tag 
                icon={statusConfig.icon} 
                color={statusConfig.color}
                style={{ fontSize: '9px', margin: 0 }}
              >
                {record.status}
              </Tag>
            </Space>
            <Space size={4} wrap>
              <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>
                {record.parameter.toUpperCase()}
              </Tag>
              <Text strong style={{ fontSize: '11px', color: getSeverityColor(record.severity) }}>
                {(record.currentValue ?? record.value) !== undefined 
                  ? (record.currentValue ?? record.value).toFixed(2) 
                  : 'N/A'}
              </Text>
            </Space>
            {(record.deviceBuilding || record.deviceFloor) && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                📍 {[record.deviceBuilding, record.deviceFloor].filter(Boolean).join(', ')}
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {getTimeSince(record.createdAt)}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Severity',
      key: 'severity',
      width: 50,
      align: 'center' as const,
      render: (_, record) => {
        const severityConfig = {
          Critical: { color: token.colorError, icon: <AlertOutlined /> },
          Warning: { color: token.colorWarning, icon: <WarningOutlined /> },
          Advisory: { color: token.colorInfo, icon: <InfoCircleOutlined /> },
        };
        const config = severityConfig[record.severity as keyof typeof severityConfig];
        
        return (
          <div style={{ fontSize: '24px', color: config.color }}>
            {config.icon}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      align: 'center' as const,
      render: (_, record) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            block
            style={{ height: '32px' }}
          >
            View
          </Button>
        </Space>
      ),
    },
  ], [token, isMobile]);

  const columns: ColumnsType<WaterQualityAlert> = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return (
          <Tag 
            icon={config.icon} 
            color={config.color}
            style={{ fontWeight: 500 }}
          >
            {status}
          </Tag>
        );
      },
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Acknowledged', value: 'Acknowledged' },
        { text: 'Resolved', value: 'Resolved' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 110,
      render: (severity: 'Critical' | 'Warning' | 'Advisory') => (
        <Tag color={getSeverityColor(severity)} style={{ fontWeight: 500 }}>
          {severity}
        </Tag>
      ),
      filters: [
        { text: 'Critical', value: 'Critical' },
        { text: 'Warning', value: 'Warning' },
        { text: 'Advisory', value: 'Advisory' },
      ],
      onFilter: (value, record) => record.severity === value,
    },
    {
      title: 'Parameter',
      dataIndex: 'parameter',
      key: 'parameter',
      width: 110,
      render: (parameter: string) => (
        <Tag color="blue" style={{ fontWeight: 500 }}>
          {parameter.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Device',
      key: 'device',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.deviceName || record.deviceId}</Text>
          {(record.deviceBuilding || record.deviceFloor) && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              📍 {[record.deviceBuilding, record.deviceFloor].filter(Boolean).join(', ')}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string, record) => (
        <Tooltip title={message || `${record.parameter.toUpperCase()} alert detected`}>
          <Text>{message || `${record.parameter.toUpperCase()} alert detected`}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Current Value',
      key: 'currentValue',
      width: 120,
      render: (_, record) => {
        const value = record.currentValue ?? record.value;
        return (
          <Text strong style={{ color: getSeverityColor(record.severity) }}>
            {value !== undefined ? value.toFixed(2) : 'N/A'}
          </Text>
        );
      },
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (createdAt: any) => (
        <Tooltip title={formatTimestamp(createdAt)}>
          <Text type="secondary">{getTimeSince(createdAt)}</Text>
        </Tooltip>
      ),
      sorter: (a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      },
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            Details
          </Button>
          {record.status === ALERT_STATUS.UNACKNOWLEDGED && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleAcknowledge(record.alertId)}
              loading={mutationLoading}
            >
              Acknowledge
            </Button>
          )}
          {(record.status === ALERT_STATUS.UNACKNOWLEDGED || record.status === ALERT_STATUS.ACKNOWLEDGED) && (
            <Button
              size="small"
              type="default"
              style={{ color: token.colorSuccess, borderColor: token.colorSuccess }}
              icon={<CloseCircleOutlined />}
              onClick={() => handleOpenResolveModal(record)}
              loading={mutationLoading}
            >
              Resolve
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <StaffLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Page Header */}
        <PageHeader
          title="Alert Management"
          subtitle="Monitor and manage water quality alerts"
          icon={<BellOutlined />}
          badge={filteredStats.active}
          loading={isRefreshing}
          onRefresh={handleRefresh}
        />

        {/* Statistics Cards */}
        <CompactAlertStats stats={filteredStats} />

        {/* Filters */}
        <Card>
          <Space size="middle" wrap>
            <Space>
              <FilterOutlined style={{ color: token.colorPrimary }} />
              <Text strong>Filters:</Text>
            </Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'Active' },
                { label: 'Acknowledged', value: 'Acknowledged' },
                { label: 'Resolved', value: 'Resolved' },
              ]}
            />
            <Select
              value={severityFilter}
              onChange={setSeverityFilter}
              style={{ width: 150 }}
              options={[
                { label: 'All Severity', value: 'all' },
                { label: 'Critical', value: 'Critical' },
                { label: 'Warning', value: 'Warning' },
                { label: 'Advisory', value: 'Advisory' },
              ]}
            />
            <Select
              value={parameterFilter}
              onChange={setParameterFilter}
              style={{ width: 150 }}
              options={[
                { label: 'All Parameters', value: 'all' },
                { label: 'TDS', value: 'tds' },
                { label: 'pH', value: 'ph' },
                { label: 'Turbidity', value: 'turbidity' },
              ]}
            />
            {(statusFilter !== 'all' || severityFilter !== 'all' || parameterFilter !== 'all') && (
              <Button
                size="small"
                onClick={() => {
                  setStatusFilter('all');
                  setSeverityFilter('all');
                  setParameterFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </Space>
        </Card>

        {/* Alerts Table */}
        <Card
          title={
            <Space>
              <BellOutlined />
              <Text strong>Alerts ({filteredAlerts.length})</Text>
            </Space>
          }
          extra={
            <Space>
              {(statusFilter !== 'Resolved' && filteredAlerts.length > 0) && (
                <Button
                  type="primary"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => setResolveAllModalVisible(true)}
                  disabled={mutationLoading}
                >
                  Resolve All Alerts
                </Button>
              )}
            </Space>
          }
        >
          <Table
            columns={isMobile ? mobileColumns : columns}
            dataSource={filteredAlerts}
            rowKey="alertId"
            loading={isLoading}
            scroll={isMobile ? undefined : tableScroll}
            size={isMobile ? 'small' : 'middle'}
            bordered={!isMobile}
            pagination={isMobile ? {
              pageSize: 5,
              simple: true,
            } : {
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} alerts`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No alerts found"
                />
              ),
            }}
          />
        </Card>

        {/* Alert Details Modal */}
        <Modal
          title={
            <Space>
              <BellOutlined />
              <span>Alert Details</span>
            </Space>
          }
          open={detailsModalVisible}
          onCancel={() => {
            setDetailsModalVisible(false);
            setSelectedAlert(null);
          }}
          footer={[
            <Button key="close" onClick={() => setDetailsModalVisible(false)}>
              Close
            </Button>,
            selectedAlert?.status === ALERT_STATUS.UNACKNOWLEDGED && (
              <Button
                key="acknowledge"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  handleAcknowledge(selectedAlert.alertId);
                  setDetailsModalVisible(false);
                }}
                loading={mutationLoading}
              >
                Acknowledge
              </Button>
            ),
            (selectedAlert?.status === ALERT_STATUS.UNACKNOWLEDGED || selectedAlert?.status === ALERT_STATUS.ACKNOWLEDGED) && (
              <Button
                key="resolve"
                type="primary"
                style={{ background: token.colorSuccess }}
                icon={<CloseCircleOutlined />}
                onClick={() => {
                  setDetailsModalVisible(false);
                  handleOpenResolveModal(selectedAlert);
                }}
                loading={mutationLoading}
              >
                Resolve
              </Button>
            ),
          ]}
          width={700}
        >
          {selectedAlert && (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Status"
                    value={selectedAlert.status}
                    valueStyle={{ color: getStatusConfig(selectedAlert.status).color }}
                    prefix={getStatusConfig(selectedAlert.status).icon}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Severity"
                    value={selectedAlert.severity}
                    valueStyle={{ color: getSeverityColor(selectedAlert.severity) }}
                  />
                </Col>
              </Row>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Parameter</Text>
                    <div>
                      <Tag color="blue">{selectedAlert.parameter.toUpperCase()}</Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Alert Type</Text>
                    <div>
                      <Tag>{selectedAlert.alertType}</Tag>
                    </div>
                  </div>
                </Col>
              </Row>
              <div>
                <Text type="secondary">Device</Text>
                <div>
                  <Text strong>{selectedAlert.deviceName || selectedAlert.deviceId}</Text>
                  {(selectedAlert.deviceBuilding || selectedAlert.deviceFloor) && (
                    <div>
                      <Text type="secondary">
                        📍 {[selectedAlert.deviceBuilding, selectedAlert.deviceFloor].filter(Boolean).join(', ')}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Text type="secondary">Message</Text>
                <div>
                  <Text>{selectedAlert.message || `${selectedAlert.parameter.toUpperCase()} alert detected`}</Text>
                </div>
              </div>
              {selectedAlert.recommendedAction && (
                <div>
                  <Text type="secondary">Recommended Action</Text>
                  <div>
                    <Text>{selectedAlert.recommendedAction}</Text>
                  </div>
                </div>
              )}
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Current Value</Text>
                    <div>
                      <Text strong style={{ color: getSeverityColor(selectedAlert.severity) }}>
                        {(selectedAlert.currentValue ?? selectedAlert.value)?.toFixed(2) || 'N/A'}
                      </Text>
                    </div>
                  </div>
                </Col>
                {selectedAlert.thresholdValue !== null && selectedAlert.thresholdValue !== undefined && (
                  <Col span={12}>
                    <div>
                      <Text type="secondary">Threshold Value</Text>
                      <div>
                        <Text>{selectedAlert.thresholdValue.toFixed(2)}</Text>
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
              {selectedAlert.trendDirection && (
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div>
                      <Text type="secondary">Trend Direction</Text>
                      <div>
                        <Tag>{selectedAlert.trendDirection}</Tag>
                      </div>
                    </div>
                  </Col>
                  {selectedAlert.changeRate !== undefined && (
                    <Col span={12}>
                      <div>
                        <Text type="secondary">Change Rate</Text>
                        <div>
                          <Text>{selectedAlert.changeRate.toFixed(2)}</Text>
                        </div>
                      </div>
                    </Col>
                  )}
                </Row>
              )}
              <div>
                <Text type="secondary">Created At</Text>
                <div>
                  <Text>{formatTimestamp(selectedAlert.createdAt)}</Text>
                </div>
              </div>
              {selectedAlert.acknowledgedAt && (
                <div>
                  <Text type="secondary">Acknowledged At</Text>
                  <div>
                    <Text>{formatTimestamp(selectedAlert.acknowledgedAt)}</Text>
                    {selectedAlert.acknowledgedBy && (
                      <Text type="secondary"> by {selectedAlert.acknowledgedBy}</Text>
                    )}
                  </div>
                </div>
              )}
              {selectedAlert.resolvedAt && (
                <div>
                  <Text type="secondary">Resolved At</Text>
                  <div>
                    <Text>{formatTimestamp(selectedAlert.resolvedAt)}</Text>
                    {selectedAlert.resolvedBy && (
                      <Text type="secondary"> by {selectedAlert.resolvedBy}</Text>
                    )}
                  </div>
                </div>
              )}
              {selectedAlert.resolutionNotes && (
                <div>
                  <Text type="secondary">Resolution Notes</Text>
                  <div>
                    <Text>{selectedAlert.resolutionNotes}</Text>
                  </div>
                </div>
              )}
            </Space>
          )}
        </Modal>

        {/* Resolve Alert Modal */}
        <Modal
          title={
            <Space>
              <CloseCircleOutlined />
              <span>Resolve Alert</span>
            </Space>
          }
          open={resolveModalVisible}
          onOk={handleResolve}
          onCancel={() => {
            setResolveModalVisible(false);
            setResolutionNotes('');
            setSelectedAlert(null);
          }}
          okText="Resolve"
          okButtonProps={{ 
            icon: <CloseCircleOutlined />,
            loading: mutationLoading,
            style: { background: token.colorSuccess }
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text>
              Are you sure you want to resolve this alert?
            </Text>
            {selectedAlert && (
              <div>
                <Tag color={getSeverityColor(selectedAlert.severity)}>
                  {selectedAlert.severity}
                </Tag>
                <Tag color="blue">{selectedAlert.parameter.toUpperCase()}</Tag>
                <div style={{ marginTop: 8 }}>
                  <Text strong>{selectedAlert.deviceName || selectedAlert.deviceId}</Text>
                </div>
              </div>
            )}
            <div>
              <Text strong>Resolution Notes (Optional)</Text>
              <TextArea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution notes..."
                style={{ marginTop: 8 }}
              />
            </div>
          </Space>
        </Modal>

        {/* Resolve All Alerts Modal */}
        <Modal
          title={
            <Space>
              <CloseCircleOutlined />
              <span>Resolve All Alerts</span>
            </Space>
          }
          open={resolveAllModalVisible}
          onOk={handleResolveAll}
          onCancel={() => {
            setResolveAllModalVisible(false);
            setResolutionNotes('');
          }}
          okText="Resolve All"
          okButtonProps={{ 
            icon: <CloseCircleOutlined />,
            loading: mutationLoading,
            danger: true,
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text strong style={{ color: token.colorWarning }}>
              ⚠️ Are you sure you want to resolve all alerts?
            </Text>
            <Text>
              This action will resolve <Text strong>{filteredAlerts.filter(a => a.status !== ALERT_STATUS.RESOLVED).length}</Text> unresolved alert(s).
            </Text>
            {(severityFilter !== 'all' || parameterFilter !== 'all') && (
              <div style={{ 
                padding: 12, 
                background: token.colorInfoBg, 
                borderRadius: 6,
                border: `1px solid ${token.colorInfoBorder}`
              }}>
                <Text strong>Active Filters:</Text>
                <div style={{ marginTop: 8 }}>
                  {severityFilter !== 'all' && (
                    <Tag color={getSeverityColor(severityFilter as any)}>
                      {severityFilter}
                    </Tag>
                  )}
                  {parameterFilter !== 'all' && (
                    <Tag color="blue">{parameterFilter.toUpperCase()}</Tag>
                  )}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Only alerts matching these filters will be resolved.
                </Text>
              </div>
            )}
            <div>
              <Text strong>Resolution Notes (Optional)</Text>
              <TextArea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution notes for all alerts..."
                style={{ marginTop: 8 }}
              />
            </div>
          </Space>
        </Modal>
      </Space>
    </StaffLayout>
  );
};
