import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Tooltip,
  Badge,
  Typography,
  Input,
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ToolOutlined,
  WifiOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { api } from '../../../services/api';
import type { Device, DeviceStatus } from '../../../schemas';
import { isDeviceRegistered } from '../../../schemas';
import { AdminLayout } from '../../../components/layouts';
import { AddEditDeviceModal } from './AddEditDeviceModal';
import { ViewDeviceModal } from './ViewDeviceModal';
import { RegisterDeviceModal } from './RegisterDeviceModal';
import type { ReactNode } from 'react';
import { useThemeToken } from '../../../theme';

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

// Status color mapping
const statusConfig: Record<DeviceStatus, { color: string; icon: ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
  error: { color: 'error', icon: <WarningOutlined /> },
  maintenance: { color: 'warning', icon: <ToolOutlined /> },
};

const DeviceManagement = () => {
  const token = useThemeToken();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isAddEditModalVisible, setIsAddEditModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [activeTab, setActiveTab] = useState<'registered' | 'unregistered'>('registered');

  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, []);

  // Fetch devices from API
  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await api.listDevices();
      setDevices(data);
      message.success('Devices loaded successfully');
    } catch (error) {
      message.error('Failed to load devices');
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle device deletion
  const handleDelete = (device: Device) => {
    Modal.confirm({
      title: 'Delete Device',
      content: `Are you sure you want to delete "${device.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.deleteDevice(device.deviceId);
          message.success('Device deleted successfully');
          loadDevices();
        } catch (error) {
          message.error('Failed to delete device');
          console.error('Error deleting device:', error);
        }
      },
    });
  };

  // Handle add device
  const handleAdd = () => {
    setModalMode('add');
    setSelectedDevice(null);
    setIsAddEditModalVisible(true);
  };

  // Handle edit device
  const handleEdit = (device: Device) => {
    setModalMode('edit');
    setSelectedDevice(device);
    setIsAddEditModalVisible(true);
  };

  // Handle view device
  const handleView = (device: Device) => {
    setSelectedDevice(device);
    setIsViewModalVisible(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsAddEditModalVisible(false);
    setIsViewModalVisible(false);
    setIsRegisterModalVisible(false);
    setSelectedDevice(null);
  };

  // Handle device save (add/edit)
  const handleSave = async (deviceData: Partial<Device>) => {
    try {
      if (modalMode === 'add') {
        await api.addDevice(deviceData.deviceId!, deviceData);
        message.success('Device added successfully');
      } else {
        await api.updateDevice(selectedDevice!.deviceId, deviceData);
        message.success('Device updated successfully');
      }
      handleModalClose();
      loadDevices();
    } catch (error) {
      message.error(`Failed to ${modalMode} device`);
      console.error(`Error ${modalMode}ing device:`, error);
    }
  };

  // Handle register device
  const handleRegister = (device: Device) => {
    setSelectedDevice(device);
    setIsRegisterModalVisible(true);
  };

  // Handle device registration save
  const handleRegisterSave = async (
    deviceId: string,
    locationData: { building: string; floor: string; notes?: string }
  ) => {
    try {
      // Get the current device data
      const device = devices.find((d) => d.deviceId === deviceId);
      if (!device) {
        message.error('Device not found');
        return;
      }

      // Update device with location data
      const updatedMetadata = {
        ...device.metadata,
        location: {
          building: locationData.building,
          floor: locationData.floor,
          notes: locationData.notes || '',
        },
      };

      await api.updateDevice(deviceId, {
        metadata: updatedMetadata,
      });

      message.success('Device registered successfully!');
      setIsRegisterModalVisible(false);
      setSelectedDevice(null);
      loadDevices();
      
      // Switch to registered tab after registration
      setActiveTab('registered');
    } catch (error) {
      message.error('Failed to register device');
      console.error('Error registering device:', error);
    }
  };

  // Handle discover devices
  const handleDiscover = async () => {
    setLoading(true);
    try {
      await api.discoverDevices();
      message.success('Device discovery initiated');
      setTimeout(() => loadDevices(), 2000); // Reload after 2 seconds
    } catch (error) {
      message.error('Failed to discover devices');
      console.error('Error discovering devices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter devices based on registration status and search
  const registeredDevices = devices.filter((d) => isDeviceRegistered(d));
  const unregisteredDevices = devices.filter((d) => !isDeviceRegistered(d));

  // Apply search filter to the appropriate tab
  const currentDevices = activeTab === 'registered' ? registeredDevices : unregisteredDevices;
  const filteredDevices = currentDevices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchText.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(searchText.toLowerCase()) ||
      device.type.toLowerCase().includes(searchText.toLowerCase()) ||
      device.ipAddress.toLowerCase().includes(searchText.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: devices.length,
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
    error: devices.filter((d) => d.status === 'error').length,
    maintenance: devices.filter((d) => d.status === 'maintenance').length,
    registered: devices.filter((d) => isDeviceRegistered(d)).length,
    unregistered: devices.filter((d) => !isDeviceRegistered(d)).length,
  };

  // Table columns
  const columns: ColumnsType<Device> = [
    {
      title: 'Device ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 140,
      fixed: 'left',
      render: (text) => <Text strong code>{text}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.type}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      filters: [
        { text: 'Online', value: 'online' },
        { text: 'Offline', value: 'offline' },
        { text: 'Error', value: 'error' },
        { text: 'Maintenance', value: 'maintenance' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: DeviceStatus) => (
        <Tag icon={statusConfig[status].icon} color={statusConfig[status].color}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Registration',
      key: 'registration',
      width: 130,
      filters: [
        { text: 'Registered', value: 'registered' },
        { text: 'Unregistered', value: 'unregistered' },
      ],
      onFilter: (value, record) => {
        const registered = isDeviceRegistered(record);
        return value === 'registered' ? registered : !registered;
      },
      render: (_, record) => {
        const registered = isDeviceRegistered(record);
        return registered ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            REGISTERED
          </Tag>
        ) : (
          <Tag icon={<InfoCircleOutlined />} color="warning">
            UNREGISTERED
          </Tag>
        );
      },
    },
    {
      title: 'Location',
      key: 'location',
      width: 200,
      render: (_, record) => {
        const registered = isDeviceRegistered(record);
        return (
          <Space direction="vertical" size={0}>
            <Space size="small">
              <EnvironmentOutlined style={{ color: registered ? token.colorSuccess : token.colorWarning }} />
              <Text style={{ fontSize: '12px' }}>
                {registered ? (
                  <>
                    <Text strong>{record.metadata?.location?.building}</Text>
                    <br />
                    <Text type="secondary">{record.metadata?.location?.floor}</Text>
                  </>
                ) : (
                  <Text type="secondary">No location set</Text>
                )}
              </Text>
            </Space>
            {record.metadata?.location?.notes && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {record.metadata.location.notes}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Network',
      key: 'network',
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Space size="small">
            <WifiOutlined />
            <Text code style={{ fontSize: '12px' }}>{record.ipAddress}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            v{record.firmwareVersion}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Sensors',
      dataIndex: 'sensors',
      key: 'sensors',
      width: 180,
      render: (sensors: string[]) => (
        <Space wrap size={4}>
          {sensors.map((sensor) => (
            <Tag key={sensor} color="blue" style={{ margin: 0, fontSize: '11px' }}>
              {sensor}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: activeTab === 'unregistered' ? 120 : 150,
      render: (_, record) => {
        const isUnregistered = !isDeviceRegistered(record);
        
        return (
          <Space size="small">
            {/* Unregistered tab: Only show Register button */}
            {activeTab === 'unregistered' && isUnregistered ? (
              <Tooltip title="Register Device">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleRegister(record)}
                  size="small"
                >
                  Register
                </Button>
              </Tooltip>
            ) : (
              /* Registered tab: Show View, Edit, Delete */
              <>
                <Tooltip title="View Details">
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => handleView(record)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Edit Device">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Delete Device">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(record)}
                    size="small"
                  />
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Device Management
            </Title>
            <Text type="secondary">Manage and monitor all your IoT devices</Text>
          </div>
        </div>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6} lg={4}>
            <Card>
              <Statistic
                title="Total Devices"
                value={stats.total}
                prefix={<Badge status="processing" />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Card>
              <Statistic
                title="Online"
                value={stats.online}
                valueStyle={{ color: token.colorSuccess }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Card>
              <Statistic
                title="Offline"
                value={stats.offline}
                valueStyle={{ color: token.colorTextSecondary }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Card>
              <Statistic
                title="Error"
                value={stats.error}
                valueStyle={{ color: token.colorError }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Card>
              <Statistic
                title="Maintenance"
                value={stats.maintenance}
                valueStyle={{ color: token.colorWarning }}
                prefix={<ToolOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Card>
              <Statistic
                title="Registered"
                value={stats.registered}
                valueStyle={{ color: token.colorSuccess }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Card>
              <Statistic
                title="Unregistered"
                value={stats.unregistered}
                valueStyle={{ color: token.colorWarning }}
                prefix={<InfoCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Actions Bar */}
        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Space wrap>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                Add Device
              </Button>
              <Button
                icon={<WifiOutlined />}
                onClick={handleDiscover}
                loading={loading}
              >
                Discover Devices
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadDevices}>
                Refresh
              </Button>
            </Space>
            <Search
              placeholder="Search devices..."
              allowClear
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Space>
        </Card>

        {/* Devices Table with Tabs */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'registered' | 'unregistered')}
            size="large"
          >
            <TabPane
              tab={
                <Space>
                  <CheckCircleOutlined />
                  <span>Registered Devices</span>
                  <Badge count={stats.registered} style={{ backgroundColor: token.colorSuccess }} />
                </Space>
              }
              key="registered"
            >
              <Table
                columns={columns}
                dataSource={filteredDevices}
                rowKey="deviceId"
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} registered devices`,
                }}
                scroll={{ x: 1200 }}
                bordered
              />
            </TabPane>
            <TabPane
              tab={
                <Space>
                  <InfoCircleOutlined />
                  <span>Unregistered Devices</span>
                  <Badge count={stats.unregistered} style={{ backgroundColor: token.colorWarning }} />
                </Space>
              }
              key="unregistered"
            >
              <Table
                columns={columns}
                dataSource={filteredDevices}
                rowKey="deviceId"
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} unregistered devices`,
                }}
                scroll={{ x: 1200 }}
                bordered
              />
            </TabPane>
          </Tabs>
        </Card>

        {/* Add/Edit Modal */}
        <AddEditDeviceModal
          visible={isAddEditModalVisible}
          mode={modalMode}
          device={selectedDevice}
          onSave={handleSave}
          onCancel={handleModalClose}
        />

        {/* View Modal */}
        <ViewDeviceModal
          visible={isViewModalVisible}
          device={selectedDevice}
          onClose={handleModalClose}
        />

        {/* Register Device Modal */}
        <RegisterDeviceModal
          visible={isRegisterModalVisible}
          device={selectedDevice}
          onRegister={handleRegisterSave}
          onCancel={handleModalClose}
        />
      </Space>
    </AdminLayout>
  );
};

export default DeviceManagement;
