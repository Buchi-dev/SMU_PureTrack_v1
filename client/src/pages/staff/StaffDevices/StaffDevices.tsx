import { useState, useEffect } from 'react';
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
  message,
  Spin,
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
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useThemeToken } from '../../../theme';
import { deviceApi } from '../../../services/api';
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
  const token = useThemeToken();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch devices from Firebase
  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const devicesList = await deviceApi.listDevices();
        
        // Transform API data to match component interface
        const transformedDevices = await Promise.all(
          devicesList.map(async (device) => {
            try {
              const readings = await deviceApi.getSensorReadings(device.deviceId);
              
              // Determine status
              let status: 'online' | 'offline' | 'warning' = 'offline';
              if (device.status === 'online' && readings?.timestamp) {
                const timeDiff = Date.now() - readings.timestamp;
                if (timeDiff < 600000) { // 10 minutes
                  status = 'online';
                  // Check for warning conditions
                  if (readings.ph && (readings.ph < 6.5 || readings.ph > 8.5)) status = 'warning';
                  if (readings.turbidity && readings.turbidity > 5) status = 'warning';
                }
              }
              
              // Calculate uptime (mock calculation based on status)
              const uptime = status === 'online' ? '99.5%' : status === 'warning' ? '95.0%' : '0%';
              
              return {
                key: device.deviceId,
                id: device.deviceId,
                name: device.name || device.deviceId,
                location: typeof device.metadata?.location === 'string' 
                  ? device.metadata.location 
                  : device.metadata?.location?.building || 'Unknown',
                status,
                lastUpdate: readings?.timestamp 
                  ? new Date(readings.timestamp).toLocaleString() 
                  : 'No data',
                uptime,
                sensors: device.sensors || ['turbidity', 'tds', 'ph'],
              };
            } catch (error) {
              console.error(`Error processing device ${device.deviceId}:`, error);
              return {
                key: device.deviceId,
                id: device.deviceId,
                name: device.name || device.deviceId,
                location: typeof device.metadata?.location === 'string' 
                  ? device.metadata.location 
                  : device.metadata?.location?.building || 'Unknown',
                status: 'offline' as const,
                lastUpdate: 'No data',
                uptime: '0%',
                sensors: ['turbidity', 'tds', 'ph'],
              };
            }
          })
        );
        
        setDevices(transformedDevices);
      } catch (error) {
        console.error('Error fetching devices:', error);
        message.error('Failed to load devices');
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

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
        <Text style={{ color: parseFloat(uptime) > 95 ? token.colorSuccess : token.colorError }}>
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
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>Loading devices...</p>
        </div>
      ) : (
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
                valueStyle={{ color: token.colorInfo }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Online"
                value={stats.online}
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
      )}
    </StaffLayout>
  );
};

export default StaffDevices;
