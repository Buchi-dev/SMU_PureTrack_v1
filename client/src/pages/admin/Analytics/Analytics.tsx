import { useState, useEffect } from 'react';
import { AdminLayout } from '../../../components/layouts';
import { 
  Card, 
  Typography, 
  Space, 
  Row, 
  Col, 
  Statistic, 
  Spin, 
  message,
  Tag,
  Progress,
  Alert
} from 'antd';
import {
  BarChartOutlined,
  DashboardOutlined,
  RiseOutlined,
  FallOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  LineChartOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useThemeToken } from '../../../theme';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

// Global Water Quality Thresholds
// Based on EPPA, DOH (Philippines), and WHO Standards
const WATER_QUALITY_THRESHOLDS = {
  pH: {
    min: 6.5,
    max: 8.5,
    unit: '',
    sources: 'EPPA, DOH (PNSDW), WHO',
    description: 'Recommended range for drinking water',
  },
  TDS: {
    excellent: 300,      // WHO: <300 mg/L excellent palatability
    good: 600,           // WHO: 300-600 mg/L good palatability
    acceptable: 1000,    // WHO, DOH: max 1000 mg/L safe
    maxEPPA: 500,        // EPPA: max 500 mg/L for water supply class
    maxDOH_AA: 500,      // DOH: max 500 mg/L for Class AA water
    unit: 'mg/L (ppm)',
    sources: 'EPPA, DOH (PNSDW), WHO',
    description: 'Total Dissolved Solids - palatability and safety limits',
  },
  Turbidity: {
    max: 5,              // EPPA, DOH (PNSDW), WHO: max 5 NTU for drinking water
    unit: 'NTU',
    sources: 'EPPA, DOH (PNSDW), WHO',
    description: 'Maximum recommended for drinking water',
  },
};

// Types
interface DeviceStatusData {
  totalDevices: number;
  statusBreakdown: {
    online: number;
    offline: number;
    error: number;
    maintenance: number;
  };
  healthScore: string;
}

interface SensorReading {
  deviceId: string;
  ph: number;
  tds: number;
  turbidity: number;
  timestamp: number;
  receivedAt: number;
}

interface AlertData {
  severity: string;
  parameter: string;
  message: string;
  value: string;
}

const Analytics = () => {
  const token = useThemeToken();
  const [loading, setLoading] = useState(true);
  const [waterQualityData, setWaterQualityData] = useState<any>(null);
  const [deviceStatusData, setDeviceStatusData] = useState<DeviceStatusData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [parameterDistribution, setParameterDistribution] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch water quality report
      const waterQualityResponse = await axios.post(
        'https://us-central1-my-app-da530.cloudfunctions.net/generateReport',
        { reportType: 'water_quality' }
      );

      // Fetch device status report
      const deviceStatusResponse = await axios.post(
        'https://us-central1-my-app-da530.cloudfunctions.net/generateReport',
        { reportType: 'device_status' }
      );

      const waterQuality = waterQualityResponse.data.data;
      const deviceStatus = deviceStatusResponse.data.data;

      setWaterQualityData(waterQuality);
      setDeviceStatusData(deviceStatus.summary);

      // Process time series data from readings (last 24 readings for visualization)
      if (waterQuality.devices && waterQuality.devices[0]?.readings) {
        const readings = waterQuality.devices[0].readings.slice(-24);
        const formattedData = readings.map((reading: SensorReading, index: number) => ({
          time: `${index}h`,
          pH: reading.ph,
          TDS: reading.tds,
          Turbidity: reading.turbidity,
        }));
        setTimeSeriesData(formattedData);

        // Create parameter distribution data
        const metrics = waterQuality.devices[0].metrics;
        setParameterDistribution([
          { name: 'pH', value: metrics.avgPH, max: 14 },
          { name: 'TDS', value: metrics.avgTDS, max: 1000 },
          { name: 'Turbidity', value: metrics.avgTurbidity, max: 100 },
        ]);
      }

      // Extract alerts
      if (waterQuality.devices && waterQuality.devices[0]?.alerts) {
        setAlerts(waterQuality.devices[0].alerts);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'default' | 'success' => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'error';
      case 'warning':
      case 'medium':
        return 'warning';
      case 'low':
      case 'advisory':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading analytics data..." />
        </div>
      </AdminLayout>
    );
  }

  const metrics = waterQualityData?.devices?.[0]?.metrics;
  const statusBreakdown = deviceStatusData?.statusBreakdown;

  // Prepare pie chart data for device status
  const deviceStatusPieData = statusBreakdown ? [
    { name: 'Online', value: statusBreakdown.online },
    { name: 'Offline', value: statusBreakdown.offline },
    { name: 'Error', value: statusBreakdown.error },
    { name: 'Maintenance', value: statusBreakdown.maintenance },
  ].filter(item => item.value > 0) : [];

  // Prepare comparison data for parameters
  const parameterComparisonData = metrics ? [
    {
      parameter: 'pH',
      Average: metrics.avgPH,
      Maximum: metrics.maxPH,
      Minimum: metrics.minPH,
    },
    {
      parameter: 'TDS',
      Average: metrics.avgTDS / 10, // Scale down for visualization
      Maximum: metrics.maxTDS / 10,
      Minimum: metrics.minTDS / 10,
    },
    {
      parameter: 'Turbidity',
      Average: metrics.avgTurbidity,
      Maximum: metrics.maxTurbidity,
      Minimum: metrics.minTurbidity,
    },
  ] : [];

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <BarChartOutlined /> Analytics Dashboard
          </Title>
          <Paragraph type="secondary">
            Comprehensive analytics and insights about water quality monitoring system
          </Paragraph>
        </div>

        {/* Key Metrics Row */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Devices"
                value={deviceStatusData?.totalDevices || 0}
                prefix={<ApiOutlined />}
                valueStyle={{ color: token.colorInfo }}
              />
              <Text type="secondary">Registered in system</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="System Health"
                value={parseFloat(deviceStatusData?.healthScore || '0')}
                precision={1}
                suffix="%"
                prefix={<DashboardOutlined />}
                valueStyle={{ 
                  color: parseFloat(deviceStatusData?.healthScore || '0') > 80 
                    ? token.colorSuccess 
                    : token.colorWarning 
                }}
              />
              <Progress 
                percent={parseFloat(deviceStatusData?.healthScore || '0')} 
                showInfo={false}
                strokeColor={parseFloat(deviceStatusData?.healthScore || '0') > 80 
                  ? token.colorSuccess 
                  : token.colorWarning}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Readings"
                value={metrics?.totalReadings || 0}
                prefix={<LineChartOutlined />}
                valueStyle={{ color: token.colorPrimary }}
              />
              <Text type="secondary">Last 7 days</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Alerts"
                value={alerts.length}
                prefix={<WarningOutlined />}
                valueStyle={{ color: alerts.length > 0 ? token.colorError : token.colorSuccess }}
              />
              <Text type="secondary">Requiring attention</Text>
            </Card>
          </Col>
        </Row>

        {/* Water Quality Standards Reference */}
        <Alert
          message="Water Quality Standards Applied"
          description={
            <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
              <Col xs={24} sm={8}>
                <Text strong>pH Level</Text>
                <br />
                <Text type="secondary">
                  Range: {WATER_QUALITY_THRESHOLDS.pH.min} - {WATER_QUALITY_THRESHOLDS.pH.max}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {WATER_QUALITY_THRESHOLDS.pH.sources}
                </Text>
              </Col>
              <Col xs={24} sm={8}>
                <Text strong>TDS (Total Dissolved Solids)</Text>
                <br />
                <Text type="secondary">
                  EPPA/DOH: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxEPPA} ppm, WHO Max: {WATER_QUALITY_THRESHOLDS.TDS.acceptable} ppm
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Excellent: &lt;{WATER_QUALITY_THRESHOLDS.TDS.excellent}, Good: {WATER_QUALITY_THRESHOLDS.TDS.excellent}-{WATER_QUALITY_THRESHOLDS.TDS.good} ppm
                </Text>
              </Col>
              <Col xs={24} sm={8}>
                <Text strong>Turbidity</Text>
                <br />
                <Text type="secondary">
                  Maximum: {WATER_QUALITY_THRESHOLDS.Turbidity.max} {WATER_QUALITY_THRESHOLDS.Turbidity.unit}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {WATER_QUALITY_THRESHOLDS.Turbidity.sources}
                </Text>
              </Col>
            </Row>
          }
          type="info"
          showIcon
          style={{ marginBottom: 0 }}
        />

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <Alert
            message={`${alerts.length} Active Alert(s) Detected`}
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                {alerts.map((alert, index) => (
                  <div key={index}>
                    <Tag color={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Tag>
                    <Text strong>{alert.parameter}: </Text>
                    <Text>{alert.message} (Value: {alert.value})</Text>
                  </div>
                ))}
              </Space>
            }
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Device Status Overview */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title={<><ApiOutlined /> Device Status Distribution</>}>
              {deviceStatusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deviceStatusPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deviceStatusPieData.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text type="secondary">No device status data available</Text>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title={<><DashboardOutlined /> Device Status Summary</>}>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 20 }} />
                        <Text strong>Online Devices</Text>
                      </Space>
                    </Col>
                    <Col>
                      <Text strong style={{ fontSize: 24, color: token.colorSuccess }}>
                        {statusBreakdown?.online || 0}
                      </Text>
                    </Col>
                  </Row>
                  <Progress 
                    percent={deviceStatusData?.totalDevices 
                      ? (statusBreakdown?.online || 0) / deviceStatusData.totalDevices * 100 
                      : 0} 
                    showInfo={false}
                    strokeColor={token.colorSuccess}
                  />
                </div>

                <div>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <CloseCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 20 }} />
                        <Text strong>Offline Devices</Text>
                      </Space>
                    </Col>
                    <Col>
                      <Text strong style={{ fontSize: 24 }}>
                        {statusBreakdown?.offline || 0}
                      </Text>
                    </Col>
                  </Row>
                  <Progress 
                    percent={deviceStatusData?.totalDevices 
                      ? (statusBreakdown?.offline || 0) / deviceStatusData.totalDevices * 100 
                      : 0} 
                    showInfo={false}
                    strokeColor={token.colorTextSecondary}
                  />
                </div>

                {(statusBreakdown?.error || 0) > 0 && (
                  <div>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space>
                          <CloseCircleOutlined style={{ color: token.colorError, fontSize: 20 }} />
                          <Text strong>Error Devices</Text>
                        </Space>
                      </Col>
                      <Col>
                        <Text strong style={{ fontSize: 24, color: token.colorError }}>
                          {statusBreakdown?.error || 0}
                        </Text>
                      </Col>
                    </Row>
                  </div>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Water Quality Metrics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Average pH Level"
                value={metrics?.avgPH || 0}
                precision={2}
                prefix={<RiseOutlined />}
                valueStyle={{ 
                  color: (metrics?.avgPH >= WATER_QUALITY_THRESHOLDS.pH.min && 
                          metrics?.avgPH <= WATER_QUALITY_THRESHOLDS.pH.max) 
                    ? token.colorSuccess 
                    : token.colorError 
                }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Min: {metrics?.minPH.toFixed(2)}</Text>
                <Text type="secondary" style={{ float: 'right' }}>Max: {metrics?.maxPH.toFixed(2)}</Text>
              </div>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Standard: {WATER_QUALITY_THRESHOLDS.pH.min} - {WATER_QUALITY_THRESHOLDS.pH.max}
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Average TDS"
                value={metrics?.avgTDS || 0}
                precision={1}
                suffix="ppm"
                prefix={<LineChartOutlined />}
                valueStyle={{ 
                  color: (metrics?.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.excellent) 
                    ? token.colorSuccess 
                    : (metrics?.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.good)
                    ? token.colorInfo
                    : (metrics?.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.acceptable)
                    ? token.colorWarning
                    : token.colorError
                }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Min: {metrics?.minTDS.toFixed(1)}</Text>
                <Text type="secondary" style={{ float: 'right' }}>Max: {metrics?.maxTDS.toFixed(1)}</Text>
              </div>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Standard: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxEPPA} ppm (EPPA/DOH)
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Average Turbidity"
                value={metrics?.avgTurbidity || 0}
                precision={2}
                suffix="NTU"
                prefix={<FallOutlined />}
                valueStyle={{ 
                  color: (metrics?.avgTurbidity <= WATER_QUALITY_THRESHOLDS.Turbidity.max) 
                    ? token.colorSuccess 
                    : token.colorError 
                }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Min: {metrics?.minTurbidity.toFixed(2)}</Text>
                <Text type="secondary" style={{ float: 'right' }}>Max: {metrics?.maxTurbidity.toFixed(2)}</Text>
              </div>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Standard: ≤{WATER_QUALITY_THRESHOLDS.Turbidity.max} NTU (WHO/DOH)
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Time Series Charts */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="pH Level Trend (Last 24 Hours)">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[6, 14]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pH" 
                    stroke={token.colorSuccess} 
                    strokeWidth={2}
                    dot={{ fill: token.colorSuccess }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="TDS Trend (Last 24 Hours)">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="TDS" 
                    stroke={token.colorInfo} 
                    fill={token.colorInfo}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Turbidity Trend (Last 24 Hours)">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="Turbidity" 
                    stroke={token.colorWarning} 
                    fill={token.colorWarning}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Parameter Comparison (Min/Avg/Max)">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={parameterComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="parameter" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Minimum" fill="#8884d8" />
                  <Bar dataKey="Average" fill="#82ca9d" />
                  <Bar dataKey="Maximum" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Radar Chart for Water Quality Parameters */}
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card title="Water Quality Parameters Overview">
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={parameterDistribution}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis />
                  <Radar 
                    name="Current Values" 
                    dataKey="value" 
                    stroke={token.colorPrimary} 
                    fill={token.colorPrimary} 
                    fillOpacity={0.6} 
                  />
                  <Radar 
                    name="Maximum Range" 
                    dataKey="max" 
                    stroke={token.colorError} 
                    fill={token.colorError} 
                    fillOpacity={0.2} 
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Summary Statistics */}
        <Card title="Water Quality Assessment & Standards">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Current Water Quality Status</Text>
                <div>
                  <Text>pH Level: </Text>
                  <Tag color={(metrics?.avgPH >= WATER_QUALITY_THRESHOLDS.pH.min && 
                                metrics?.avgPH <= WATER_QUALITY_THRESHOLDS.pH.max) ? 'success' : 'error'}>
                    {(metrics?.avgPH >= WATER_QUALITY_THRESHOLDS.pH.min && 
                      metrics?.avgPH <= WATER_QUALITY_THRESHOLDS.pH.max) ? 'Within Standard' : 'Out of Range'}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                    ({WATER_QUALITY_THRESHOLDS.pH.min}-{WATER_QUALITY_THRESHOLDS.pH.max})
                  </Text>
                </div>
                <div>
                  <Text>TDS Level: </Text>
                  <Tag color={
                    metrics?.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.excellent ? 'success' : 
                    metrics?.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.good ? 'processing' :
                    metrics?.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.acceptable ? 'warning' : 'error'
                  }>
                    {metrics?.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.excellent ? 'Excellent' : 
                     metrics?.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.good ? 'Good' :
                     metrics?.avgTDS <= WATER_QUALITY_THRESHOLDS.TDS.acceptable ? 'Acceptable' : 'Unsafe'}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                    (EPPA/DOH: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxEPPA} ppm)
                  </Text>
                </div>
                <div>
                  <Text>Turbidity: </Text>
                  <Tag color={metrics?.avgTurbidity <= WATER_QUALITY_THRESHOLDS.Turbidity.max ? 'success' : 'error'}>
                    {metrics?.avgTurbidity <= WATER_QUALITY_THRESHOLDS.Turbidity.max ? 'Clear' : 'High Turbidity'}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                    (Max: {WATER_QUALITY_THRESHOLDS.Turbidity.max} NTU)
                  </Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Regulatory Standards Applied</Text>
                <div>
                  <Text strong style={{ fontSize: '12px' }}>pH: </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {WATER_QUALITY_THRESHOLDS.pH.min} - {WATER_QUALITY_THRESHOLDS.pH.max}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {WATER_QUALITY_THRESHOLDS.pH.sources} - {WATER_QUALITY_THRESHOLDS.pH.description}
                  </Text>
                </div>
                <div>
                  <Text strong style={{ fontSize: '12px' }}>TDS: </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Excellent: &lt;{WATER_QUALITY_THRESHOLDS.TDS.excellent}, 
                    Good: {WATER_QUALITY_THRESHOLDS.TDS.excellent}-{WATER_QUALITY_THRESHOLDS.TDS.good}, 
                    Max: {WATER_QUALITY_THRESHOLDS.TDS.acceptable} ppm
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {WATER_QUALITY_THRESHOLDS.TDS.sources} - EPPA/DOH Class AA: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxDOH_AA} ppm
                  </Text>
                </div>
                <div>
                  <Text strong style={{ fontSize: '12px' }}>Turbidity: </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Maximum: {WATER_QUALITY_THRESHOLDS.Turbidity.max} {WATER_QUALITY_THRESHOLDS.Turbidity.unit}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {WATER_QUALITY_THRESHOLDS.Turbidity.sources} - {WATER_QUALITY_THRESHOLDS.Turbidity.description}
                  </Text>
                </div>
              </Space>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Col xs={24} md={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Data Collection Period</Text>
                <div>
                  <Text>Start: </Text>
                  <Text type="secondary">
                    {waterQualityData?.period?.start 
                      ? new Date(waterQualityData.period.start).toLocaleDateString() 
                      : 'N/A'}
                  </Text>
                </div>
                <div>
                  <Text>End: </Text>
                  <Text type="secondary">
                    {waterQualityData?.period?.end 
                      ? new Date(waterQualityData.period.end).toLocaleDateString() 
                      : 'N/A'}
                  </Text>
                </div>
                <div>
                  <Text>Total Readings: </Text>
                  <Text strong>{metrics?.totalReadings || 0}</Text>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      </Space>
    </AdminLayout>
  );
};

export default Analytics;
