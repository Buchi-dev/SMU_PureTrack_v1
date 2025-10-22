import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Switch,
  Button,
  Space,
  Alert,
  Spin,
  Typography,
  Divider,
  Tag,
  Progress,
  Badge,
  message,
  Empty,
} from 'antd';
import { useThemeToken } from '../../../theme';
import {
  ReloadOutlined,
  DownloadOutlined,
  LineChartOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { api } from '../../../services/api';
import type { Device, SensorReading } from '../../../schemas';
import { Line } from '@ant-design/plots';

const { Title, Text } = Typography;
const { Option } = Select;

// Sensor thresholds for water quality monitoring
const THRESHOLDS = {
  turbidity: { min: 0, max: 5, unit: 'NTU', label: 'Turbidity' },
  tds: { min: 0, max: 500, unit: 'ppm', label: 'TDS' },
  ph: { min: 6.5, max: 8.5, unit: '', label: 'pH Level' },
};

// Refresh interval options (in milliseconds)
const REFRESH_INTERVALS = [
  { label: '5 seconds', value: 5000 },
  { label: '10 seconds', value: 10000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '5 minutes', value: 300000 },
];

const DeviceReadings = () => {
  const token = useThemeToken();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    let intervalId: number;

    if (autoRefresh && selectedDeviceId) {
      intervalId = window.setInterval(() => {
        loadSensorData(selectedDeviceId);
      }, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, selectedDeviceId, refreshInterval]);

  // Load devices
  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await api.listDevices();
      setDevices(data);
      
      // Auto-select first online device
      const firstOnlineDevice = data.find(d => d.status === 'online');
      if (firstOnlineDevice) {
        setSelectedDeviceId(firstOnlineDevice.deviceId);
        loadSensorData(firstOnlineDevice.deviceId);
      }
    } catch (error) {
      message.error('Failed to load devices');
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load sensor data for selected device
  const loadSensorData = async (deviceId: string) => {
    if (!deviceId) return;

    try {
      const [readings, history] = await Promise.all([
        api.getSensorReadings(deviceId),
        api.getSensorHistory(deviceId, 50),
      ]);

      if (readings) {
        setLatestReading(readings);
        setLastUpdated(new Date());
      }
      
      if (history) {
        setSensorHistory(history);
      }
    } catch (error) {
      message.error('Failed to load sensor data');
      console.error('Error loading sensor data:', error);
    }
  };

  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (selectedDeviceId) {
      loadSensorData(selectedDeviceId);
      message.success('Data refreshed');
    }
  }, [selectedDeviceId]);

  // Handle device selection change
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setLatestReading(null);
    setSensorHistory([]);
    loadSensorData(deviceId);
  };

  // Export data to CSV
  const handleExport = () => {
    if (!sensorHistory.length) {
      message.warning('No data to export');
      return;
    }

    const headers = ['Timestamp', 'Turbidity (NTU)', 'TDS (ppm)', 'pH'];
    const rows = sensorHistory.map(reading => [
      new Date(reading.timestamp).toLocaleString(),
      reading.turbidity,
      reading.tds,
      reading.ph,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sensor-data-${selectedDeviceId}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Data exported successfully');
  };

  // Get status color based on value and thresholds
  const getStatusColor = (value: number, type: 'turbidity' | 'tds' | 'ph') => {
    const threshold = THRESHOLDS[type];
    if (value < threshold.min || value > threshold.max) {
      return 'error';
    }
    if (value < threshold.min * 1.2 || value > threshold.max * 0.8) {
      return 'warning';
    }
    return 'success';
  };

  // Get status icon
  const getStatusIcon = (value: number, type: 'turbidity' | 'tds' | 'ph') => {
    const status = getStatusColor(value, type);
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: token.colorSuccess }} />;
      case 'warning':
        return <WarningOutlined style={{ color: token.colorWarning }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: token.colorError }} />;
      default:
        return null;
    }
  };

  // Prepare chart data
  const getChartData = (type: 'turbidity' | 'tds' | 'ph') => {
    return sensorHistory.map(reading => ({
      timestamp: new Date(reading.timestamp).toLocaleTimeString(),
      value: reading[type],
      type: THRESHOLDS[type].label,
    }));
  };

  // Chart configuration
  const getChartConfig = (type: 'turbidity' | 'tds' | 'ph') => ({
    data: getChartData(type),
    xField: 'timestamp',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `${datum.value} ${THRESHOLDS[type].unit}`,
      }),
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${v} ${THRESHOLDS[type].unit}`,
      },
    },
  });

  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);

  return (
    <AdminLayout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2}>
              <DashboardOutlined /> Real-time Sensor Monitoring
            </Title>
            <Text type="secondary">
              Monitor water quality sensors in real-time
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={!sensorHistory.length}
              >
                Export Data
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
                type="primary"
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Device Selection & Auto-refresh Controls */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Select Device:</Text>
                <Select
                  style={{ width: '100%', maxWidth: 400 }}
                  placeholder="Select a device"
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  loading={loading}
                >
                  {devices.map(device => (
                    <Option key={device.deviceId} value={device.deviceId}>
                      <Space>
                        <Badge status={device.status === 'online' ? 'success' : 'default'} />
                        {device.name} ({device.deviceId})
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            
            <Col>
              <Divider type="vertical" style={{ height: 60 }} />
            </Col>

            <Col>
              <Space direction="vertical">
                <Space>
                  <Text strong>Auto-refresh:</Text>
                  <Switch
                    checked={autoRefresh}
                    onChange={setAutoRefresh}
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                  />
                </Space>
                {autoRefresh && (
                  <Select
                    size="small"
                    value={refreshInterval}
                    onChange={setRefreshInterval}
                    style={{ width: 120 }}
                  >
                    {REFRESH_INTERVALS.map(interval => (
                      <Option key={interval.value} value={interval.value}>
                        {interval.label}
                      </Option>
                    ))}
                  </Select>
                )}
              </Space>
            </Col>

            {lastUpdated && (
              <>
                <Col>
                  <Divider type="vertical" style={{ height: 60 }} />
                </Col>
                <Col>
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined /> Last Updated
                    </Text>
                    <Text strong>{lastUpdated.toLocaleTimeString()}</Text>
                  </Space>
                </Col>
              </>
            )}
          </Row>
        </Card>

        {/* Device Status Alert */}
        {selectedDevice && selectedDevice.status !== 'online' && (
          <Alert
            message="Device Offline"
            description={`The selected device is currently ${selectedDevice.status}. Data may not be up to date.`}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Main Content */}
        {!selectedDeviceId ? (
          <Card>
            <Empty
              description="Please select a device to view sensor readings"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : loading && !latestReading ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text>Loading sensor data...</Text>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Current Readings */}
            <Card 
              title={
                <Space>
                  <ThunderboltOutlined />
                  <span>Current Readings</span>
                  {autoRefresh && (
                    <Tag color="blue" icon={<ReloadOutlined spin />}>
                      Live
                    </Tag>
                  )}
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              {latestReading ? (
                <Row gutter={[24, 24]}>
                  {/* Turbidity */}
                  <Col xs={24} sm={12} lg={8}>
                    <Card
                      hoverable
                      style={{
                        borderLeft: `4px solid ${
                          getStatusColor(latestReading.turbidity, 'turbidity') === 'success'
                            ? token.colorSuccess
                            : getStatusColor(latestReading.turbidity, 'turbidity') === 'warning'
                            ? token.colorWarning
                            : token.colorError
                        }`,
                      }}
                    >
                      <Statistic
                        title={
                          <Space>
                            <FireOutlined />
                            Turbidity
                          </Space>
                        }
                        value={latestReading.turbidity}
                        suffix={THRESHOLDS.turbidity.unit}
                        prefix={getStatusIcon(latestReading.turbidity, 'turbidity')}
                        valueStyle={{
                          color:
                            getStatusColor(latestReading.turbidity, 'turbidity') === 'success'
                              ? token.colorSuccess
                              : getStatusColor(latestReading.turbidity, 'turbidity') === 'warning'
                              ? token.colorWarning
                              : token.colorError,
                        }}
                      />
                      <Divider style={{ margin: '12px 0' }} />
                      <Progress
                        percent={(latestReading.turbidity / THRESHOLDS.turbidity.max) * 100}
                        status={
                          getStatusColor(latestReading.turbidity, 'turbidity') === 'error'
                            ? 'exception'
                            : 'active'
                        }
                        showInfo={false}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Safe range: {THRESHOLDS.turbidity.min} - {THRESHOLDS.turbidity.max}{' '}
                        {THRESHOLDS.turbidity.unit}
                      </Text>
                    </Card>
                  </Col>

                  {/* TDS */}
                  <Col xs={24} sm={12} lg={8}>
                    <Card
                      hoverable
                      style={{
                        borderLeft: `4px solid ${
                          getStatusColor(latestReading.tds, 'tds') === 'success'
                            ? token.colorSuccess
                            : getStatusColor(latestReading.tds, 'tds') === 'warning'
                            ? token.colorWarning
                            : token.colorError
                        }`,
                      }}
                    >
                      <Statistic
                        title={
                          <Space>
                            <ExperimentOutlined />
                            Total Dissolved Solids
                          </Space>
                        }
                        value={latestReading.tds}
                        suffix={THRESHOLDS.tds.unit}
                        prefix={getStatusIcon(latestReading.tds, 'tds')}
                        valueStyle={{
                          color:
                            getStatusColor(latestReading.tds, 'tds') === 'success'
                              ? token.colorSuccess
                              : getStatusColor(latestReading.tds, 'tds') === 'warning'
                              ? token.colorWarning
                              : token.colorError,
                        }}
                      />
                      <Divider style={{ margin: '12px 0' }} />
                      <Progress
                        percent={(latestReading.tds / THRESHOLDS.tds.max) * 100}
                        status={
                          getStatusColor(latestReading.tds, 'tds') === 'error' ? 'exception' : 'active'
                        }
                        showInfo={false}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Safe range: {THRESHOLDS.tds.min} - {THRESHOLDS.tds.max}{' '}
                        {THRESHOLDS.tds.unit}
                      </Text>
                    </Card>
                  </Col>

                  {/* pH */}
                  <Col xs={24} sm={12} lg={8}>
                    <Card
                      hoverable
                      style={{
                        borderLeft: `4px solid ${
                          getStatusColor(latestReading.ph, 'ph') === 'success'
                            ? token.colorSuccess
                            : getStatusColor(latestReading.ph, 'ph') === 'warning'
                            ? token.colorWarning
                            : token.colorError
                        }`,
                      }}
                    >
                      <Statistic
                        title={
                          <Space>
                            <LineChartOutlined />
                            pH Level
                          </Space>
                        }
                        value={latestReading.ph}
                        precision={2}
                        prefix={getStatusIcon(latestReading.ph, 'ph')}
                        valueStyle={{
                          color:
                            getStatusColor(latestReading.ph, 'ph') === 'success'
                              ? token.colorSuccess
                              : getStatusColor(latestReading.ph, 'ph') === 'warning'
                              ? token.colorWarning
                              : token.colorError,
                        }}
                      />
                      <Divider style={{ margin: '12px 0' }} />
                      <Progress
                        percent={(latestReading.ph / 14) * 100}
                        status={
                          getStatusColor(latestReading.ph, 'ph') === 'error' ? 'exception' : 'active'
                        }
                        showInfo={false}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Safe range: {THRESHOLDS.ph.min} - {THRESHOLDS.ph.max}
                      </Text>
                    </Card>
                  </Col>
                </Row>
              ) : (
                <Empty description="No sensor data available" />
              )}
            </Card>

            {/* Historical Charts */}
            {sensorHistory.length > 0 && (
              <Row gutter={[16, 16]}>
                {/* Turbidity Chart */}
                <Col xs={24} lg={8}>
                  <Card title="Turbidity Trend" size="small">
                    <Line {...getChartConfig('turbidity')} height={250} />
                  </Card>
                </Col>

                {/* TDS Chart */}
                <Col xs={24} lg={8}>
                  <Card title="TDS Trend" size="small">
                    <Line {...getChartConfig('tds')} height={250} />
                  </Card>
                </Col>

                {/* pH Chart */}
                <Col xs={24} lg={8}>
                  <Card title="pH Trend" size="small">
                    <Line {...getChartConfig('ph')} height={250} />
                  </Card>
                </Col>
              </Row>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default DeviceReadings;
