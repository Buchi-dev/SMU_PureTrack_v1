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
  message,
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
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useThemeToken } from '../../../theme';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { deviceApi } from '../../../services/api';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

// Data types
interface DeviceStatus {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  lastUpdate: string;
  ph: number;
  tds: number;
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
      
      try {
        // Fetch devices from Firebase API
        const devices = await deviceApi.listDevices();
        
        // Fetch recent sensor readings for each device
        const devicesWithReadings = await Promise.all(
          devices.map(async (device) => {
            try {
              const readings = await deviceApi.getSensorReadings(device.deviceId);
              const lastUpdate = readings?.timestamp 
                ? new Date(readings.timestamp).toLocaleString()
                : 'No data';
              
              // Determine device status based on connection and readings
              let status: 'online' | 'offline' | 'warning' = 'offline';
              if (device.status === 'online') {
                // Check if readings are recent (within last 10 minutes)
                if (readings?.timestamp) {
                  const timeDiff = Date.now() - readings.timestamp;
                  if (timeDiff < 600000) { // 10 minutes
                    status = 'online';
                    // Check for warning conditions (parameters out of normal range)
                    if (readings.ph && (readings.ph < 6.5 || readings.ph > 8.5)) status = 'warning';
                    if (readings.turbidity && readings.turbidity > 5) status = 'warning';
                  }
                }
              }
              
              return {
                id: device.deviceId,
                name: device.name || device.deviceId,
                location: typeof device.metadata?.location === 'string' 
                  ? device.metadata.location 
                  : device.metadata?.location?.building || 'Unknown',
                status,
                lastUpdate,
                ph: readings?.ph || 0,
                tds: readings?.tds || 0,
                turbidity: readings?.turbidity || 0,
              };
            } catch (error) {
              console.error(`Error fetching readings for device ${device.deviceId}:`, error);
              return {
                id: device.deviceId,
                name: device.name || device.deviceId,
                location: typeof device.metadata?.location === 'string' 
                  ? device.metadata.location 
                  : device.metadata?.location?.building || 'Unknown',
                status: 'offline' as const,
                lastUpdate: 'No data',
                ph: 0,
                tds: 0,
                turbidity: 0,
              };
            }
          })
        );

        // Fetch recent alerts from Firestore
        const alertsRef = collection(db, 'alerts');
        const alertsQuery = query(
          alertsRef,
          where('resolved', '==', false),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const alertsSnapshot = await new Promise((resolve) => {
          const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
            unsubscribe();
            resolve(snapshot);
          });
        }) as any;

        const alerts = alertsSnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            key: doc.id,
            device: data.deviceName || data.deviceId || 'Unknown Device',
            parameter: data.parameter || 'Unknown',
            value: data.currentValue || 0,
            threshold: data.threshold || 0,
            time: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'Unknown',
            severity: data.severity || 'medium',
          };
        });

        setRecentReadings(devicesWithReadings);
        setRecentAlerts(alerts);
        setDeviceStats({
          total: devicesWithReadings.length,
          online: devicesWithReadings.filter(d => d.status === 'online').length,
          offline: devicesWithReadings.filter(d => d.status === 'offline').length,
          warnings: devicesWithReadings.filter(d => d.status === 'warning').length,
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        message.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
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
        <Text style={{ color: value > 8.5 || value < 6.5 ? token.colorError : token.colorSuccess }}>
          {value > 0 ? value.toFixed(2) : '-'}
        </Text>
      ),
    },
    {
      title: 'TDS (ppm)',
      dataIndex: 'tds',
      key: 'tds',
      render: (value: number) => (
        <Text style={{ color: value > 500 ? token.colorWarning : token.colorSuccess }}>
          {value > 0 ? value.toFixed(1) : '-'}
        </Text>
      ),
    },
    {
      title: 'Turbidity (NTU)',
      dataIndex: 'turbidity',
      key: 'turbidity',
      render: (value: number) => (
        <Text style={{ color: value > 5 ? token.colorError : token.colorSuccess }}>
          {value > 0 ? value.toFixed(2) : '-'}
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