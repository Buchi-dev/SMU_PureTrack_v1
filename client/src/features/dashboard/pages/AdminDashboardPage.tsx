// ============================================================================
// ADMIN DASHBOARD - REAL-TIME IMPLEMENTATION
// ============================================================================
// This is the complete implementation for the Admin Dashboard with:
// - Real-time sensor readings from Firebase Realtime Database
// - Dynamic alerts panel with filtering and search
// - Interactive data visualization using Recharts
// - Responsive single-screen layout
//
// TO IMPLEMENT: Replace the content of
// client/src/pages/admin/AdminDashboard.tsx with this code
// ============================================================================

import { AdminLayout } from '../../components/layouts/AdminLayout';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Table,
  Tag,
  Badge,
  Input,
  Select,
  Spin,
  Empty,
  Divider,
  Alert as AntAlert,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../theme';
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, onValue, off } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { db } from '../../config/firebase';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import type { WaterQualityAlert, AlertSeverity } from '../../types/alerts';
import type { SensorReading } from '../../schemas';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color for alert severity
 */
const getSeverityColor = (severity: AlertSeverity): string => {
  switch (severity) {
    case 'Critical':
      return '#ff4d4f';
    case 'Warning':
      return '#faad14';
    case 'Advisory':
      return '#1890ff';
    default:
      return '#d9d9d9';
  }
};

/**
 * Get display name for water parameter
 */
const getParameterName = (param: string): string => {
  const names: Record<string, string> = {
    tds: 'TDS',
    ph: 'pH',
    turbidity: 'Turbidity',
  };
  return names[param] || param;
};

/**
 * Get unit for water parameter
 */
const getParameterUnit = (param: string): string => {
  const units: Record<string, string> = {
    tds: 'ppm',
    ph: '',
    turbidity: 'NTU',
  };
  return units[param] || '';
};

// ============================================================================
// INTERFACES
// ============================================================================

interface DeviceSensorData {
  deviceId: string;
  deviceName: string;
  latestReading: SensorReading | null;
  status: 'online' | 'offline';
  location?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminDashboard = () => {
  const token = useThemeToken();
  const rtdb = getDatabase();

  // State management
  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [devices, setDevices] = useState<DeviceSensorData[]>([]);
  const [historicalData, setHistoricalData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertFilter, setAlertFilter] = useState<AlertSeverity | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');

  // ============================================================================
  // EFFECT: Fetch recent alerts from Firestore
  // ============================================================================
  useEffect(() => {
    const alertsQuery = query(
      collection(db, 'alerts'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      alertsQuery,
      (snapshot) => {
        const alertsData = snapshot.docs.map((doc) => ({
          alertId: doc.id,
          ...doc.data(),
        })) as WaterQualityAlert[];
        setAlerts(alertsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching alerts:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ============================================================================
  // EFFECT: Fetch devices and setup real-time sensor data listeners
  // ============================================================================
  useEffect(() => {
    const devicesQuery = query(collection(db, 'devices'));

    const unsubscribe = onSnapshot(devicesQuery, (snapshot) => {
      const devicesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          deviceId: data.deviceId,
          deviceName: data.name || data.deviceId,
          latestReading: null,
          status: data.status || 'offline',
          location: data.metadata?.location
            ? `${data.metadata.location.building || ''}, ${data.metadata.location.floor || ''}`
            : undefined,
        };
      });

      setDevices(devicesData);

      // Set up real-time listeners for each device
      devicesData.forEach((device) => {
        const sensorRef = ref(rtdb, `sensorReadings/${device.deviceId}/latest`);
        onValue(sensorRef, (snapshot) => {
          const reading = snapshot.val();
          if (reading) {
            setDevices((prev) =>
              prev.map((d) =>
                d.deviceId === device.deviceId
                  ? { ...d, latestReading: reading, status: 'online' }
                  : d
              )
            );
          }
        });
      });
    });

    return () => {
      unsubscribe();
      // Clean up RTDB listeners
      devices.forEach((device) => {
        const sensorRef = ref(rtdb, `sensorReadings/${device.deviceId}/latest`);
        off(sensorRef);
      });
    };
  }, [rtdb]);

  // ============================================================================
  // EFFECT: Fetch historical data for selected device
  // ============================================================================
  useEffect(() => {
    if (selectedDevice === 'all' || !selectedDevice) return;

    const historyRef = ref(rtdb, `sensorReadings/${selectedDevice}/history`);
    onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const readings = Object.values(data) as SensorReading[];
        const sortedReadings = readings
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50)
          .reverse();
        setHistoricalData(sortedReadings);
      } else {
        setHistoricalData([]);
      }
    });

    return () => off(historyRef);
  }, [selectedDevice, rtdb]);

  // ============================================================================
  // MEMO: Filter alerts based on search and severity
  // ============================================================================
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesFilter = alertFilter === 'all' || alert.severity === alertFilter;
      const matchesSearch =
        searchText === '' ||
        alert.deviceName?.toLowerCase().includes(searchText.toLowerCase()) ||
        alert.deviceId.toLowerCase().includes(searchText.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchText.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [alerts, alertFilter, searchText]);

  // ============================================================================
  // MEMO: Calculate dashboard statistics
  // ============================================================================
  const stats = useMemo(() => {
    const totalDevices = devices.length;
    const onlineDevices = devices.filter((d) => d.status === 'online').length;
    const offlineDevices = totalDevices - onlineDevices;
    const activeAlerts = alerts.filter((a) => a.status === 'Active').length;
    const criticalAlerts = alerts.filter(
      (a) => a.severity === 'Critical' && a.status === 'Active'
    ).length;

    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      activeAlerts,
      criticalAlerts,
    };
  }, [devices, alerts]);

  // ============================================================================
  // MEMO: Prepare chart data from historical readings
  // ============================================================================
  const chartData = useMemo(() => {
    return historicalData.map((reading) => ({
      time: dayjs(reading.timestamp).format('HH:mm'),
      TDS: reading.tds,
      pH: reading.ph,
      Turbidity: reading.turbidity,
    }));
  }, [historicalData]);

  // ============================================================================
  // TABLE COLUMNS: Alert table configuration
  // ============================================================================
  const alertColumns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: AlertSeverity) => (
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
      render: (param: string) => getParameterName(param),
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

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* ====== PAGE HEADER ====== */}
        <div>
          <Title level={2}>Real-Time Dashboard</Title>
          <Text type="secondary">
            Monitor water quality sensors and alerts in real-time
          </Text>
        </div>

        {/* ====== STATISTICS CARDS ====== */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="Total Devices"
                value={stats.totalDevices}
                prefix={<ApiOutlined />}
                valueStyle={{ color: token.colorPrimary }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="Online Devices"
                value={stats.onlineDevices}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: token.colorSuccess }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="Active Alerts"
                value={stats.activeAlerts}
                prefix={<WarningOutlined />}
                valueStyle={{ color: token.colorWarning }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="Critical Alerts"
                value={stats.criticalAlerts}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: token.colorError }}
              />
            </Card>
          </Col>
        </Row>

        {/* ====== REAL-TIME SENSOR READINGS ====== */}
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: token.colorSuccess }} />
              <span>Real-Time Sensor Readings</span>
              <Badge count={stats.onlineDevices} style={{ backgroundColor: token.colorSuccess }} />
            </Space>
          }
          bordered={false}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : devices.length === 0 ? (
            <Empty description="No devices found" />
          ) : (
            <Row gutter={[16, 16]}>
              {devices.map((device) => (
                <Col xs={24} sm={12} lg={8} key={device.deviceId}>
                  <Card
                    size="small"
                    style={{
                      borderLeft: `4px solid ${
                        device.status === 'online' ? token.colorSuccess : token.colorError
                      }`,
                    }}
                    hoverable
                    onClick={() => setSelectedDevice(device.deviceId)}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{device.deviceName}</Text>
                        <Tag
                          color={device.status === 'online' ? 'success' : 'error'}
                          icon={device.status === 'online' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                        >
                          {device.status}
                        </Tag>
                      </div>
                      {device.location && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {device.location}
                        </Text>
                      )}
                      <Divider style={{ margin: '8px 0' }} />
                      {device.latestReading ? (
                        <Row gutter={8}>
                          <Col span={8}>
                            <Statistic
                              title="TDS"
                              value={device.latestReading.tds.toFixed(1)}
                              suffix="ppm"
                              valueStyle={{ fontSize: '16px' }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="pH"
                              value={device.latestReading.ph.toFixed(2)}
                              valueStyle={{ fontSize: '16px' }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="Turbidity"
                              value={device.latestReading.turbidity.toFixed(1)}
                              suffix="NTU"
                              valueStyle={{ fontSize: '16px' }}
                            />
                          </Col>
                        </Row>
                      ) : (
                        <Text type="secondary">No data available</Text>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>

        {/* ====== DATA VISUALIZATION (Historical Trends) ====== */}
        {selectedDevice && selectedDevice !== 'all' && (
          <Card
            title={
              <Space>
                <span>Historical Trends</span>
                <Tag color="blue">{devices.find((d) => d.deviceId === selectedDevice)?.deviceName}</Tag>
              </Space>
            }
            extra={
              <Select
                style={{ width: 200 }}
                value={selectedDevice}
                onChange={setSelectedDevice}
                placeholder="Select device"
              >
                <Option value="all">All Devices</Option>
                {devices.map((device) => (
                  <Option key={device.deviceId} value={device.deviceId}>
                    {device.deviceName}
                  </Option>
                ))}
              </Select>
            }
            bordered={false}
          >
            {chartData.length === 0 ? (
              <Empty description="No historical data available" />
            ) : (
              <Row gutter={[16, 16]}>
                {/* TDS Chart */}
                <Col xs={24}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>TDS (Total Dissolved Solids)</Text>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="TDS" stroke="#1890ff" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Col>
                
                {/* pH Chart */}
                <Col xs={24}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>pH Level</Text>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 14]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="pH" stroke="#52c41a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Col>
                
                {/* Turbidity Chart */}
                <Col xs={24}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>Turbidity</Text>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="Turbidity" 
                        stroke="#faad14" 
                        fill="#faad14" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Col>
              </Row>
            )}
          </Card>
        )}

        {/* ====== RECENT ALERTS ====== */}
        <Card
          title={
            <Space>
              <WarningOutlined style={{ color: token.colorWarning }} />
              <span>Recent Alerts</span>
              <Badge count={stats.activeAlerts} />
            </Space>
          }
          extra={
            <Space>
              <Input
                placeholder="Search alerts..."
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
              <Select
                style={{ width: 150 }}
                value={alertFilter}
                onChange={setAlertFilter}
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
          ) : filteredAlerts.length === 0 ? (
            <Empty description="No alerts found" />
          ) : (
            <>
              {stats.criticalAlerts > 0 && (
                <AntAlert
                  message={`${stats.criticalAlerts} Critical Alert${
                    stats.criticalAlerts > 1 ? 's' : ''
                  } Require Immediate Attention`}
                  type="error"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
              )}
              <Table
                columns={alertColumns}
                dataSource={filteredAlerts}
                rowKey="alertId"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1000 }}
              />
            </>
          )}
        </Card>
      </Space>
    </AdminLayout>
  );
};

export default AdminDashboard;
