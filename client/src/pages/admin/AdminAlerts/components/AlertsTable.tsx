import { Card, Table, Tag, Button, Space, Typography, Tooltip, Empty, message } from 'antd';
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
import {
  getParameterUnit,
  getSeverityColor,
  getStatusColor,
  formatAlertValue,
} from '../../../../schemas';
import type { WaterQualityAlert } from '../../../../schemas';
import { ALERT_STATUS } from '../../../../constants';

const { Text } = Typography;

interface AlertsTableProps {
  alerts: WaterQualityAlert[];
  loading: boolean;
  onViewDetails: (alert: WaterQualityAlert) => void;
  onAcknowledge: (alertId: string) => void;
  onBatchAcknowledge?: (alertIds: string[]) => Promise<void>;
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
}) => {
  const token = useThemeToken();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [acknowledgingAlertId, setAcknowledgingAlertId] = useState<string | null>(null);

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

  const rowSelection: TableRowSelection<WaterQualityAlert> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.status !== ALERT_STATUS.UNACKNOWLEDGED,
    }),
  };

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
        // Try to extract location from deviceName or use deviceBuilding/Floor if available
        let deviceDisplayName = record.deviceName || record.deviceId;
        let locationText = '';
        
        // Check if we have separate building/floor fields
        if (record.deviceBuilding || record.deviceFloor) {
          locationText = [record.deviceBuilding, record.deviceFloor]
            .filter(Boolean)
            .join(', ');
        } else if (deviceDisplayName) {
          // Try to parse location from deviceName
          // Pattern: "NAME - LOCATION" or "NAME (LOCATION)"
          const dashMatch = deviceDisplayName.match(/^(.+?)\s*-\s*(.+)$/);
          const parenMatch = deviceDisplayName.match(/^(.+?)\s*\((.+)\)$/);
          
          if (dashMatch) {
            deviceDisplayName = dashMatch[1].trim();
            locationText = dashMatch[2].trim();
          } else if (parenMatch) {
            deviceDisplayName = parenMatch[1].trim();
            locationText = parenMatch[2].trim();
          }
        }
        
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
    <Card>
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
        columns={columns}
        dataSource={alerts}
        rowKey="id"
        loading={loading}
        rowSelection={onBatchAcknowledge ? rowSelection : undefined}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} alerts`,
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
  );
};

export default AlertsTable;
