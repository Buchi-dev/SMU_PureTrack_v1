import { Card, Table, Tag, Button, Space, Typography, Tooltip, Empty, message, Modal, Input } from 'antd';
import { useState } from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useThemeToken } from '../../../../theme';
import { useTableScroll } from '../../../../hooks';
import { useResponsive } from '../../../../hooks/useResponsive';
import {
  getParameterUnit,
  getSeverityColor,
  getStatusColor,
  formatAlertValue,
} from '../../../../schemas';
import type { WaterQualityAlert } from '../../../../schemas';
import { ALERT_STATUS } from '../../../../constants';

const { Text } = Typography;
const { TextArea } = Input;

interface AlertsTableProps {
  alerts: WaterQualityAlert[];
  loading: boolean;
  onViewDetails: (alert: WaterQualityAlert) => void;
  onAcknowledge: (alertId: string) => void;
  onBatchAcknowledge?: (alertIds: string[]) => Promise<void>;
  onResolveAll?: (notes?: string, filters?: any) => Promise<{ resolvedCount: number }>;
  currentFilters?: any;
  isAcknowledging?: boolean; // ✅ Updated to boolean for global hook compatibility
}

/**
 * Alerts Table Component
 * Displays alerts in a sortable, paginated table with batch operations
 */
const AlertsTable: React.FC<AlertsTableProps> = ({
  alerts,
  loading,
  onViewDetails,
  onAcknowledge,
  onBatchAcknowledge,
  onResolveAll,
  currentFilters,
}) => {
  const token = useThemeToken();
  const tableScroll = useTableScroll({ offsetHeight: 400 });
  const { isMobile } = useResponsive();
  
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [acknowledgingAlertId, setAcknowledgingAlertId] = useState<string | null>(null);
  const [resolveAllModalVisible, setResolveAllModalVisible] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const handleAcknowledgeClick = async (alertId: string) => {
    setAcknowledgingAlertId(alertId);
    try {
      await onAcknowledge(alertId);
      // Success message is handled in parent component
    } catch (error) {
      // Error is handled in parent component
      console.error('Error acknowledging alert:', error);
    } finally {
      setAcknowledgingAlertId(null);
    }
  };

  const handleBatchAcknowledge = async () => {
    if (!onBatchAcknowledge || selectedRowKeys.length === 0) return;
    
    setBatchLoading(true);
    try {
      await onBatchAcknowledge(selectedRowKeys as string[]);
      message.success(`${selectedRowKeys.length} alerts acknowledged successfully`);
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('Batch acknowledge error:', error);
      message.error('Failed to acknowledge alerts. Please try again or contact support if the issue persists.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleResolveAll = async () => {
    if (!onResolveAll) return;
    
    setIsResolving(true);
    try {
      await onResolveAll(resolutionNotes, currentFilters);
      setResolveAllModalVisible(false);
      setResolutionNotes('');
      // Success message is handled in parent
    } catch (error) {
      console.error('Resolve all error:', error);
      // Error is handled in parent
    } finally {
      setIsResolving(false);
    }
  };

  // Count unresolved alerts
  const unresolvedCount = alerts.filter(a => a.status !== ALERT_STATUS.RESOLVED).length;

  const rowSelection: TableRowSelection<WaterQualityAlert> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.status !== ALERT_STATUS.UNACKNOWLEDGED,
    }),
  };

  // Mobile-optimized columns (3 columns)
  const mobileColumns: ColumnsType<WaterQualityAlert> = [
    {
      title: 'Alert',
      key: 'alertInfo',
      ellipsis: false,
      render: (_, record) => {
        const deviceDisplayName = record.deviceName || record.deviceId;
        const locationText = record.deviceLocation || 'No location';
        
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space size={4} wrap>
              <Tag 
                color={getSeverityColor(record.severity)} 
                icon={<WarningOutlined />}
                style={{ fontSize: '10px', margin: 0 }}
              >
                {record.severity}
              </Tag>
              <Tag 
                color={getStatusColor(record.status)} 
                style={{ fontSize: '10px', margin: 0 }}
              >
                {record.status}
              </Tag>
            </Space>
            <Text strong style={{ fontSize: '11px', display: 'block', wordBreak: 'break-word' }}>
              {record.parameter.toUpperCase()}: {' '}
              <Text style={{ color: getSeverityColor(record.severity), fontSize: '11px' }}>
                {formatAlertValue(record.currentValue)} {getParameterUnit(record.parameter)}
              </Text>
            </Text>
            <Text style={{ fontSize: '11px', display: 'block', wordBreak: 'break-word' }}>
              {deviceDisplayName}
            </Text>
            <Space size={4}>
              <EnvironmentOutlined style={{ fontSize: '10px', color: token.colorTextTertiary }} />
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {locationText}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Time',
      key: 'time',
      width: 70,
      render: (_, record) => {
        let timeStr = 'N/A';
        try {
          if (record.createdAt?.toDate) {
            const date = record.createdAt.toDate();
            timeStr = date.toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } else if (record.createdAt) {
            const date = new Date(record.createdAt);
            if (!isNaN(date.getTime())) {
              timeStr = date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          } else if (record.timestamp) {
            const date = new Date(record.timestamp);
            if (!isNaN(date.getTime())) {
              timeStr = date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }
        } catch (error) {
          console.error('Error formatting timestamp:', error);
        }
        
        return (
          <Space direction="vertical" size={2} align="center">
            <ClockCircleOutlined style={{ fontSize: '16px', color: token.colorTextTertiary }} />
            <Text style={{ fontSize: '10px', textAlign: 'center', lineHeight: 1.2 }}>
              {timeStr}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewDetails(record)}
            block
            style={{ fontSize: '11px', height: '28px' }}
          >
            View
          </Button>
          {record.status === ALERT_STATUS.UNACKNOWLEDGED && (
            <Button
              type="default"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleAcknowledgeClick(record.id!)}
              loading={acknowledgingAlertId === record.id}
              disabled={acknowledgingAlertId === record.id}
              block
              style={{ fontSize: '11px', height: '28px' }}
            >
              Ack
            </Button>
          )}
        </Space>
      ),
    },
  ];

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
              record.status === ALERT_STATUS.UNACKNOWLEDGED ? <ExclamationCircleOutlined /> :
              record.status === ALERT_STATUS.ACKNOWLEDGED ? <CheckCircleOutlined /> :
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
            {formatAlertValue(record.currentValue)} {getParameterUnit(record.parameter)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Device & Location',
      key: 'deviceLocation',
      width: 220,
      render: (_, record) => {
        const deviceDisplayName = record.deviceName || record.deviceId;
        const locationText = record.deviceLocation || '';
        
        return (
          <Space direction="vertical" size={2}>
            <Tooltip title={record.deviceId}>
              <Text strong ellipsis>{deviceDisplayName}</Text>
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
        try {
          // Handle both Firestore Timestamp and ISO date strings
          if (record.createdAt?.toDate) {
            const date = record.createdAt.toDate();
            timeStr = date.toLocaleString();
          } else if (record.createdAt) {
            const date = new Date(record.createdAt);
            if (!isNaN(date.getTime())) {
              timeStr = date.toLocaleString();
            }
          } else if (record.timestamp) {
            // Fallback to timestamp field if createdAt is missing
            const date = new Date(record.timestamp);
            if (!isNaN(date.getTime())) {
              timeStr = date.toLocaleString();
            }
          }
        } catch (error) {
          console.error('Error formatting timestamp:', error);
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
        // Handle both Firestore Timestamp and ISO date strings
        const getTime = (record: WaterQualityAlert) => {
          if (record.createdAt?.toMillis) {
            return record.createdAt.toMillis();
          } else if (record.createdAt) {
            return new Date(record.createdAt).getTime();
          } else if (record.timestamp) {
            return new Date(record.timestamp).getTime();
          }
          return 0;
        };
        
        const timeA = getTime(a);
        const timeB = getTime(b);
        return timeB - timeA;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="View Details" getPopupContainer={(trigger) => trigger.parentElement || document.body}>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewDetails(record)}
            >
              View
            </Button>
          </Tooltip>
          {record.status === ALERT_STATUS.UNACKNOWLEDGED && (
            <Tooltip title="Acknowledge Alert" getPopupContainer={(trigger) => trigger.parentElement || document.body}>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleAcknowledgeClick(record.id!)}
                loading={acknowledgingAlertId === record.id}
                disabled={acknowledgingAlertId === record.id}
              >
                {acknowledgingAlertId === record.id ? 'Acknowledging...' : 'Acknowledge'}
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      extra={
        onResolveAll && unresolvedCount > 0 && (
          <Button
            type="primary"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => setResolveAllModalVisible(true)}
            disabled={loading || isResolving}
          >
            Resolve All Alerts
          </Button>
        )
      }
    >
      {/* Batch Actions Bar */}
      {selectedRowKeys.length > 0 && onBatchAcknowledge && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            background: token.colorPrimaryBg,
            borderRadius: token.borderRadius,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <CheckOutlined style={{ color: token.colorPrimary }} />
            <Text strong>{selectedRowKeys.length} alert(s) selected</Text>
          </Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleBatchAcknowledge}
            loading={batchLoading}
          >
            Acknowledge Selected
          </Button>
        </div>
      )}

      <Table
        columns={isMobile ? mobileColumns : columns}
        dataSource={alerts}
        rowKey="id"
        loading={loading}
        rowSelection={onBatchAcknowledge && !isMobile ? rowSelection : undefined}
        scroll={isMobile ? undefined : tableScroll}
        bordered={!isMobile}
        size={isMobile ? 'small' : 'middle'}
        pagination={{
          pageSize: isMobile ? 5 : 20,
          showSizeChanger: !isMobile,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} alerts`,
          simple: isMobile,
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
          loading: isResolving,
          danger: true,
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Text strong style={{ color: token.colorWarning }}>
            ⚠️ Are you sure you want to resolve all alerts?
          </Text>
          <Text>
            This action will resolve <Text strong>{unresolvedCount}</Text> unresolved alert(s).
          </Text>
          {currentFilters && (
            (Array.isArray(currentFilters.severity) && currentFilters.severity.length > 0) || 
            (Array.isArray(currentFilters.parameter) && currentFilters.parameter.length > 0)
          ) && (
            <div style={{ 
              padding: 12, 
              background: token.colorInfoBg, 
              borderRadius: 6,
              border: `1px solid ${token.colorInfoBorder}`
            }}>
              <Text strong>Active Filters:</Text>
              <div style={{ marginTop: 8 }}>
                {Array.isArray(currentFilters.severity) && currentFilters.severity.length > 0 && 
                  currentFilters.severity.map((sev: string) => (
                    <Tag key={sev} color={getSeverityColor(sev as any)}>
                      {sev}
                    </Tag>
                  ))
                }
                {Array.isArray(currentFilters.parameter) && currentFilters.parameter.length > 0 && 
                  currentFilters.parameter.map((param: string) => (
                    <Tag key={param} color="blue">{param.toUpperCase()}</Tag>
                  ))
                }
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
    </Card>
  );
};

export default AlertsTable;
