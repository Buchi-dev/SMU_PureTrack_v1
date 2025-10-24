import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  DatePicker,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  message,
  Spin,
} from 'antd';
import {
  LineChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useThemeToken } from '../../../theme';
import { deviceApi } from '../../../services/api';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface Reading {
  key: string;
  timestamp: string;
  device: string;
  location: string;
  ph: number;
  tds: number;
  turbidity: number;
  status: 'normal' | 'warning' | 'critical';
}

const StaffReadings = () => {
  const token = useThemeToken();
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<any>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch devices and readings from Firebase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch devices
        const devicesList = await deviceApi.listDevices();
        const deviceNames = devicesList.map(d => d.name || d.deviceId);
        setDevices(deviceNames);
        
        // Fetch readings for all devices
        const allReadings: Reading[] = [];
        
        for (const device of devicesList) {
          try {
            const history = await deviceApi.getSensorHistory(device.deviceId, 50);
            
            history.forEach((reading, index) => {
              // Determine status based on parameter values
              let status: 'normal' | 'warning' | 'critical' = 'normal';
              
              if (reading.ph) {
                if (reading.ph < 6.0 || reading.ph > 9.0) status = 'critical';
                else if (reading.ph < 6.5 || reading.ph > 8.5) status = 'warning';
              }
              
              if (reading.turbidity && reading.turbidity > 5) {
                if (reading.turbidity > 10) status = 'critical';
                else if (status === 'normal') status = 'warning';
              }

              if (reading.tds && reading.tds > 500) {
                if (reading.tds > 1000) status = 'critical';
                else if (status === 'normal') status = 'warning';
              }
              
              allReadings.push({
                key: `${device.deviceId}-${index}`,
                timestamp: reading.timestamp 
                  ? dayjs(reading.timestamp).format('YYYY-MM-DD HH:mm:ss')
                  : dayjs().format('YYYY-MM-DD HH:mm:ss'),
                device: device.name || device.deviceId,
                location: typeof device.metadata?.location === 'string' 
                  ? device.metadata.location 
                  : device.metadata?.location?.building || 'Unknown',
                ph: reading.ph || 0,
                tds: reading.tds || 0,
                turbidity: reading.turbidity || 0,
                status,
              });
            });
          } catch (error) {
            console.error(`Error fetching readings for device ${device.deviceId}:`, error);
          }
        }
        
        // Sort by timestamp (most recent first)
        allReadings.sort((a, b) => dayjs(b.timestamp).unix() - dayjs(a.timestamp).unix());
        
        setReadings(allReadings);
      } catch (error) {
        console.error('Error fetching readings:', error);
        message.error('Failed to load readings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter readings
  const filteredReadings = readings.filter(reading => {
    const matchesDevice = deviceFilter === 'all' || reading.device === deviceFilter;
    const matchesStatus = statusFilter === 'all' || reading.status === statusFilter;
    return matchesDevice && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: readings.length,
    normal: readings.filter(r => r.status === 'normal').length,
    warning: readings.filter(r => r.status === 'warning').length,
    critical: readings.filter(r => r.status === 'critical').length,
  };

  // Get parameter status color
  const getParamColor = (value: number, type: 'ph' | 'tds' | 'turbidity') => {
    const ranges = {
      ph: { min: 6.5, max: 8.5 },
      tds: { min: 0, max: 500 },
      turbidity: { min: 0, max: 5 },
    };
    
    const range = ranges[type];
    if (value < range.min || value > range.max) return token.colorError;
    if (value < range.min + 0.5 || value > range.max - 50) return token.colorWarning;
    return token.colorSuccess;
  };

  const columns: ColumnsType<Reading> = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Device',
      dataIndex: 'device',
      key: 'device',
      render: (text: string, record: Reading) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.location}
          </Text>
        </Space>
      ),
    },
    {
      title: 'pH',
      dataIndex: 'ph',
      key: 'ph',
      render: (value: number) => (
        <Tag color={getParamColor(value, 'ph') === token.colorSuccess ? 'success' : 'error'}>
          {value.toFixed(2)}
        </Tag>
      ),
      sorter: (a, b) => a.ph - b.ph,
    },
    {
      title: 'TDS (ppm)',
      dataIndex: 'tds',
      key: 'tds',
      render: (value: number) => (
        <Tag color={getParamColor(value, 'tds') === token.colorSuccess ? 'success' : 'warning'}>
          {value.toFixed(1)}
        </Tag>
      ),
      sorter: (a, b) => a.tds - b.tds,
    },
    {
      title: 'Turbidity (NTU)',
      dataIndex: 'turbidity',
      key: 'turbidity',
      render: (value: number) => (
        <Tag color={getParamColor(value, 'turbidity') === token.colorSuccess ? 'success' : 'warning'}>
          {value.toFixed(2)}
        </Tag>
      ),
      sorter: (a, b) => a.turbidity - b.turbidity,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          normal: { color: 'success', icon: <CheckCircleOutlined />, text: 'Normal' },
          warning: { color: 'warning', icon: <WarningOutlined />, text: 'Warning' },
          critical: { color: 'error', icon: <ExclamationCircleOutlined />, text: 'Critical' },
        };
        const statusConfig = config[status as keyof typeof config];
        return (
          <Tag icon={statusConfig.icon} color={statusConfig.color}>
            {statusConfig.text}
          </Tag>
        );
      },
    },
  ];

  return (
    <StaffLayout>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>Loading sensor readings...</p>
        </div>
      ) : (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <LineChartOutlined /> Sensor Readings
          </Title>
          <Text type="secondary">
            Real-time water quality sensor data and measurements
          </Text>
        </div>

        {/* Alerts */}
        {stats.critical > 0 && (
          <Alert
            message="Critical Readings Detected"
            description={`${stats.critical} reading(s) have critical parameter values that require immediate attention.`}
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            closable
          />
        )}

        {/* Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Readings"
                value={stats.total}
                prefix={<LineChartOutlined />}
                valueStyle={{ color: token.colorInfo }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Normal"
                value={stats.normal}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: token.colorSuccess }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Warnings"
                value={stats.warning}
                prefix={<WarningOutlined />}
                valueStyle={{ color: token.colorWarning }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Critical"
                value={stats.critical}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: token.colorError }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card>
          <Space wrap size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Device: </Text>
              <Select
                style={{ width: 200 }}
                value={deviceFilter}
                onChange={setDeviceFilter}
                options={[
                  { label: 'All Devices', value: 'all' },
                  ...devices.map(device => ({ label: device, value: device })),
                ]}
              />
            </div>
            <div>
              <Text strong>Status: </Text>
              <Select
                style={{ width: 200 }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: 'All Status', value: 'all' },
                  { label: 'Normal', value: 'normal' },
                  { label: 'Warning', value: 'warning' },
                  { label: 'Critical', value: 'critical' },
                ]}
              />
            </div>
            <div>
              <Text strong>Date Range: </Text>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                showTime
                format="YYYY-MM-DD HH:mm"
              />
            </div>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
            >
              Export Data
            </Button>
          </Space>
        </Card>

        {/* Parameter Reference */}
        <Card title="Parameter Reference Ranges">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" size={0}>
                <Text strong>pH Level</Text>
                <Text type="secondary">Normal: 6.5 - 8.5</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>Critical: {`<6.0 or >9.0`}</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" size={0}>
                <Text strong>TDS (Total Dissolved Solids)</Text>
                <Text type="secondary">Normal: 0 - 500 ppm</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>Critical: {`>1000 ppm`}</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space direction="vertical" size={0}>
                <Text strong>Turbidity</Text>
                <Text type="secondary">Normal: 0 - 5 NTU</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>Critical: {`>10 NTU`}</Text>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Readings Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredReadings}
            pagination={{
              pageSize: 20,
              showTotal: (total) => `Total ${total} readings`,
            }}
          />
        </Card>
      </Space>
      )}
    </StaffLayout>
  );
};

export default StaffReadings;
