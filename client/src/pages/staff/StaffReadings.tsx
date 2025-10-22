import { useState } from 'react';
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
} from 'antd';
import {
  LineChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { StaffLayout } from '../../components/layouts/StaffLayout';
import { useThemeToken } from '../../theme';
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
  temperature: number;
  turbidity: number;
  dissolvedOxygen: number;
  status: 'normal' | 'warning' | 'critical';
}

const StaffReadings = () => {
  const token = useThemeToken();
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<any>(null);

  // Mock readings data
  const readings: Reading[] = [
    {
      key: '1',
      timestamp: dayjs().subtract(5, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      device: 'Device A',
      location: 'North Station',
      ph: 7.2,
      temperature: 25.5,
      turbidity: 3.2,
      dissolvedOxygen: 8.5,
      status: 'normal',
    },
    {
      key: '2',
      timestamp: dayjs().subtract(10, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      device: 'Device B',
      location: 'South Station',
      ph: 8.5,
      temperature: 28.0,
      turbidity: 5.8,
      dissolvedOxygen: 6.2,
      status: 'warning',
    },
    {
      key: '3',
      timestamp: dayjs().subtract(15, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      device: 'Device C',
      location: 'East Station',
      ph: 9.2,
      temperature: 30.5,
      turbidity: 8.5,
      dissolvedOxygen: 4.5,
      status: 'critical',
    },
    {
      key: '4',
      timestamp: dayjs().subtract(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      device: 'Device A',
      location: 'North Station',
      ph: 7.0,
      temperature: 24.8,
      turbidity: 2.9,
      dissolvedOxygen: 8.8,
      status: 'normal',
    },
    {
      key: '5',
      timestamp: dayjs().subtract(25, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
      device: 'Device D',
      location: 'West Station',
      ph: 8.2,
      temperature: 27.5,
      turbidity: 5.2,
      dissolvedOxygen: 7.1,
      status: 'warning',
    },
  ];

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
  const getParamColor = (value: number, type: 'ph' | 'temp' | 'turbidity' | 'do') => {
    const ranges = {
      ph: { min: 6.5, max: 8.5 },
      temp: { min: 20, max: 30 },
      turbidity: { min: 0, max: 5 },
      do: { min: 5, max: 10 },
    };
    
    const range = ranges[type];
    if (value < range.min || value > range.max) return token.colorError;
    if (value < range.min + 0.5 || value > range.max - 0.5) return token.colorWarning;
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
          {value.toFixed(1)}
        </Tag>
      ),
      sorter: (a, b) => a.ph - b.ph,
    },
    {
      title: 'Temperature (°C)',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (value: number) => (
        <Tag color={getParamColor(value, 'temp') === token.colorSuccess ? 'success' : 'warning'}>
          {value.toFixed(1)}
        </Tag>
      ),
      sorter: (a, b) => a.temperature - b.temperature,
    },
    {
      title: 'Turbidity (NTU)',
      dataIndex: 'turbidity',
      key: 'turbidity',
      render: (value: number) => (
        <Tag color={getParamColor(value, 'turbidity') === token.colorSuccess ? 'success' : 'warning'}>
          {value.toFixed(1)}
        </Tag>
      ),
      sorter: (a, b) => a.turbidity - b.turbidity,
    },
    {
      title: 'DO (mg/L)',
      dataIndex: 'dissolvedOxygen',
      key: 'dissolvedOxygen',
      render: (value: number) => (
        <Tag color={getParamColor(value, 'do') === token.colorSuccess ? 'success' : 'warning'}>
          {value.toFixed(1)}
        </Tag>
      ),
      sorter: (a, b) => a.dissolvedOxygen - b.dissolvedOxygen,
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
                  { label: 'Device A', value: 'Device A' },
                  { label: 'Device B', value: 'Device B' },
                  { label: 'Device C', value: 'Device C' },
                  { label: 'Device D', value: 'Device D' },
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
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" size={0}>
                <Text strong>pH Level</Text>
                <Text type="secondary">Normal: 6.5 - 8.5</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" size={0}>
                <Text strong>Temperature</Text>
                <Text type="secondary">Normal: 20 - 30 °C</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" size={0}>
                <Text strong>Turbidity</Text>
                <Text type="secondary">Normal: 0 - 5 NTU</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" size={0}>
                <Text strong>Dissolved Oxygen</Text>
                <Text type="secondary">Normal: 5 - 10 mg/L</Text>
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
    </StaffLayout>
  );
};

export default StaffReadings;
