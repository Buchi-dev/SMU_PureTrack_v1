import { Card, Row, Col, Typography, Space, Tag, Select, Empty } from 'antd';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SensorReading } from '../../../../schemas';
import type { DeviceSensorData } from './SensorReadingsCard';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

interface HistoricalTrendsCardProps {
  selectedDevice: string;
  devices: DeviceSensorData[];
  historicalData: SensorReading[];
  onDeviceChange: (deviceId: string) => void;
}

export const HistoricalTrendsCard = ({
  selectedDevice,
  devices,
  historicalData,
  onDeviceChange,
}: HistoricalTrendsCardProps) => {
  const chartData = historicalData.map((reading) => ({
    time: dayjs(reading.timestamp).format('HH:mm'),
    TDS: reading.tds,
    pH: reading.ph,
    Turbidity: reading.turbidity,
  }));

  const selectedDeviceName = devices.find((d) => d.deviceId === selectedDevice)?.deviceName;

  if (!selectedDevice || selectedDevice === 'all') {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <span>Historical Trends</span>
          {selectedDeviceName && <Tag color="blue">{selectedDeviceName}</Tag>}
        </Space>
      }
      extra={
        <Select
          style={{ width: 200 }}
          value={selectedDevice}
          onChange={onDeviceChange}
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
  );
};
