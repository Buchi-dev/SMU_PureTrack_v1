/**
 * StaffDevices - Device Management View for Staff Role
 * Displays all monitoring devices with status and details
 * 
 * Architecture: Uses global hooks useDevices()
 */

import { useState, useMemo } from 'react';
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
  Skeleton,
} from 'antd';
import {
  ApiOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useThemeToken } from '../../../theme';
import { useDevices } from '../../../hooks';
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

/**
 * StaffDevices component - displays all monitoring devices
 */
export const StaffDevices = () => {
  const navigate = useNavigate();
  const token = useThemeToken();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ✅ GLOBAL HOOK - Real-time device data with SWR polling
  const { devices: realtimeDevices, isLoading, refetch } = useDevices({ 
    pollInterval: 30000 // 30 seconds - use SWR_CONFIG.REFRESH_INTERVAL.FREQUENT for device lists
  });

  // Handle refresh with loading state
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent spam clicks
    
    setIsRefreshing(true);
    try {
      await refetch();
      setTimeout(() => setIsRefreshing(false), 500);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
    }
  };

  // Transform devices for display using centralized uiStatus
  const devices: Device[] = useMemo(() => {
    return realtimeDevices.map((device) => {
      const reading = device.latestReading;
      // Use centralized uiStatus computed by useDevices hook
      const status = device.uiStatus || 'offline';
      
      const uptime = status === 'online' ? '99.5%' : status === 'warning' ? '95.0%' : '0%';
      
      // Format location as string
      let locationStr = 'Unknown';
      if (device.metadata?.location) {
        const loc = device.metadata.location;
        if (typeof loc === 'string') {
          locationStr = loc;
        } else if (loc.building) {
          locationStr = `${loc.building}${loc.floor ? ', ' + loc.floor : ''}`;
        }
      }
      
      return {
        key: device.deviceId,
        id: device.deviceId,
        name: device.name || device.deviceId,
        location: locationStr,
        status,
        lastUpdate: reading?.timestamp 
          ? new Date(reading.timestamp).toLocaleString() 
          : 'No data',
        uptime,
        sensors: ['turbidity', 'tds', 'ph'],
      } as Device;
    });
  }, [realtimeDevices]);

  // Filter devices
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchText.toLowerCase()) ||
                            device.location.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [devices, searchText, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    warning: devices.filter(d => d.status === 'warning').length,
  }), [devices]);

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
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <Space direction="vertical" size={0}>
                <Title level={2} style={{ margin: 0 }}>
                  <ApiOutlined /> Devices
                </Title>
                <Text type="secondary">
                  View and monitor all water quality monitoring devices
                </Text>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={isRefreshing ? <SyncOutlined spin /> : <ReloadOutlined />}
                onClick={handleRefresh}
                loading={isRefreshing}
                disabled={isRefreshing}
                size="large"
              >
                Refresh Data
              </Button>
            </Col>
          </Row>
        </Card>

        {isLoading ? (
          <>
            {/* Statistics Skeleton */}
            <Row gutter={[16, 16]}>
              {[1, 2, 3, 4].map((i) => (
                <Col xs={24} sm={12} md={8} lg={6} xl={6} key={i}>
                  <Card>
                    <Skeleton active paragraph={{ rows: 1 }} />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Filters Skeleton */}
            <Card>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Skeleton.Input active style={{ width: '100%' }} />
                </Col>
                <Col xs={24} md={8}>
                  <Skeleton.Input active style={{ width: '100%' }} />
                </Col>
              </Row>
            </Card>

            {/* Table Skeleton */}
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </>
        ) : (
          <>
        {/* Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card>
              <Statistic
                title="Total Devices"
                value={stats.total}
                prefix={<ApiOutlined />}
                valueStyle={{ color: token.colorInfo }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card>
              <Statistic
                title="Online"
                value={stats.online}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: token.colorSuccess }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card>
              <Statistic
                title="Warnings"
                value={stats.warning}
                prefix={<WarningOutlined />}
                valueStyle={{ color: token.colorWarning }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
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
        </>
        )}
      </Space>
    </StaffLayout>
  );
};

