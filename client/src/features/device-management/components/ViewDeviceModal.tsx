import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Modal,
  Descriptions,
  Tag,
  Space,
  Card,
  Statistic,
  Row,
  Col,
  Button,
  Typography,
  Spin,
  Alert,
  Timeline,
  Progress,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ToolOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  WifiOutlined,
  ApiOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { Device, DeviceStatus, SensorReading } from '../../../schemas';
import { isDeviceRegistered } from '../../../schemas';
import { api } from '../../../services/api';
import { useThemeToken } from '../../../theme';

const { Text } = Typography;

interface ViewDeviceModalProps {
  visible: boolean;
  device: Device | null;
  onClose: () => void;
}

const statusConfig: Record<DeviceStatus, { color: string; icon: ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
  error: { color: 'error', icon: <WarningOutlined /> },
  maintenance: { color: 'warning', icon: <ToolOutlined /> },
};

export const ViewDeviceModal = ({ visible, device, onClose }: ViewDeviceModalProps) => {
  const token = useThemeToken();
  const [sensorData, setSensorData] = useState<SensorReading | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && device) {
      loadSensorData();
      loadSensorHistory();
    }
  }, [visible, device]);

  const loadSensorData = async () => {
    if (!device) return;
    
    setLoading(true);
    try {
      const data = await api.getSensorReadings(device.deviceId);
      setSensorData(data);
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSensorHistory = async () => {
    if (!device) return;
    
    try {
      const history = await api.getSensorHistory(device.deviceId, 10);
      setSensorHistory(history);
    } catch (error) {
      console.error('Error loading sensor history:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPhColor = (ph: number) => {
    if (ph < 6.5) return token.colorError; // Acidic - Red
    if (ph > 8.5) return token.colorInfo; // Alkaline - Blue
    return token.colorSuccess; // Neutral - Green
  };

  const getTurbidityStatus = (turbidity: number) => {
    if (turbidity < 5) return { text: 'Excellent', color: token.colorSuccess };
    if (turbidity < 20) return { text: 'Good', color: token.colorSuccess };
    if (turbidity < 50) return { text: 'Fair', color: token.colorWarning };
    return { text: 'Poor', color: token.colorError };
  };

  if (!device) return null;

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined style={{ color: token.colorPrimary }} />
          <span>Device Details - {device.name}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={loadSensorData}>
          Refresh Data
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Device Information */}
        <Card title={<><DashboardOutlined /> Device Information</>} size="small">
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Device ID">
              <Text code strong>{device.deviceId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Name">
              <Text strong>{device.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="blue">{device.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag icon={statusConfig[device.status].icon} color={statusConfig[device.status].color}>
                {device.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="MAC Address">
              <Text code>{device.macAddress}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="IP Address">
              <Space>
                <WifiOutlined />
                <Text code>{device.ipAddress}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Firmware Version">
              <Tag>{device.firmwareVersion}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Sensors">
              <Space wrap size="small">
                {device.sensors.map((sensor) => (
                  <Tag key={sensor} color="cyan">{sensor}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Registered At" span={2}>
              {device.registeredAt?.seconds
                ? new Date(device.registeredAt.seconds * 1000).toLocaleString()
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Seen" span={2}>
              {device.lastSeen?.seconds
                ? new Date(device.lastSeen.seconds * 1000).toLocaleString()
                : 'Never'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Location Information */}
        <Card 
          title={
            <Space>
              <EnvironmentOutlined />
              <span>Location Information</span>
              {isDeviceRegistered(device) ? (
                <Tag icon={<CheckCircleOutlined />} color="success">REGISTERED</Tag>
              ) : (
                <Tag icon={<InfoCircleOutlined />} color="warning">UNREGISTERED</Tag>
              )}
            </Space>
          } 
          size="small"
        >
          {device.metadata?.location ? (
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Building" span={2}>
                <Text strong>{device.metadata.location.building || 'Not set'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Floor" span={2}>
                <Text strong>{device.metadata.location.floor || 'Not set'}</Text>
              </Descriptions.Item>
              {device.metadata.location.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  <Text>{device.metadata.location.notes}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <Alert
              message="No Location Set"
              description="This device has not been assigned a location. Please edit the device to add location information for registration."
              type="warning"
              showIcon
              icon={<EnvironmentOutlined />}
            />
          )}
        </Card>

        {/* Additional Metadata */}
        {device.metadata && (device.metadata.description || device.metadata.owner) && (
          <Card title="Additional Information" size="small">
            <Descriptions bordered column={2} size="small">
              {device.metadata.description && (
                <Descriptions.Item label="Description" span={2}>
                  {device.metadata.description}
                </Descriptions.Item>
              )}
              {device.metadata.owner && (
                <Descriptions.Item label="Owner" span={2}>
                  {device.metadata.owner}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}

        {/* Sensor Readings */}
        {device.status === 'online' && (
          <Card
            title={
              <Space>
                <ThunderboltOutlined />
                <span>Live Sensor Readings</span>
              </Space>
            }
            size="small"
            extra={
              <Button
                type="link"
                icon={<ReloadOutlined />}
                onClick={loadSensorData}
                loading={loading}
                size="small"
              >
                Refresh
              </Button>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" tip="Loading sensor data..." />
              </div>
            ) : sensorData ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Card>
                      <Statistic
                        title="pH Level"
                        value={sensorData.ph}
                        precision={2}
                        valueStyle={{ color: getPhColor(sensorData.ph) }}
                        suffix="pH"
                      />
                      <Progress
                        percent={(sensorData.ph / 14) * 100}
                        strokeColor={getPhColor(sensorData.ph)}
                        showInfo={false}
                        size="small"
                        style={{ marginTop: 8 }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card>
                      <Statistic
                        title="Turbidity"
                        value={sensorData.turbidity}
                        precision={1}
                        valueStyle={{ color: getTurbidityStatus(sensorData.turbidity).color }}
                        suffix="NTU"
                      />
                      <Tag color={getTurbidityStatus(sensorData.turbidity).color} style={{ marginTop: 8 }}>
                        {getTurbidityStatus(sensorData.turbidity).text}
                      </Tag>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card>
                      <Statistic
                        title="TDS"
                        value={sensorData.tds}
                        precision={0}
                        valueStyle={{ color: token.colorInfo }}
                        suffix="ppm"
                      />
                    </Card>
                  </Col>
                </Row>
                <Alert
                  message={`Last updated: ${formatTimestamp(sensorData.receivedAt)}`}
                  type="info"
                  showIcon
                  closable
                />
              </Space>
            ) : (
              <Alert
                message="No sensor data available"
                description="This device hasn't reported any sensor readings yet."
                type="warning"
                showIcon
              />
            )}
          </Card>
        )}

        {/* Sensor History */}
        {sensorHistory.length > 0 && (
          <Card title="Recent Sensor History" size="small">
            <Timeline
              items={sensorHistory.slice(0, 5).map((reading) => ({
                children: (
                  <Space direction="vertical" size="small">
                    <Text strong>{formatTimestamp(reading.timestamp)}</Text>
                    <Space wrap>
                      <Tag color="blue">pH: {reading.ph.toFixed(2)}</Tag>
                      <Tag color="cyan">Turbidity: {reading.turbidity.toFixed(1)} NTU</Tag>
                      <Tag color="purple">TDS: {reading.tds} ppm</Tag>
                    </Space>
                  </Space>
                ),
                color: 'blue',
              }))}
            />
          </Card>
        )}

        {device.status === 'offline' && (
          <Alert
            message="Device Offline"
            description="This device is currently offline. Sensor data is not available."
            type="warning"
            showIcon
          />
        )}

        {device.status === 'error' && (
          <Alert
            message="Device Error"
            description="This device is reporting an error state. Please check the device logs."
            type="error"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};
