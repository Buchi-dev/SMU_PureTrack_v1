import { useState, useEffect } from 'react';
import { Row, Col, Space, Divider, message } from 'antd';
import {
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useThemeToken } from '../../../theme';
import { deviceManagementService } from '../../../services/deviceManagement.Service';
import { PageHeader, StatsCard, PageContainer, DataCard } from '../../../components/staff';
import { Typography } from 'antd';
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

const { Text } = Typography;

export const StaffAnalytics = () => {
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

  const handleRefresh = async () => {
    setLoading(true);
    await fetchAnalyticsData();
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const devicesList = await deviceManagementService.listDevices();
      
      const phDataPoints: any[] = [];
      const turbidityDataPoints: any[] = [];
      const deviceStats: any[] = [];
      
      let totalPh = 0, totalTurbidity = 0, totalTds = 0;
      let count = 0;
      
      for (const device of devicesList) {
        try {
          const history = await deviceManagementService.getSensorHistory(device.deviceId, 24);
          
          // Aggregate data for device comparison
          if (history.length > 0) {
            const devicePh = history.reduce((sum: number, r: any) => sum + (r.ph || 0), 0) / history.length;
            const deviceTurb = history.reduce((sum: number, r: any) => sum + (r.turbidity || 0), 0) / history.length;
            const deviceTds = history.reduce((sum: number, r: any) => sum + (r.tds || 0), 0) / history.length;
            
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
          history.forEach((reading: any, index: number) => {
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

  useEffect(() => {
    fetchAnalyticsData();
  }, []);
  
  if (loading) {
    return (
      <StaffLayout>
        <PageContainer loading={loading} spacing="large" />
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <PageContainer spacing="large">
        {/* Page Header */}
        <PageHeader
          title="Analytics"
          subtitle="Water quality trends and device performance analytics"
          icon={<BarChartOutlined />}
          loading={loading}
          onRefresh={handleRefresh}
        />

        {/* Statistics Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <StatsCard
              title="Average pH"
              value={stats.avgPh}
              icon={<RiseOutlined />}
              color={token.colorSuccess}
              suffix="units"
              description="Last 24 hours"
              trend="neutral"
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatsCard
              title="Avg TDS"
              value={stats.avgTds}
              color={token.colorInfo}
              suffix="ppm"
              description="Last 24 hours"
              trend="neutral"
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatsCard
              title="Avg Turbidity"
              value={stats.avgTurbidity}
              icon={<FallOutlined />}
              color={token.colorWarning}
              suffix="NTU"
              description="Last 24 hours"
              trend="neutral"
            />
          </Col>
        </Row>

        {/* Charts */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <DataCard
              title="pH Level Trend (24 Hours)"
              icon={<LineChartOutlined />}
            >
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
            </DataCard>
          </Col>
          <Col xs={24} lg={12}>
            <DataCard
              title="Turbidity Trend (24 Hours)"
              icon={<LineChartOutlined />}
            >
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
            </DataCard>
          </Col>
        </Row>

        {/* Device Comparison */}
        <DataCard
          title="Device Comparison (Current Readings)"
          icon={<BarChartOutlined />}
        >
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
        </DataCard>

        {/* Information Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <DataCard
              title="Water Quality Status"
              icon={<CheckCircleOutlined />}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Overall Quality:</Text>
                  <Text strong style={{ color: token.colorSuccess }}>Good</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>pH Status:</Text>
                  <Text strong style={{ color: token.colorSuccess }}>Normal</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Temperature:</Text>
                  <Text strong style={{ color: token.colorSuccess }}>Normal</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Turbidity:</Text>
                  <Text strong style={{ color: token.colorWarning }}>Moderate</Text>
                </div>
              </Space>
            </DataCard>
          </Col>
          <Col xs={24} md={12}>
            <DataCard
              title="System Performance"
              icon={<CheckCircleOutlined />}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Active Devices:</Text>
                  <Text strong>4 / 5</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Data Collection Rate:</Text>
                  <Text strong>98.5%</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Average Uptime:</Text>
                  <Text strong>99.2%</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Active Alerts:</Text>
                  <Text strong style={{ color: token.colorWarning }}>2</Text>
                </div>
              </Space>
            </DataCard>
          </Col>
        </Row>
      </PageContainer>
    </StaffLayout>
  );
};
