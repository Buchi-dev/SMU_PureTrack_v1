import { Card, Typography, Row, Col, Space, Statistic } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { StaffLayout } from '../../components/layouts/StaffLayout';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const { Title, Text } = Typography;

const StaffAnalytics = () => {
  // Mock data for charts
  const phData = [
    { time: '00:00', ph: 7.2 },
    { time: '04:00', ph: 7.4 },
    { time: '08:00', ph: 7.3 },
    { time: '12:00', ph: 7.5 },
    { time: '16:00', ph: 7.1 },
    { time: '20:00', ph: 7.3 },
    { time: '24:00', ph: 7.2 },
  ];

  const temperatureData = [
    { time: '00:00', temp: 24.5 },
    { time: '04:00', temp: 23.8 },
    { time: '08:00', temp: 25.2 },
    { time: '12:00', temp: 27.5 },
    { time: '16:00', temp: 28.0 },
    { time: '20:00', temp: 26.5 },
    { time: '24:00', temp: 25.0 },
  ];

  const deviceComparison = [
    { device: 'Device A', ph: 7.2, temp: 25.5, turbidity: 3.2 },
    { device: 'Device B', ph: 8.5, temp: 28.0, turbidity: 5.8 },
    { device: 'Device C', ph: 6.8, temp: 24.0, turbidity: 2.1 },
    { device: 'Device D', ph: 7.5, temp: 26.5, turbidity: 4.2 },
  ];

  return (
    <StaffLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={2}>
            <BarChartOutlined /> Analytics
          </Title>
          <Text type="secondary">
            Water quality trends and device performance analytics
          </Text>
        </div>

        {/* Summary Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Average pH"
                value={7.3}
                precision={1}
                valueStyle={{ color: '#52c41a' }}
                prefix={<RiseOutlined />}
                suffix="units"
              />
              <Text type="secondary">Last 24 hours</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Avg Temperature"
                value={25.8}
                precision={1}
                valueStyle={{ color: '#1890ff' }}
                suffix="°C"
              />
              <Text type="secondary">Last 24 hours</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Avg Turbidity"
                value={3.8}
                precision={1}
                valueStyle={{ color: '#faad14' }}
                prefix={<FallOutlined />}
                suffix="NTU"
              />
              <Text type="secondary">Last 24 hours</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Data Points"
                value={1432}
                valueStyle={{ color: '#722ed1' }}
                prefix={<LineChartOutlined />}
              />
              <Text type="secondary">Collected today</Text>
            </Card>
          </Col>
        </Row>

        {/* pH Trend Chart */}
        <Card title="pH Level Trend (24 Hours)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={phData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[6, 9]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="ph"
                stroke="#52c41a"
                strokeWidth={2}
                name="pH Level"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Temperature Trend Chart */}
        <Card title="Temperature Trend (24 Hours)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={temperatureData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[20, 30]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#1890ff"
                strokeWidth={2}
                name="Temperature (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Device Comparison */}
        <Card title="Device Comparison (Current Readings)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deviceComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="device" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ph" fill="#52c41a" name="pH" />
              <Bar dataKey="temp" fill="#1890ff" name="Temperature" />
              <Bar dataKey="turbidity" fill="#faad14" name="Turbidity" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Information Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Water Quality Status">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Overall Quality:</Text>
                  <Text strong style={{ color: '#52c41a' }}>Good</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>pH Status:</Text>
                  <Text strong style={{ color: '#52c41a' }}>Normal</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Temperature:</Text>
                  <Text strong style={{ color: '#52c41a' }}>Normal</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Turbidity:</Text>
                  <Text strong style={{ color: '#faad14' }}>Moderate</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="System Performance">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Active Devices:</Text>
                  <Text strong>4 / 5</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Data Collection Rate:</Text>
                  <Text strong>98.5%</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Average Uptime:</Text>
                  <Text strong>99.2%</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Active Alerts:</Text>
                  <Text strong style={{ color: '#faad14' }}>2</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </StaffLayout>
  );
};

export default StaffAnalytics;
