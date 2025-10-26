import { useState, useEffect, useMemo } from 'react';
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
  Skeleton,
  message,
  Badge,
  Tooltip,
  Divider,
  Empty,
} from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  LineChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  RiseOutlined,
  SafetyOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  EnvironmentOutlined,
  SmileOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useThemeToken } from '../../../theme';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { deviceApi } from '../../../services/api';
import { RealtimeAlertMonitor } from '../../../components/RealtimeAlertMonitor';
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

export const StaffDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const token = useThemeToken();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deviceStats, setDeviceStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    warnings: 0,
  });
  const [recentReadings, setRecentReadings] = useState<DeviceStatus[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
        // Modified query to avoid composite index requirement
        const alertsRef = collection(db, 'alerts');
        const alertsQuery = query(
          alertsRef,
          orderBy('createdAt', 'desc'),
          limit(20) // Get more to filter client-side
        );
        
        const alertsSnapshot = await new Promise((resolve) => {
          const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
            unsubscribe();
            resolve(snapshot);
          });
        }) as any;

        const alerts = alertsSnapshot.docs
          .filter((doc: any) => {
            const data = doc.data();
            // Filter for unresolved alerts client-side
            return data.resolved === false || data.status === 'Active' || data.status === 'Acknowledged';
          })
          .slice(0, 5) // Limit to 5 after filtering
          .map((doc: any) => {
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
        setLastUpdated(new Date());

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        message.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  // Device status columns with token colors - memoized
  const deviceColumns = useMemo((): ColumnsType<DeviceStatus> => {
    if (!token) return [];
    
    return [
    {
      title: 'Device',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 200,
      render: (text: string, record: DeviceStatus) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '14px' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <EnvironmentOutlined style={{ marginRight: '4px' }} />
            {record.location}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Online', value: 'online' },
        { text: 'Warning', value: 'warning' },
        { text: 'Offline', value: 'offline' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const statusConfig = {
          online: { color: 'success', icon: <CheckCircleOutlined />, text: 'Online' },
          offline: { color: 'default', icon: <ClockCircleOutlined />, text: 'Offline' },
          warning: { color: 'warning', icon: <WarningOutlined />, text: 'Warning' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Badge status={status === 'online' ? 'processing' : status === 'warning' ? 'warning' : 'default'}>
            <Tag icon={config.icon} color={config.color}>
              {config.text}
            </Tag>
          </Badge>
        );
      },
    },
    {
      title: 'pH Level',
      dataIndex: 'ph',
      key: 'ph',
      width: 100,
      sorter: (a, b) => a.ph - b.ph,
      render: (value: number) => {
        const isAbnormal = value > 8.5 || value < 6.5;
        return (
          <Tooltip title={isAbnormal ? 'pH out of normal range (6.5-8.5)' : 'pH within normal range'}>
            <Space>
              {isAbnormal && <WarningOutlined style={{ color: token.colorError }} />}
              <Text 
                strong={isAbnormal}
                style={{ 
                  color: isAbnormal ? token.colorError : token.colorSuccess,
                  fontSize: '14px',
                }}
              >
                {value > 0 ? value.toFixed(2) : '-'}
              </Text>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: 'TDS (ppm)',
      dataIndex: 'tds',
      key: 'tds',
      width: 120,
      sorter: (a, b) => a.tds - b.tds,
      render: (value: number) => {
        const isHigh = value > 500;
        return (
          <Tooltip title={isHigh ? 'TDS above recommended level' : 'TDS within normal range'}>
            <Space>
              {isHigh && <WarningOutlined style={{ color: token.colorWarning }} />}
              <Text 
                strong={isHigh}
                style={{ 
                  color: isHigh ? token.colorWarning : token.colorSuccess,
                  fontSize: '14px',
                }}
              >
                {value > 0 ? value.toFixed(1) : '-'}
              </Text>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: 'Turbidity (NTU)',
      dataIndex: 'turbidity',
      key: 'turbidity',
      width: 140,
      sorter: (a, b) => a.turbidity - b.turbidity,
      render: (value: number) => {
        const isHigh = value > 5;
        return (
          <Tooltip title={isHigh ? 'Turbidity exceeds safe limit' : 'Turbidity within safe limit'}>
            <Space>
              {isHigh && <WarningOutlined style={{ color: token.colorError }} />}
              <Text 
                strong={isHigh}
                style={{ 
                  color: isHigh ? token.colorError : token.colorSuccess,
                  fontSize: '14px',
                }}
              >
                {value > 0 ? value.toFixed(2) : '-'}
              </Text>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: 'Last Update',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      width: 180,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
      width: 120,
      render: (_, record: DeviceStatus) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/staff/devices/${record.id}/readings`)}
        >
          View
        </Button>
      ),
    },
  ];
  }, [token, navigate]);

  // Alert columns with token colors - memoized
  const alertColumns = useMemo((): ColumnsType<RecentAlert> => {
    if (!token) return [];
    
    return [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      filters: [
        { text: 'High', value: 'high' },
        { text: 'Medium', value: 'medium' },
        { text: 'Low', value: 'low' },
      ],
      onFilter: (value, record) => record.severity === value,
      render: (severity: string) => {
        let icon = null;
        let color = 'default';
        let text = severity.toUpperCase();

        if (severity === 'high') {
          icon = <AlertOutlined />;
          color = 'error';
          text = 'HIGH';
        } else if (severity === 'medium') {
          icon = <WarningOutlined />;
          color = 'warning';
          text = 'MEDIUM';
        } else if (severity === 'low') {
          icon = <CheckCircleOutlined />;
          color = 'default';
          text = 'LOW';
        }

        return (
          <Tag color={color} style={{ fontWeight: 600 }}>
            {icon} {text}
          </Tag>
        );
      },
    },
    {
      title: 'Device',
      dataIndex: 'device',
      key: 'device',
      render: (text: string) => (
        <Text strong style={{ fontSize: '13px' }}>{text}</Text>
      ),
    },
    {
      title: 'Parameter',
      dataIndex: 'parameter',
      key: 'parameter',
      width: 120,
      render: (text: string) => (
        <Tag color="blue" style={{ textTransform: 'uppercase' }}>
          {text}
        </Tag>
      ),
    },
    {
      title: 'Current Value',
      dataIndex: 'value',
      key: 'value',
      width: 200,
      render: (value: number, record: RecentAlert) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: token.colorError, fontSize: '14px' }}>
            {value.toFixed(2)}
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Threshold: {record.threshold.toFixed(2)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 180,
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {text}
        </Text>
      ),
    },
  ];
  }, [token]);

  // Early return if token is not available yet
  if (!token) {
    return (
      <StaffLayout>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Space>
      </StaffLayout>
    );
  }

  if (loading) {
    return (
      <StaffLayout>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header Skeleton */}
          <div>
            <Skeleton.Input active style={{ width: 300, height: 32 }} />
            <div style={{ marginTop: 8 }}>
              <Skeleton.Input active style={{ width: 400, height: 20 }} />
            </div>
          </div>

          {/* Statistics Cards Skeleton */}
          <Row gutter={[16, 16]}>
            {[1, 2, 3, 4].map((i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <Card>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Tables Skeleton */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card title={<Skeleton.Input active style={{ width: 150 }} />}>
                <Skeleton active paragraph={{ rows: 5 }} />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title={<Skeleton.Input active style={{ width: 150 }} />}>
                <Skeleton active paragraph={{ rows: 5 }} />
              </Card>
            </Col>
          </Row>
        </Space>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Welcome Header with Actions */}
          <Card 
            style={{ 
              background: `linear-gradient(135deg, ${token.colorPrimary}15 0%, ${token.colorPrimary}05 100%)`,
              border: `1px solid ${token.colorPrimary}20`,
            }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Space direction="vertical" size={4}>
                  <Title level={3} style={{ margin: 0 }}>
                    <SmileOutlined style={{ marginRight: '8px' }} />
                    Welcome back, {userProfile?.firstname || 'Staff Member'}!
                  </Title>
                  <Text type="secondary">
                    Here's what's happening with your water quality monitoring system today
                  </Text>
                  <Space size="small" style={{ marginTop: 8 }}>
                    <Badge status="processing" />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </Text>
                  </Space>
                </Space>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={refreshing ? <SyncOutlined spin /> : <ReloadOutlined />}
                  size="large"
                  onClick={handleRefresh}
                  loading={refreshing}
                >
                  Refresh Data
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Key Metrics Dashboard */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card
                hoverable
                onClick={() => navigate('/staff/devices')}
                style={{ 
                  cursor: 'pointer',
                  borderLeft: `4px solid ${token.colorInfo}`,
                  transition: 'all 0.3s ease',
                }}
              >
                <Statistic
                  title={
                    <Space>
                      <ApiOutlined style={{ color: token.colorInfo }} />
                      <span>Total Devices</span>
                    </Space>
                  }
                  value={deviceStats.total}
                  valueStyle={{ color: token.colorInfo, fontSize: '32px', fontWeight: 600 }}
                  suffix={
                    <Tooltip title="View all devices">
                      <ArrowRightOutlined style={{ fontSize: '16px', marginLeft: '8px' }} />
                    </Tooltip>
                  }
                />
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Active monitoring devices
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                hoverable
                style={{ 
                  borderLeft: `4px solid ${token.colorSuccess}`,
                  transition: 'all 0.3s ease',
                }}
              >
                <Statistic
                  title={
                    <Space>
                      <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                      <span>Online Devices</span>
                    </Space>
                  }
                  value={deviceStats.online}
                  valueStyle={{ color: token.colorSuccess, fontSize: '32px', fontWeight: 600 }}
                  suffix={<Text type="secondary">/ {deviceStats.total}</Text>}
                />
                <Progress
                  percent={deviceStats.total > 0 ? Math.round((deviceStats.online / deviceStats.total) * 100) : 0}
                  strokeColor={{
                    '0%': token.colorSuccess,
                    '100%': token.colorSuccessActive,
                  }}
                  showInfo={false}
                  style={{ marginTop: 8 }}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {deviceStats.total > 0 ? Math.round((deviceStats.online / deviceStats.total) * 100) : 0}% uptime
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                hoverable
                onClick={() => navigate('/staff/readings')}
                style={{ 
                  cursor: 'pointer',
                  borderLeft: `4px solid ${token.colorWarning}`,
                  transition: 'all 0.3s ease',
                }}
              >
                <Badge count={deviceStats.warnings} offset={[10, 0]}>
                  <Statistic
                    title={
                      <Space>
                        <WarningOutlined style={{ color: token.colorWarning }} />
                        <span>Warnings</span>
                      </Space>
                    }
                    value={deviceStats.warnings}
                    valueStyle={{ color: token.colorWarning, fontSize: '32px', fontWeight: 600 }}
                    suffix={
                      <Tooltip title="View warnings">
                        <ArrowRightOutlined style={{ fontSize: '16px', marginLeft: '8px' }} />
                      </Tooltip>
                    }
                  />
                </Badge>
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Devices need attention
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card
                hoverable
                style={{ 
                  borderLeft: `4px solid ${token.colorTextSecondary}`,
                  transition: 'all 0.3s ease',
                }}
              >
                <Statistic
                  title={
                    <Space>
                      <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                      <span>Offline Devices</span>
                    </Space>
                  }
                  value={deviceStats.offline}
                  valueStyle={{ color: token.colorTextSecondary, fontSize: '32px', fontWeight: 600 }}
                />
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Currently disconnected
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Active Alerts Banner */}
          {recentAlerts.length > 0 && (
            <Alert
              message={
                <Space>
                  <WarningOutlined />
                  <Text strong>Active Alerts Detected</Text>
                </Space>
              }
              description={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text>
                    You have <Text strong>{recentAlerts.length}</Text> recent alerts that require attention.
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Please review and take necessary actions to maintain water quality standards.
                  </Text>
                </Space>
              }
              type="warning"
              showIcon
              action={
                <Button 
                  type="primary" 
                  size="small"
                  onClick={() => navigate('/staff/readings')}
                  icon={<EyeOutlined />}
                >
                  View All Alerts
                </Button>
              }
              style={{ marginBottom: 0 }}
            />
          )}

          {/* Real-Time Alert Monitor - Devices Arranged by Alert Severity */}
          <RealtimeAlertMonitor />

          {/* Main Content Grid */}
          <Row gutter={[16, 16]}>
            {/* Left Column - Alerts & Device Status */}
            <Col xs={24} xl={16}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* Recent Alerts Table */}
                <Card
                  title={
                    <Space>
                      <ThunderboltOutlined style={{ color: token.colorWarning }} />
                      <Text strong>Recent Alerts</Text>
                      <Badge count={recentAlerts.length} style={{ backgroundColor: token.colorWarning }} />
                    </Space>
                  }
                  extra={
                    <Button
                      type="link"
                      onClick={() => navigate('/staff/readings')}
                      icon={<ArrowRightOutlined />}
                    >
                      View All
                    </Button>
                  }
                  styles={{ body: { padding: recentAlerts.length === 0 ? 24 : 0 } }}
                >
                  {recentAlerts.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <Space direction="vertical" size={4}>
                          <Text type="secondary">No active alerts</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            All systems are running normally
                          </Text>
                        </Space>
                      }
                    />
                  ) : (
                    <Table
                      columns={alertColumns}
                      dataSource={recentAlerts}
                      pagination={false}
                      size="middle"
                    />
                  )}
                </Card>

                {/* Device Status Table */}
                <Card
                  title={
                    <Space>
                      <LineChartOutlined style={{ color: token.colorPrimary }} />
                      <Text strong>Device Status & Readings</Text>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button
                        type="primary"
                        onClick={() => navigate('/staff/devices')}
                        icon={<ApiOutlined />}
                      >
                        View All Devices
                      </Button>
                    </Space>
                  }
                  styles={{ body: { padding: 0 } }}
                >
                  <Table
                    columns={deviceColumns}
                    dataSource={recentReadings}
                    rowKey="id"
                    pagination={{ 
                      pageSize: 5,
                      size: 'small',
                      showSizeChanger: false,
                    }}
                  />
                </Card>
              </Space>
            </Col>

            {/* Right Column - Quick Actions & Info */}
            <Col xs={24} xl={8}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* Quick Actions */}
                <Card 
                  title={
                    <Space>
                      <RiseOutlined />
                      <Text strong>Quick Actions</Text>
                    </Space>
                  }
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Button
                      type="default"
                      block
                      size="large"
                      icon={<ApiOutlined />}
                      onClick={() => navigate('/staff/devices')}
                      style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
                    >
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong>View All Devices</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Monitor {deviceStats.total} devices
                        </Text>
                      </Space>
                    </Button>

                    <Button
                      type="default"
                      block
                      size="large"
                      icon={<LineChartOutlined />}
                      onClick={() => navigate('/staff/readings')}
                      style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
                    >
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong>Sensor Readings</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Real-time data analysis
                        </Text>
                      </Space>
                    </Button>

                    <Button
                      type="default"
                      block
                      size="large"
                      icon={<DashboardOutlined />}
                      onClick={() => navigate('/staff/analytics')}
                      style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
                    >
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong>Analytics</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Trends and insights
                        </Text>
                      </Space>
                    </Button>
                  </Space>
                </Card>

                {/* System Health */}
                <Card
                  title={
                    <Space>
                      <SafetyOutlined style={{ color: token.colorSuccess }} />
                      <Text strong>System Health</Text>
                    </Space>
                  }
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text type="secondary">Overall Health</Text>
                        <Text strong style={{ color: token.colorSuccess }}>
                          {deviceStats.total > 0 
                            ? Math.round((deviceStats.online / deviceStats.total) * 100) 
                            : 0}%
                        </Text>
                      </div>
                      <Progress
                        percent={deviceStats.total > 0 
                          ? Math.round((deviceStats.online / deviceStats.total) * 100) 
                          : 0}
                        strokeColor={{
                          '0%': token.colorSuccess,
                          '100%': token.colorSuccessActive,
                        }}
                        status="active"
                      />
                    </div>

                    <Divider style={{ margin: 0 }} />

                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Space>
                          <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                          <Text>Online</Text>
                        </Space>
                        <Text strong>{deviceStats.online}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Space>
                          <WarningOutlined style={{ color: token.colorWarning }} />
                          <Text>Warnings</Text>
                        </Space>
                        <Text strong>{deviceStats.warnings}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Space>
                          <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                          <Text>Offline</Text>
                        </Space>
                        <Text strong>{deviceStats.offline}</Text>
                      </div>
                    </Space>
                  </Space>
                </Card>

                {/* Water Quality Standards */}
                <Card
                  title={
                    <Space>
                      <ExperimentOutlined style={{ color: token.colorInfo }} />
                      <Text strong>Quality Standards</Text>
                    </Space>
                  }
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                      <Text strong style={{ fontSize: '12px' }}>pH Level</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Normal Range: 6.5 - 8.5
                        </Text>
                      </div>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div>
                      <Text strong style={{ fontSize: '12px' }}>TDS</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Normal Range: 0 - 500 ppm
                        </Text>
                      </div>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div>
                      <Text strong style={{ fontSize: '12px' }}>Turbidity</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Normal Range: 0 - 5 NTU
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Card>
              </Space>
            </Col>
          </Row>
        </Space>
      </div>
    </StaffLayout>
  );
};

