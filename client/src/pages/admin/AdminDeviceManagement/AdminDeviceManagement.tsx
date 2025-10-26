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
  Statistic,
  Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
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

export const AdminDeviceManagement = () => {
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

  // Inject custom table styles
  useEffect(() => {
    const styleId = 'device-table-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.innerHTML = `
        .ant-table-row-striped {
          background-color: rgba(0, 0, 0, 0.02);
        }
        .ant-table-row-striped:hover > td {
          background-color: rgba(0, 0, 0, 0.04) !important;
        }
        .device-table .ant-table-tbody > tr > td {
          padding: 12px 16px !important;
        }
        .device-table .ant-table-thead > tr > th {
          font-weight: 600 !important;
          background-color: #fafafa !important;
          padding: 14px 16px !important;
        }
        
        /* Unregistered devices special styling */
        .unregistered-devices-table .unregistered-row {
          border-left: 3px solid #faad14;
          background-color: #fffbe6;
        }
        .unregistered-devices-table .unregistered-row.ant-table-row-striped {
          background-color: #fff7e6;
        }
        .unregistered-devices-table .unregistered-row:hover > td {
          background-color: #fff1b8 !important;
        }
        .unregistered-devices-table .ant-table-thead > tr > th {
          background-color: #fff7e6 !important;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }, []);

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
    maintenance: devices.filter((d) => d.status === 'maintenance').length,
    registered: devices.filter((d) => isDeviceRegistered(d)).length,
    unregistered: devices.filter((d) => !isDeviceRegistered(d)).length,
  };

  // Table columns - Optimized responsive design
  const columns: ColumnsType<Device> = [
    {
      title: 'Device ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      fixed: 'left',
      width: 150,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text strong code style={{ fontSize: '12px' }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      ellipsis: true,
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: '13px' }}>{text}</Text>
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
      width: 120,
      align: 'center',
      filters: [
        { text: 'Online', value: 'online' },
        { text: 'Offline', value: 'offline' },
        { text: 'Maintenance', value: 'maintenance' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: DeviceStatus) => (
        <Tag 
          icon={statusConfig[status].icon} 
          color={statusConfig[status].color}
          style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
        >
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Registration',
      key: 'registration',
      width: 130,
      align: 'center',
      responsive: ['md'],
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
          <Tag 
            icon={<CheckCircleOutlined />} 
            color="success" 
            style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
          >
            REGISTERED
          </Tag>
        ) : (
          <Tag 
            icon={<InfoCircleOutlined />} 
            color="warning" 
            style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
          >
            UNREGISTERED
          </Tag>
        );
      },
    },
    {
      title: 'Location',
      key: 'location',
      width: 200,
      responsive: ['lg'],
      ellipsis: true,
      render: (_, record) => {
        const registered = isDeviceRegistered(record);
        return (
          <Space size="small" style={{ width: '100%' }}>
            <EnvironmentOutlined 
              style={{ 
                color: registered ? token.colorSuccess : token.colorTextDisabled,
                fontSize: '14px'
              }} 
            />
            {registered ? (
              <Space direction="vertical" size={0} style={{ flex: 1 }}>
                <Text strong style={{ fontSize: '12px' }}>
                  {record.metadata?.location?.building || 'N/A'}
                </Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {record.metadata?.location?.floor || 'N/A'}
                </Text>
              </Space>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                Not assigned
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
      responsive: ['lg'],
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Space size="small">
            <WifiOutlined style={{ color: token.colorPrimary, fontSize: '12px' }} />
            <Text code style={{ fontSize: '11px' }}>{record.ipAddress}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Firmware: v{record.firmwareVersion}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: activeTab === 'unregistered' ? 120 : 140,
      align: 'center',
      render: (_, record) => {
        const isUnregistered = !isDeviceRegistered(record);
        
        return (
          <Space size={4}>
            {/* Unregistered tab: Only show Register button */}
            {activeTab === 'unregistered' && isUnregistered ? (
              <Tooltip title="Register this device to a location">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleRegister(record)}
                  size="small"
                  style={{ fontWeight: 500 }}
                >
                  Register
                </Button>
              </Tooltip>
            ) : (
              /* Registered tab: Show View, Edit, Delete */
              <>
                <Tooltip title="View Details">
                  <Button
                    type="default"
                    icon={<EyeOutlined />}
                    onClick={() => handleView(record)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Edit Device">
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Delete Device">
                  <Button
                    type="default"
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

  // Simplified columns for unregistered devices - Focus on essential info
  const unregisteredColumns: ColumnsType<Device> = [
    {
      title: 'Device ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      fixed: 'left',
      width: 160,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Space size="small">
            <WarningOutlined style={{ color: token.colorWarning, fontSize: '14px' }} />
            <Text strong code style={{ fontSize: '12px' }}>
              {text}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Device Information',
      key: 'deviceInfo',
      width: 280,
      render: (_, record) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space size="small" style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '14px' }}>{record.name}</Text>
            <Tag color="blue" style={{ fontSize: '10px', padding: '2px 6px' }}>
              {record.type}
            </Tag>
          </Space>
          <Space size="small" wrap>
            <WifiOutlined style={{ color: token.colorPrimary, fontSize: '12px' }} />
            <Text code style={{ fontSize: '11px' }}>{record.ipAddress}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              • v{record.firmwareVersion}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      filters: [
        { text: 'Online', value: 'online' },
        { text: 'Offline', value: 'offline' },
        { text: 'Maintenance', value: 'maintenance' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: DeviceStatus) => (
        <Tag 
          icon={statusConfig[status].icon} 
          color={statusConfig[status].color}
          style={{ fontSize: '11px', fontWeight: 500, padding: '4px 8px' }}
        >
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Sensors Detected',
      dataIndex: 'sensors',
      key: 'sensors',
      width: 250,
      responsive: ['lg'],
      render: (sensors: string[]) => (
        <Space wrap size={4}>
          {sensors.slice(0, 4).map((sensor) => (
            <Tag 
              key={sensor} 
              color="blue" 
              style={{ margin: 0, fontSize: '11px', padding: '2px 6px' }}
            >
              {sensor}
            </Tag>
          ))}
          {sensors.length > 4 && (
            <Tooltip title={sensors.slice(4).join(', ')}>
              <Tag color="default" style={{ margin: 0, fontSize: '11px', padding: '2px 6px' }}>
                +{sensors.length - 4} more
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Registration Status',
      key: 'registrationStatus',
      width: 180,
      align: 'center',
      render: () => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Tag 
            icon={<InfoCircleOutlined />} 
            color="warning" 
            style={{ 
              fontSize: '11px', 
              fontWeight: 500, 
              padding: '4px 8px',
              width: '100%'
            }}
          >
            UNREGISTERED
          </Tag>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Location not assigned
          </Text>
        </Space>
      ),
    },
    {
      title: 'Action Required',
      key: 'actions',
      fixed: 'right',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Assign this device to a building and floor location">
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleRegister(record)}
            size="middle"
            style={{ fontWeight: 500 }}
          >
            Register Now
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        height: '100%',
        padding: '4px'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px' 
        }}>
          <div>
            <Title level={2} style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
              Device Management
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Manage and monitor all your IoT devices
            </Text>
          </div>
          <Space size="middle">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadDevices}
              size="middle"
            >
              Refresh
            </Button>
            <Search
              placeholder="Search devices by name, ID, type, or IP..."
              allowClear
              prefix={<SearchOutlined />}
              style={{ width: '320px' }}
              onChange={(e) => setSearchText(e.target.value)}
              size="middle"
            />
          </Space>
        </div>

        {/* Statistics Cards - Optimized Grid Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
        }}>
          <Card 
            size="small" 
            bodyStyle={{ padding: '16px' }}
            style={{ borderRadius: '8px' }}
          >
            <Statistic
              title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Total Devices</span>}
              value={stats.total}
              valueStyle={{ fontSize: '28px', fontWeight: 600 }}
              prefix={<Badge status="processing" />}
            />
          </Card>
          <Card 
            size="small" 
            bodyStyle={{ padding: '16px' }}
            style={{ borderRadius: '8px' }}
          >
            <Statistic
              title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Online</span>}
              value={stats.online}
              valueStyle={{ color: token.colorSuccess, fontSize: '28px', fontWeight: 600 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
          <Card 
            size="small" 
            bodyStyle={{ padding: '16px' }}
            style={{ borderRadius: '8px' }}
          >
            <Statistic
              title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Offline</span>}
              value={stats.offline}
              valueStyle={{ color: token.colorTextSecondary, fontSize: '28px', fontWeight: 600 }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
          <Card 
            size="small" 
            bodyStyle={{ padding: '16px' }}
            style={{ borderRadius: '8px' }}
          >
            <Statistic
              title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Maintenance</span>}
              value={stats.maintenance}
              valueStyle={{ color: token.colorWarning, fontSize: '28px', fontWeight: 600 }}
              prefix={<ToolOutlined />}
            />
          </Card>
          <Card 
            size="small" 
            bodyStyle={{ padding: '16px' }}
            style={{ borderRadius: '8px' }}
          >
            <Statistic
              title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Registered</span>}
              value={stats.registered}
              valueStyle={{ color: token.colorSuccess, fontSize: '28px', fontWeight: 600 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
          <Card 
            size="small" 
            bodyStyle={{ padding: '16px' }}
            style={{ borderRadius: '8px' }}
          >
            <Statistic
              title={<span style={{ fontSize: '13px', fontWeight: 500 }}>Unregistered</span>}
              value={stats.unregistered}
              valueStyle={{ color: token.colorWarning, fontSize: '28px', fontWeight: 600 }}
              prefix={<InfoCircleOutlined />}
            />
          </Card>
        </div>

        {/* Devices Table with Tabs */}
        <Card 
          size="small" 
          bodyStyle={{ padding: '0' }}
          style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'registered' | 'unregistered')}
            size="large"
            style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
            }}
            tabBarStyle={{ 
              margin: 0,
              padding: '12px 16px 0',
              backgroundColor: token.colorBgContainer
            }}
          >
            <TabPane
              tab={
                <Space size="middle">
                  <CheckCircleOutlined style={{ fontSize: '16px' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Registered Devices</span>
                  <Badge 
                    count={stats.registered} 
                    style={{ 
                      backgroundColor: token.colorSuccess,
                      fontWeight: 600
                    }} 
                  />
                </Space>
              }
              key="registered"
              style={{ height: '100%' }}
            >
              <div style={{ padding: '16px' }}>
                <Table
                  className="device-table"
                  columns={columns}
                  dataSource={filteredDevices}
                  rowKey="deviceId"
                  loading={loading}
                  size="middle"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total) => (
                      <Text strong style={{ fontSize: '13px' }}>
                        Total {total} registered device{total !== 1 ? 's' : ''}
                      </Text>
                    ),
                    size: 'default',
                    position: ['bottomCenter'],
                  }}
                  scroll={{ x: 1200, y: 'calc(100vh - 520px)' }}
                  bordered
                  rowClassName={(_, index) => 
                    index % 2 === 0 ? '' : 'ant-table-row-striped'
                  }
                  style={{
                    backgroundColor: token.colorBgContainer,
                  }}
                />
              </div>
            </TabPane>
            <TabPane
              tab={
                <Space size="middle">
                  <InfoCircleOutlined style={{ fontSize: '16px' }} />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Unregistered Devices</span>
                  <Badge 
                    count={stats.unregistered} 
                    style={{ 
                      backgroundColor: token.colorWarning,
                      fontWeight: 600
                    }} 
                  />
                </Space>
              }
              key="unregistered"
              style={{ height: '100%' }}
            >
              <div style={{ padding: '16px' }}>
                {/* Info Banner for Unregistered Devices */}
                {filteredDevices.length > 0 && (
                  <div style={{
                    padding: '16px 20px',
                    marginBottom: '16px',
                    backgroundColor: token.colorWarningBg,
                    border: `1px solid ${token.colorWarningBorder}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <InfoCircleOutlined style={{ 
                      fontSize: '20px', 
                      color: token.colorWarning 
                    }} />
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ 
                        fontSize: '14px', 
                        color: token.colorWarningText,
                        display: 'block',
                        marginBottom: '4px'
                      }}>
                        Unregistered Devices Detected
                      </Text>
                      <Text style={{ 
                        fontSize: '13px', 
                        color: token.colorTextSecondary 
                      }}>
                        These devices need to be assigned to a location before they can be used. 
                        Click the "Register Now" button to assign a building and floor.
                      </Text>
                    </div>
                  </div>
                )}

                <Table
                  className="device-table unregistered-devices-table"
                  columns={unregisteredColumns}
                  dataSource={filteredDevices}
                  rowKey="deviceId"
                  loading={loading}
                  size="middle"
                  locale={{
                    emptyText: (
                      <div style={{ 
                        padding: '60px 20px',
                        textAlign: 'center'
                      }}>
                        <CheckCircleOutlined style={{ 
                          fontSize: '64px', 
                          color: token.colorSuccess,
                          marginBottom: '16px',
                          display: 'block'
                        }} />
                        <Title level={4} style={{ 
                          margin: '0 0 8px 0',
                          color: token.colorText
                        }}>
                          All Devices Registered!
                        </Title>
                        <Text type="secondary" style={{ fontSize: '14px' }}>
                          Great job! All your devices have been assigned to locations.
                        </Text>
                      </div>
                    )
                  }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <WarningOutlined style={{ color: token.colorWarning }} />
                        <Text strong style={{ fontSize: '13px' }}>
                          {total} device{total !== 1 ? 's' : ''} pending registration
                        </Text>
                      </div>
                    ),
                    size: 'default',
                    position: ['bottomCenter'],
                  }}
                  scroll={{ 
                    x: 1300, 
                    y: filteredDevices.length > 0 ? 'calc(100vh - 640px)' : 'calc(100vh - 560px)' 
                  }}
                  bordered
                  rowClassName={(_, index) => 
                    index % 2 === 0 ? 'unregistered-row' : 'unregistered-row ant-table-row-striped'
                  }
                  style={{
                    backgroundColor: token.colorBgContainer,
                  }}
                />
              </div>
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
      </div>
    </AdminLayout>
  );
};
