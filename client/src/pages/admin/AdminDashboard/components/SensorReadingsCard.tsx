import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Tag,
  Badge,
  Spin,
  Empty,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import type { SensorReading } from '../../../../schemas';

const { Text } = Typography;

export interface DeviceSensorData {
  deviceId: string;
  deviceName: string;
  latestReading: SensorReading | null;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  location?: string;
}

interface SensorReadingsCardProps {
  devices: DeviceSensorData[];
  loading: boolean;
  onlineDevices: number;
  onDeviceSelect: (deviceId: string) => void;
}

export const SensorReadingsCard = ({
  devices,
  loading,
  onlineDevices,
  onDeviceSelect,
}: SensorReadingsCardProps) => {
  const token = useThemeToken();

  return (
    <Card
      title={
        <Space>
          <CheckCircleOutlined style={{ color: token.colorSuccess }} />
          <span>Real-Time Sensor Readings</span>
          <Badge count={onlineDevices} style={{ backgroundColor: token.colorSuccess }} />
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
                onClick={() => onDeviceSelect(device.deviceId)}
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
  );
};
