import {
  Card,
  Typography,
  Space,
  Tag,
  Badge,
  Input,
  Select,
  Spin,
  Empty,
  Table,
  Alert as AntAlert,
} from 'antd';
import {
  WarningOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import type {
  WaterQualityAlert,
  WaterQualityAlertSeverity,
  WaterQualityParameter,
} from '../../../../schemas';
import {
  getSeverityColor,
  getParameterName,
  getParameterUnit,
} from '../../../../schemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;
const { Option } = Select;

interface RecentAlertsCardProps {
  alerts: WaterQualityAlert[];
  loading: boolean;
  activeAlerts: number;
  criticalAlerts: number;
  searchText: string;
  alertFilter: WaterQualityAlertSeverity | 'all';
  onSearchChange: (value: string) => void;
  onFilterChange: (value: WaterQualityAlertSeverity | 'all') => void;
}

export const RecentAlertsCard = ({
  alerts,
  loading,
  activeAlerts,
  criticalAlerts,
  searchText,
  alertFilter,
  onSearchChange,
  onFilterChange,
}: RecentAlertsCardProps) => {
  const token = useThemeToken();

  const alertColumns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: WaterQualityAlertSeverity) => (
        <Tag color={getSeverityColor(severity)} icon={<WarningOutlined />}>
          {severity}
        </Tag>
      ),
    },
    {
      title: 'Device',
      dataIndex: 'deviceName',
      key: 'deviceName',
      render: (name: string, record: WaterQualityAlert) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name || record.deviceId}</div>
          {record.deviceBuilding && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.deviceBuilding}
              {record.deviceFloor && `, ${record.deviceFloor}`}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Parameter',
      dataIndex: 'parameter',
      key: 'parameter',
      width: 100,
      render: (param: WaterQualityParameter) => getParameterName(param),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Value',
      key: 'value',
      width: 100,
      render: (record: WaterQualityAlert) => (
        <Text strong>
          {record.currentValue.toFixed(2)} {getParameterUnit(record.parameter)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'red' : status === 'Acknowledged' ? 'orange' : 'green'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (timestamp: any) => {
        const time = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return <Text type="secondary">{dayjs(time).fromNow()}</Text>;
      },
    },
  ];

  return (
    <Card
      title={
        <Space>
          <WarningOutlined style={{ color: token.colorWarning }} />
          <span>Recent Alerts</span>
          <Badge count={activeAlerts} />
        </Space>
      }
      extra={
        <Space>
          <Input
            placeholder="Search alerts..."
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
          />
          <Select
            style={{ width: 150 }}
            value={alertFilter}
            onChange={onFilterChange}
            prefix={<FilterOutlined />}
          >
            <Option value="all">All Severity</Option>
            <Option value="Critical">Critical</Option>
            <Option value="Warning">Warning</Option>
            <Option value="Advisory">Advisory</Option>
          </Select>
        </Space>
      }
      bordered={false}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : alerts.length === 0 ? (
        <Empty description="No alerts found" />
      ) : (
        <>
          {criticalAlerts > 0 && (
            <AntAlert
              message={`${criticalAlerts} Critical Alert${
                criticalAlerts > 1 ? 's' : ''
              } Require Immediate Attention`}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}
          <Table
            columns={alertColumns}
            dataSource={alerts}
            rowKey="alertId"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        </>
      )}
    </Card>
  );
};
