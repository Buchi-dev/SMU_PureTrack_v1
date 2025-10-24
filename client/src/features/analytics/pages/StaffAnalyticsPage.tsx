import { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Space, Statistic, Spin, message } from 'antd';
import {
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useThemeToken } from '../../../theme';
import { deviceApi } from '../../../services/api';
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
  const token = useThemeToken();
  const [loading, setLoading] = useState(true);
  const [phData, setPhData] = useState<any[]>([]);
  const [turbidityData, setTurbidityData] = useState<any[]>([]);
  const [deviceComparison, setDeviceComparison] = useState<any[]>([]);
  const [stats, setStats] = useState({
    avgPh: 0,
    avgTurbidity: 0,
    avgTds: 0,
  });

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      try {
        const devicesList = await deviceApi.listDevices();
        
        const phDataPoints: any[] = [];
        const turbidityDataPoints: any[] = [];
        const deviceStats: any[] = [];
        
        let totalPh = 0, totalTurbidity = 0, totalTds = 0;
        let count = 0;
        
        for (const device of devicesList) {
          try {
            const history = await deviceApi.getSensorHistory(device.deviceId, 24);
            
            // Aggregate data for device comparison
            if (history.length > 0) {
              const devicePh = history.reduce((sum, r) => sum + (r.ph || 0), 0) / history.length;
              const deviceTurb = history.reduce((sum, r) => sum + (r.turbidity || 0), 0) / history.length;
              const deviceTds = history.reduce((sum, r) => sum + (r.tds || 0), 0) / history.length;
              
              deviceStats.push({
                device: device.name || device.deviceId,
                ph: Number(devicePh.toFixed(2)),
                turbidity: Number(deviceTurb.toFixed(2)),
                tds: Number(deviceTds.toFixed(2)),
              });
              
              totalPh += devicePh;
              totalTurbidity += deviceTurb;
              totalTds += deviceTds;
              
              count++;
            }
            
            // Create time-series data (last 24 hours)
            history.forEach((reading, index) => {
              const timeLabel = `${index}h`;
              if (reading.ph) {
                phDataPoints.push({ time: timeLabel, ph: reading.ph });
              }
              if (reading.turbidity) {
                turbidityDataPoints.push({ time: timeLabel, turbidity: reading.turbidity });
              }
            });
            
          } catch (error) {
            console.error(`Error fetching analytics for device ${device.deviceId}:`, error);
          }
        }
        
        setPhData(phDataPoints.slice(-24)); // Last 24 data points
        setTurbidityData(turbidityDataPoints.slice(-24));
        setDeviceComparison(deviceStats);
        
        if (count > 0) {
          setStats({
            avgPh: Number((totalPh / count).toFixed(1)),
            avgTurbidity: Number((totalTurbidity / count).toFixed(1)),
            avgTds: Number((totalTds / count).toFixed(1)),
          });
        }
        
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        message.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);
  
  if (loading) {
    return (
      <StaffLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>Loading analytics...</p>
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
            <BarChartOutlined /> Analytics
          </Title>
          <Text type="secondary">
            Water quality trends and device performance analytics
          </Text>
        </div>

        {/* Summary Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="Average pH"
                value={stats.avgPh}
                precision={1}
                valueStyle={{ color: token.colorSuccess }}
                prefix={<RiseOutlined />}
                suffix="units"
              />
              <Text type="secondary">Last 24 hours</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="Avg TDS"
                value={stats.avgTds}
                precision={1}
                valueStyle={{ color: token.colorInfo }}
                suffix="ppm"
              />
              <Text type="secondary">Last 24 hours</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="Avg Turbidity"
                value={stats.avgTurbidity}
                precision={1}
                valueStyle={{ color: token.colorWarning }}
                prefix={<FallOutlined />}
                suffix="NTU"
              />
              <Text type="secondary">Last 24 hours</Text>
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
                stroke={token.colorSuccess}
                strokeWidth={2}
                name="pH Level"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Turbidity Trend Chart */}
        <Card title="Turbidity Trend (24 Hours)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={turbidityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="turbidity"
                stroke={token.colorWarning}
                strokeWidth={2}
                name="Turbidity (NTU)"
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
              <Bar dataKey="ph" fill={token.colorSuccess} name="pH" />
              <Bar dataKey="tds" fill={token.colorInfo} name="TDS (ppm)" />
              <Bar dataKey="turbidity" fill={token.colorWarning} name="Turbidity (NTU)" />
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
                  <Text strong style={{ color: token.colorSuccess }}>Good</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>pH Status:</Text>
                  <Text strong style={{ color: token.colorSuccess }}>Normal</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Temperature:</Text>
                  <Text strong style={{ color: token.colorSuccess }}>Normal</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Turbidity:</Text>
                  <Text strong style={{ color: token.colorWarning }}>Moderate</Text>
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
                  <Text strong style={{ color: token.colorWarning }}>2</Text>
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
