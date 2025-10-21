import { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ApiOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StaffLayout } from '../../components/layouts/StaffLayout';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;

interface Device {
  key: string;
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  lastUpdate: string;
  uptime: string;
  sensors: string[];
}

const StaffDevices = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock device data
  const devices: Device[] = [
    {
      key: '1',
      id: '1',
      name: 'Device A',
      location: 'North Station',
      status: 'online',
      lastUpdate: '2 mins ago',
      uptime: '99.8%',
      sensors: ['pH', 'Temperature', 'Turbidity', 'DO'],
    },
    {
      key: '2',
      id: '2',
      name: 'Device B',
      location: 'South Station',
      status: 'warning',
      lastUpdate: '5 mins ago',
      uptime: '97.2%',
      sensors: ['pH', 'Temperature', 'Turbidity'],
    },
    {
      key: '3',
      id: '3',
      name: 'Device C',
      location: 'East Station',
      status: 'online',
      lastUpdate: '1 min ago',
      uptime: '99.9%',
      sensors: ['pH', 'Temperature', 'Turbidity', 'DO', 'TDS'],
    },
    {
      key: '4',
      id: '4',
      name: 'Device D',
      location: 'West Station',
      status: 'offline',
      lastUpdate: '30 mins ago',
      uptime: '85.3%',
      sensors: ['pH', 'Temperature'],
    },
    {
      key: '5',
      id: '5',
      name: 'Device E',
      location: 'Central Station',
      status: 'online',
      lastUpdate: '3 mins ago',
      uptime: '98.5%',
      sensors: ['pH', 'Temperature', 'Turbidity', 'DO'],
    },
  ];

  // Filter devices
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchText.toLowerCase()) ||
                          device.location.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    warning: devices.filter(d => d.status === 'warning').length,
  };

  const columns: ColumnsType<Device> = [
    {
      title: 'Device Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Device) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.id}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          online: { color: 'success', icon: <CheckCircleOutlined />, text: 'Online' },
          offline: { color: 'default', icon: <ClockCircleOutlined />, text: 'Offline' },
          warning: { color: 'warning', icon: <WarningOutlined />, text: 'Warning' },
        };
        const statusConfig = config[status as keyof typeof config];
        return (
          <Tag icon={statusConfig.icon} color={statusConfig.color}>
            {statusConfig.text}
          </Tag>
        );
      },
    },
    {
      title: 'Sensors',
      dataIndex: 'sensors',
      key: 'sensors',
      render: (sensors: string[]) => (
        <Space wrap>
          {sensors.map(sensor => (
            <Tag key={sensor} color="blue">
              {sensor}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Uptime',
      dataIndex: 'uptime',
      key: 'uptime',
      render: (uptime: string) => (
        <Text style={{ color: parseFloat(uptime) > 95 ? '#52c41a' : '#ff4d4f' }}>
          {uptime}
        </Text>
      ),
    },
    {
      title: 'Last Update',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record: Device) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/staff/devices/${record.id}/readings`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <StaffLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <ApiOutlined /> Devices
          </Title>
          <Text type="secondary">
            View and monitor all water quality monitoring devices
          </Text>
        </div>

        {/* Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Devices"
                value={stats.total}
                prefix={<ApiOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Online"
                value={stats.online}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Warnings"
                value={stats.warning}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Offline"
                value={stats.offline}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#8c8c8c' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters and Search */}
        <Card>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={12}>
              <Search
                placeholder="Search devices by name or location..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col xs={24} md={12}>
              <Space style={{ width: '100%' }}>
                <Text>Filter by Status:</Text>
                <Select
                  style={{ width: 200 }}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { label: 'All Devices', value: 'all' },
                    { label: 'Online', value: 'online' },
                    { label: 'Warning', value: 'warning' },
                    { label: 'Offline', value: 'offline' },
                  ]}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Devices Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredDevices}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Total ${total} devices`,
            }}
          />
        </Card>
      </Space>
    </StaffLayout>
  );
};

export default StaffDevices;
