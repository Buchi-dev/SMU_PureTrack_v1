/**
 * StaffAnalytics - Data Analytics View for Staff Role
 * Displays water quality trends and analytics
 * 
 * Architecture: Uses global hook useDevices()
 */

import { useMemo } from 'react';
import { Row, Col, Space, Divider } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useThemeToken } from '../../../theme';
import { useDevices } from '../../../hooks';
import { PageHeader, PageContainer, DataCard } from '../../../components/staff';
import CompactAnalyticsStats from './components/CompactAnalyticsStats';
import { Typography } from 'antd';
import {
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

/**
 * StaffAnalytics component - displays water quality analytics
 */
export const StaffAnalytics = () => {
  const token = useThemeToken();
  
  // ✅ GLOBAL HOOK - Real-time device data via WebSocket
  const { devices: realtimeDevices, isLoading, refetch } = useDevices(); // 🔥 NO POLLING - WebSocket provides real-time updates

  const handleRefresh = async () => {
    await refetch();
  };

  // Calculate analytics data from real-time devices
  const analyticsData = useMemo(() => {
    const devicesWithReadings = realtimeDevices.filter(
      (d) => d.latestReading !== null
    );

    if (devicesWithReadings.length === 0) {
      return {
        phData: [],
        turbidityData: [],
        deviceComparison: [],
        stats: { avgPh: 0, avgTurbidity: 0, avgTds: 0 },
      };
    }

    const deviceStats: Array<{
      device: string;
      ph: number;
      turbidity: number;
      tds: number;
    }> = [];
    let totalPh = 0, totalTurbidity = 0, totalTds = 0;
    let count = 0;

    devicesWithReadings.forEach((device) => {
      const reading = device.latestReading;
      if (!reading) return;

      const phValue = reading.pH ?? reading.ph ?? 0;
      const turbidityValue = reading.turbidity ?? 0;
      const tdsValue = reading.tds ?? 0;

      deviceStats.push({
        device: device.name || device.deviceId,
        ph: phValue ? Number(phValue.toFixed(2)) : 0,
        turbidity: turbidityValue ? Number(turbidityValue.toFixed(2)) : 0,
        tds: tdsValue ? Number(tdsValue.toFixed(2)) : 0,
      });

      if (phValue) totalPh += phValue;
      if (turbidityValue) totalTurbidity += turbidityValue;
      if (tdsValue) totalTds += tdsValue;
      count++;
    });

    return {
      phData: deviceStats.map(d => ({ device: d.device, ph: d.ph })),
      turbidityData: deviceStats.map(d => ({ device: d.device, turbidity: d.turbidity })),
      deviceComparison: deviceStats,
      stats: {
        avgPh: count > 0 ? Number((totalPh / count).toFixed(1)) : 0,
        avgTurbidity: count > 0 ? Number((totalTurbidity / count).toFixed(1)) : 0,
        avgTds: count > 0 ? Number((totalTds / count).toFixed(1)) : 0,
      },
    };
  }, [realtimeDevices]);

  const { phData, turbidityData, deviceComparison, stats } = analyticsData;
  
  if (isLoading) {
    return (
      <StaffLayout>
        <PageContainer loading={isLoading} spacing="large" />
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
          loading={isLoading}
          onRefresh={handleRefresh}
        />

        {/* Statistics Cards */}
        <CompactAnalyticsStats stats={stats} />

        {/* Charts */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <DataCard
              title="pH Level by Device (Current Readings)"
              icon={<LineChartOutlined />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={phData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="device" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[6, 9]} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="ph"
                    fill={token.colorSuccess}
                    name="pH Level"
                  />
                </BarChart>
              </ResponsiveContainer>
            </DataCard>
          </Col>
          <Col xs={24} lg={12}>
            <DataCard
              title="Turbidity by Device (Current Readings)"
              icon={<LineChartOutlined />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={turbidityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="device" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="turbidity"
                    fill={token.colorWarning}
                    name="Turbidity (NTU)"
                  />
                </BarChart>
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
                  <Text>Turbidity:</Text>
                  <Text strong style={{ color: token.colorWarning }}>Moderate</Text>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>TDS:</Text>
                  <Text strong style={{ color: token.colorSuccess }}>Normal</Text>
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
