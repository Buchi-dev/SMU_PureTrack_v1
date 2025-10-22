import { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Alert,
  Progress,
  Spin,
} from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  LineChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StaffLayout } from '../../components/layouts/StaffLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeToken } from '../../theme';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

// Mock data types
interface DeviceStatus {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  lastUpdate: string;
  ph: number;
  temperature: number;
  turbidity: number;
}

interface RecentAlert {
  key: string;
  device: string;
  parameter: string;
  value: number;
  threshold: number;
  time: string;
  severity: 'high' | 'medium' | 'low';
}

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const token = useThemeToken();
  const [loading, setLoading] = useState(true);
  const [deviceStats, setDeviceStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    warnings: 0,
  });
  const [recentReadings, setRecentReadings] = useState<DeviceStatus[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      // Simulate API call - Replace with actual Firebase/API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data
      const mockDevices: DeviceStatus[] = [
        {
          id: '1',
          name: 'Device A',
          location: 'North Station',
          status: 'online',
          lastUpdate: '2 mins ago',
          ph: 7.2,
          temperature: 25.5,
          turbidity: 3.2,
        },
        {
          id: '2',
          name: 'Device B',
          location: 'South Station',
          status: 'warning',
          lastUpdate: '5 mins ago',
          ph: 8.5,
          temperature: 28.0,
          turbidity: 5.8,
        },
        {
          id: '3',
          name: 'Device C',
          location: 'East Station',
          status: 'online',
          lastUpdate: '1 min ago',
          ph: 6.8,
          temperature: 24.0,
          turbidity: 2.1,
        },
        {
          id: '4',
          name: 'Device D',
          location: 'West Station',
          status: 'offline',
          lastUpdate: '30 mins ago',
          ph: 0,
          temperature: 0,
          turbidity: 0,
        },
      ];

      const mockAlerts: RecentAlert[] = [
        {
          key: '1',
          device: 'Device B',
          parameter: 'pH Level',
          value: 8.5,
          threshold: 8.0,
          time: '5 mins ago',
          severity: 'high',
        },
        {
          key: '2',
          device: 'Device B',
          parameter: 'Turbidity',
          value: 5.8,
          threshold: 5.0,
          time: '10 mins ago',
          severity: 'medium',
        },
        {
          key: '3',
          device: 'Device A',
          parameter: 'Temperature',
          value: 25.5,
          threshold: 25.0,
          time: '15 mins ago',
          severity: 'low',
        },
      ];

      setRecentReadings(mockDevices);
      setRecentAlerts(mockAlerts);
      setDeviceStats({
        total: mockDevices.length,
        online: mockDevices.filter(d => d.status === 'online').length,
        offline: mockDevices.filter(d => d.status === 'offline').length,
        warnings: mockDevices.filter(d => d.status === 'warning').length,
      });

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  // Device status columns
  const deviceColumns: ColumnsType<DeviceStatus> = [
    {
      title: 'Device',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DeviceStatus) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.location}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          online: { color: 'success', icon: <CheckCircleOutlined />, text: 'Online' },
          offline: { color: 'default', icon: <ClockCircleOutlined />, text: 'Offline' },
          warning: { color: 'warning', icon: <WarningOutlined />, text: 'Warning' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Tag icon={config.icon} color={config.color}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: 'pH',
      dataIndex: 'ph',
      key: 'ph',
      render: (value: number) => (
        <Text style={{ color: value > 8 || value < 6.5 ? token.colorError : token.colorSuccess }}>
          {value > 0 ? value.toFixed(1) : '-'}
        </Text>
      ),
    },
    {
      title: 'Temperature (°C)',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (value: number) => (
        <Text>{value > 0 ? value.toFixed(1) : '-'}</Text>
      ),
    },
    {
      title: 'Turbidity (NTU)',
      dataIndex: 'turbidity',
      key: 'turbidity',
      render: (value: number) => (
        <Text style={{ color: value > 5 ? token.colorError : token.colorSuccess }}>
          {value > 0 ? value.toFixed(1) : '-'}
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
      render: (_, record: DeviceStatus) => (
        <Button
          type="link"
          onClick={() => navigate(`/staff/devices/${record.id}/readings`)}
        >
          View Details
        </Button>
      ),
    },
  ];

  // Alert columns
  const alertColumns: ColumnsType<RecentAlert> = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => {
        const colors = { high: 'error', medium: 'warning', low: 'default' };
        return (
          <Tag color={colors[severity as keyof typeof colors]}>
            {severity.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Device',
      dataIndex: 'device',
      key: 'device',
    },
    {
      title: 'Parameter',
      dataIndex: 'parameter',
      key: 'parameter',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: RecentAlert) => (
        <Text>
          {value.toFixed(1)} (Threshold: {record.threshold.toFixed(1)})
        </Text>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
    },
  ];

  if (loading) {
    return (
      <StaffLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading dashboard..." />
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <DashboardOutlined /> Staff Dashboard
          </Title>
          <Text type="secondary">
            Welcome back, {userProfile?.firstname || 'Staff Member'}! Monitor water quality devices and sensor data.
          </Text>
        </div>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Devices"
                value={deviceStats.total}
                prefix={<ApiOutlined />}
                valueStyle={{ color: token.colorInfo }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Online"
                value={deviceStats.online}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: token.colorSuccess }}
                suffix={`/ ${deviceStats.total}`}
              />
              <Progress
                percent={(deviceStats.online / deviceStats.total) * 100}
                showInfo={false}
                strokeColor={token.colorSuccess}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Warnings"
                value={deviceStats.warnings}
                prefix={<WarningOutlined />}
                valueStyle={{ color: token.colorWarning }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Offline"
                value={deviceStats.offline}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: token.colorTextSecondary }}
              />
            </Card>
          </Col>
        </Row>

        {/* Alerts Section */}
        {recentAlerts.length > 0 && (
          <Alert
            message="Active Alerts"
            description={`You have ${recentAlerts.length} recent alerts that require attention.`}
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            action={
              <Button size="small" onClick={() => navigate('/staff/readings')}>
                View All
              </Button>
            }
          />
        )}

        {/* Recent Alerts Table */}
        <Card
          title={
            <Space>
              <WarningOutlined />
              <span>Recent Alerts</span>
            </Space>
          }
          extra={
            <Button
              type="link"
              onClick={() => navigate('/staff/readings')}
            >
              View All Alerts
            </Button>
          }
        >
          <Table
            columns={alertColumns}
            dataSource={recentAlerts}
            pagination={false}
            size="small"
          />
        </Card>

        {/* Device Status Table */}
        <Card
          title={
            <Space>
              <LineChartOutlined />
              <span>Device Status & Recent Readings</span>
            </Space>
          }
          extra={
            <Space>
              <Button
                icon={<SyncOutlined />}
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                onClick={() => navigate('/staff/devices')}
              >
                View All Devices
              </Button>
            </Space>
          }
        >
          <Table
            columns={deviceColumns}
            dataSource={recentReadings}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Button
                type="default"
                block
                size="large"
                icon={<ApiOutlined />}
                onClick={() => navigate('/staff/devices')}
              >
                View Devices
              </Button>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                type="default"
                block
                size="large"
                icon={<LineChartOutlined />}
                onClick={() => navigate('/staff/readings')}
              >
                Sensor Readings
              </Button>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                type="default"
                block
                size="large"
                icon={<DashboardOutlined />}
                onClick={() => navigate('/staff/analytics')}
              >
                View Analytics
              </Button>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                type="default"
                block
                size="large"
                icon={<WarningOutlined />}
                onClick={() => navigate('/staff/readings')}
              >
                View Alerts
              </Button>
            </Col>
          </Row>
        </Card>
      </Space>
    </StaffLayout>
  );
};

export default StaffDashboard;