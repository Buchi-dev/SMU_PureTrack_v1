import { Modal, Form, Input, Select, Space, Typography, Row, Col, Card } from 'antd';
import { useEffect } from 'react';
import type { Device } from '../../../../schemas';
import { 
  ApiOutlined, 
  EditOutlined,
  EnvironmentOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  WifiOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BugOutlined,
  ExperimentOutlined,
  FireOutlined,
  CloudOutlined,
  DashboardOutlined,
  SoundOutlined,
  BulbOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

interface AddEditDeviceModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  device: Device | null;
  onSave: (device: Partial<Device>) => void;
  onCancel: () => void;
}

export const AddEditDeviceModal = ({
  visible,
  mode,
  device,
  onSave,
  onCancel,
}: AddEditDeviceModalProps) => {
  const [form] = Form.useForm();
  const token = useThemeToken();

  // Inject custom modal styles
  useEffect(() => {
    const styleId = 'device-modal-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.innerHTML = `
        .ant-modal-content {
          border-radius: 12px !important;
        }
        .ant-form-item-label > label {
          font-size: 13px;
        }
        .ant-card {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }
        .ant-card:hover {
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          transition: box-shadow 0.3s ease;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && device) {
        form.setFieldsValue({
          deviceId: device.deviceId,
          name: device.name,
          type: device.type,
          firmwareVersion: device.firmwareVersion,
          macAddress: device.macAddress,
          ipAddress: device.ipAddress,
          sensors: device.sensors,
          status: device.status,
          // Location fields
          building: device.metadata?.location?.building || '',
          floor: device.metadata?.location?.floor || '',
          locationNotes: device.metadata?.location?.notes || '',
          // Other metadata
          description: device.metadata?.description || '',
          owner: device.metadata?.owner || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, mode, device, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Build metadata object with location
      const metadata: any = {
        description: values.description || '',
        owner: values.owner || '',
      };

      // Add location if building and floor are provided
      if (values.building && values.floor) {
        metadata.location = {
          building: values.building,
          floor: values.floor,
          notes: values.locationNotes || '',
        };
      }

      const deviceData: Partial<Device> = {
        deviceId: values.deviceId,
        name: values.name,
        type: values.type,
        firmwareVersion: values.firmwareVersion,
        macAddress: values.macAddress,
        ipAddress: values.ipAddress,
        sensors: values.sensors || [],
        status: values.status,
        metadata,
      };

      onSave(deviceData);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <Modal
      title={
        <Space size="middle">
          {mode === 'add' ? (
            <ApiOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />
          ) : (
            <EditOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />
          )}
          <Title level={4} style={{ margin: 0 }}>
            {mode === 'add' ? 'Add New Device' : 'Edit Device'}
          </Title>
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={1000}
      okText={mode === 'add' ? 'Add Device' : 'Update Device'}
      cancelText="Cancel"
      okButtonProps={{ 
        size: 'large',
        style: { minWidth: '120px', fontWeight: 500 }
      }}
      cancelButtonProps={{ 
        size: 'large',
        style: { minWidth: '100px' }
      }}
      styles={{
        body: {
          paddingTop: '24px',
          paddingBottom: '24px',
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'offline',
          sensors: [],
          metadata: '{}',
        }}
        style={{ marginTop: '8px' }}
      >
        {/* Basic Information Section */}
        <Card 
          size="small"
          style={{ 
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: token.colorBgContainer
          }}
          styles={{
            body: { padding: '20px' }
          }}
        >
          <Space size="small" style={{ marginBottom: '16px' }}>
            <InfoCircleOutlined style={{ color: token.colorPrimary, fontSize: '18px' }} />
            <Title level={5} style={{ margin: 0 }}>Basic Information</Title>
          </Space>

          <Row gutter={[24, 0]}>
            {mode === 'add' && (
              <>
                <Col xs={24} md={12}>
                  <Form.Item
                    label={<Text strong>Device ID</Text>}
                    name="deviceId"
                    rules={[
                      { required: true, message: 'Please enter device ID' },
                      { pattern: /^[A-Z0-9-_a-z]+$/, message: 'Only alphanumeric, hyphens, and underscores' },
                    ]}
                    tooltip={{
                      title: 'Unique identifier for the device (e.g., DEV-001)',
                      icon: <InfoCircleOutlined />
                    }}
                  >
                    <Input
                      placeholder="e.g., arduino_uno_r4_wifi_1"
                      prefix={<ApiOutlined style={{ color: token.colorTextSecondary }} />}
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label={<Text strong>Device Type</Text>}
                    name="type"
                    rules={[{ required: true, message: 'Please select device type' }]}
                    tooltip={{
                      title: 'Category of the device',
                      icon: <InfoCircleOutlined />
                    }}
                  >
                    <Select 
                      placeholder="Select device type"
                      size="large"
                    >
                      <Option value="Arduino UNO R4 WiFi">
                        <Space>
                          <ApiOutlined />
                          Arduino UNO R4 WiFi
                        </Space>
                      </Option>
                      <Option value="sensor">Sensor</Option>
                      <Option value="actuator">Actuator</Option>
                      <Option value="controller">Controller</Option>
                      <Option value="gateway">Gateway</Option>
                      <Option value="monitor">Monitor</Option>
                      <Option value="other">Other</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </>
            )}

            <Col xs={24} md={mode === 'add' ? 24 : 12}>
              <Form.Item
                label={<Text strong>Device Name</Text>}
                name="name"
                rules={[{ required: true, message: 'Please enter device name' }]}
                tooltip={{
                  title: 'Human-readable name for the device',
                  icon: <InfoCircleOutlined />
                }}
              >
                <Input 
                  placeholder="e.g., Water Quality Monitor 1" 
                  size="large"
                />
              </Form.Item>
            </Col>

            {mode === 'edit' && (
              <Col xs={24} md={12}>
                <Form.Item
                  label={<Text strong>Status</Text>}
                  name="status"
                  rules={[{ required: true, message: 'Please select status' }]}
                  tooltip={{
                    title: 'Current operational status of the device',
                    icon: <InfoCircleOutlined />
                  }}
                >
                  <Select 
                    placeholder="Select status"
                    size="large"
                  >
                    <Option value="online">
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        Online
                      </Space>
                    </Option>
                    <Option value="offline">
                      <Space>
                        <CloseCircleOutlined style={{ color: '#8c8c8c' }} />
                        Offline
                      </Space>
                    </Option>
                    <Option value="maintenance">
                      <Space>
                        <ToolOutlined style={{ color: '#faad14' }} />
                        Maintenance
                      </Space>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>

        {/* Network Information - Only visible in Add mode */}
        {mode === 'add' && (
          <Card 
            size="small"
            style={{ 
              marginBottom: '20px',
              borderRadius: '8px',
              backgroundColor: token.colorBgContainer
            }}
            styles={{
              body: { padding: '20px' }
            }}
          >
            <Space size="small" style={{ marginBottom: '16px' }}>
              <WifiOutlined style={{ color: token.colorPrimary, fontSize: '18px' }} />
              <Title level={5} style={{ margin: 0 }}>Network Information</Title>
            </Space>

            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<Text strong>MAC Address</Text>}
                  name="macAddress"
                  rules={[
                    { required: true, message: 'Please enter MAC address' },
                    { 
                      pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 
                      message: 'Invalid MAC address format' 
                    },
                  ]}
                  tooltip={{
                    title: 'Physical address of the network interface',
                    icon: <InfoCircleOutlined />
                  }}
                >
                  <Input 
                    placeholder="00:1A:2B:3C:4D:5E" 
                    size="large"
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label={<Text strong>IP Address</Text>}
                  name="ipAddress"
                  rules={[
                    { required: true, message: 'Please enter IP address' },
                    { 
                      pattern: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 
                      message: 'Invalid IP address format' 
                    },
                  ]}
                  tooltip={{
                    title: 'Network IP address of the device',
                    icon: <InfoCircleOutlined />
                  }}
                >
                  <Input 
                    placeholder="192.168.1.100" 
                    size="large"
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}

        {/* Device Configuration - Only visible in Add mode */}
        {mode === 'add' && (
          <Card 
            size="small"
            style={{ 
              marginBottom: '20px',
              borderRadius: '8px',
              backgroundColor: token.colorBgContainer
            }}
            styles={{
              body: { padding: '20px' }
            }}
          >
            <Space size="small" style={{ marginBottom: '16px' }}>
              <ToolOutlined style={{ color: token.colorPrimary, fontSize: '18px' }} />
              <Title level={5} style={{ margin: 0 }}>Device Configuration</Title>
            </Space>

            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<Text strong>Firmware Version</Text>}
                  name="firmwareVersion"
                  rules={[{ required: true, message: 'Please enter firmware version' }]}
                  tooltip={{
                    title: 'Current firmware version installed on the device',
                    icon: <InfoCircleOutlined />
                  }}
                >
                  <Input 
                    placeholder="v1.0.0" 
                    size="large"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label={<Text strong>Status</Text>}
                  name="status"
                  rules={[{ required: true, message: 'Please select status' }]}
                  tooltip={{
                    title: 'Current operational status of the device',
                    icon: <InfoCircleOutlined />
                  }}
                >
                  <Select 
                    placeholder="Select status"
                    size="large"
                  >
                    <Option value="online">
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        Online
                      </Space>
                    </Option>
                    <Option value="offline">
                      <Space>
                        <CloseCircleOutlined style={{ color: '#8c8c8c' }} />
                        Offline
                      </Space>
                    </Option>
                    <Option value="maintenance">
                      <Space>
                        <ToolOutlined style={{ color: '#faad14' }} />
                        Maintenance
                      </Space>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  label={<Text strong>Sensors</Text>}
                  name="sensors"
                  tooltip={{
                    title: 'Select the types of sensors available on this device',
                    icon: <InfoCircleOutlined />
                  }}
                >
                  <Select
                    mode="tags"
                    placeholder="Select or type sensor types (e.g., turbidity, tds, ph)"
                    style={{ width: '100%' }}
                    size="large"
                  >
                    <Option value="turbidity">
                      <Space>
                        <ExperimentOutlined />
                        Turbidity
                      </Space>
                    </Option>
                    <Option value="tds">
                      <Space>
                        <DashboardOutlined />
                        TDS (Total Dissolved Solids)
                      </Space>
                    </Option>
                    <Option value="ph">
                      <Space>
                        <BugOutlined />
                        pH Level
                      </Space>
                    </Option>
                    <Option value="temperature">
                      <Space>
                        <FireOutlined />
                        Temperature
                      </Space>
                    </Option>
                    <Option value="humidity">
                      <Space>
                        <CloudOutlined />
                        Humidity
                      </Space>
                    </Option>
                    <Option value="pressure">
                      <Space>
                        <DashboardOutlined />
                        Pressure
                      </Space>
                    </Option>
                    <Option value="motion">
                      <Space>
                        <RadarChartOutlined />
                        Motion
                      </Space>
                    </Option>
                    <Option value="light">
                      <Space>
                        <BulbOutlined />
                        Light
                      </Space>
                    </Option>
                    <Option value="sound">
                      <Space>
                        <SoundOutlined />
                        Sound
                      </Space>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        )}

        {/* Location Information */}
        <Card 
          size="small"
          style={{ 
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: token.colorBgContainer,
            borderColor: token.colorPrimary
          }}
          styles={{
            body: { padding: '20px' }
          }}
        >
          <Space size="small" style={{ marginBottom: '16px' }}>
            <EnvironmentOutlined style={{ color: token.colorPrimary, fontSize: '18px' }} />
            <Title level={5} style={{ margin: 0 }}>Location Information</Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>(Required for device registration)</Text>
          </Space>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Building</Text>}
                name="building"
                rules={[{ required: true, message: 'Please enter building name' }]}
                tooltip={{
                  title: 'Building where the device is located',
                  icon: <InfoCircleOutlined />
                }}
              >
                <Input 
                  placeholder="e.g., asd, Main Building, Building A" 
                  size="large"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Floor</Text>}
                name="floor"
                rules={[{ required: true, message: 'Please select floor' }]}
                tooltip={{
                  title: 'Floor where the device is located',
                  icon: <InfoCircleOutlined />
                }}
              >
                <Select 
                  placeholder="Select floor" 
                  size="large"
                >
                  <Option value="1st Floor">1st Floor</Option>
                  <Option value="2nd Floor">2nd Floor</Option>
                  <Option value="3rd Floor">3rd Floor</Option>
                  <Option value="4th Floor">4th Floor</Option>
                  <Option value="5th Floor">5th Floor</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                label={<Text strong>Notes</Text>}
                name="locationNotes"
                tooltip={{
                  title: 'Optional notes about the device location',
                  icon: <InfoCircleOutlined />
                }}
              >
                <TextArea
                  rows={3}
                  placeholder="e.g., asx, Near the main entrance, Room 201, Lab 3"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Advanced Settings */}
        <Card 
          size="small"
          style={{ 
            borderRadius: '8px',
            backgroundColor: token.colorBgContainer
          }}
          styles={{
            body: { padding: '20px' }
          }}
        >
          <Space size="small" style={{ marginBottom: '16px' }}>
            <SettingOutlined style={{ color: token.colorPrimary, fontSize: '18px' }} />
            <Title level={5} style={{ margin: 0 }}>Advanced Settings</Title>
          </Space>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Description</Text>}
                name="description"
                tooltip={{
                  title: 'Device description or purpose',
                  icon: <InfoCircleOutlined />
                }}
              >
                <Input 
                  placeholder="e.g., Water quality monitoring sensor" 
                  size="large"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label={<Text strong>Owner</Text>}
                name="owner"
                tooltip={{
                  title: 'Device owner or responsible person',
                  icon: <InfoCircleOutlined />
                }}
              >
                <Input 
                  placeholder="e.g., John Doe, Maintenance Team" 
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </Modal>
  );
};
