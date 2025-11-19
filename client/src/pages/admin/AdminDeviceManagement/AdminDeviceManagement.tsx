import { useState, useMemo } from 'react';
import { Layout, Modal, message, Space, Input } from 'antd';
import { ApiOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { PageHeader } from '../../../components/PageHeader';
import {
  DeviceStats,
  DeviceTable,
  ViewDeviceModal,
  RegisterDeviceModal,
} from './components';
import { useDeviceFilter } from './hooks';
import { useRealtime_Devices, useCall_Devices } from '../../../hooks';
import type { Device } from '../../../schemas';
import './DeviceManagement.css';

const { Content } = Layout;
const { Search } = Input;

/**
 * AdminDeviceManagement - Device Management Page
 * 
 * Manages IoT devices with CRUD operations and registration.
 * 
 * Architecture: Uses GLOBAL hooks for data fetching and mutations
 * - useRealtime_Devices() - Real-time device data from Firestore/RTDB
 * - useCall_Devices() - Device write operations (add, update, delete, register)
 * - useDeviceFilter() - Local UI logic for filtering and stats
 */
export const AdminDeviceManagement = () => {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'registered' | 'unregistered'>('registered');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);

  // ✅ GLOBAL HOOK - Real-time device data
  const {
    devices: devicesWithSensorData,
    isLoading,
    refetch,
  } = useRealtime_Devices({ includeMetadata: true });

  // ✅ GLOBAL HOOK - Device write operations
  const {
    deleteDevice,
    registerDevice,
  } = useCall_Devices();

  // Extract Device objects from metadata
  const devices = useMemo(() => {
    return devicesWithSensorData
      .map((d) => d.metadata)
      .filter((d): d is Device => d !== undefined);
  }, [devicesWithSensorData]);

  // ✅ LOCAL HOOK - UI-specific filtering logic
  const { filteredDevices, stats } = useDeviceFilter({
    devices,
    activeTab,
    searchText,
  });

  // Device action handlers
  const handleView = (device: Device) => {
    setSelectedDevice(device);
    setIsViewModalVisible(true);
  };

  const handleDelete = (device: Device) => {
    Modal.confirm({
      title: 'Delete Device',
      content: `Are you sure you want to delete "${device.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteDevice(device.deviceId);
          message.success('Device deleted successfully');
          refetch();
        } catch (error) {
          message.error('Failed to delete device');
          console.error('Error deleting device:', error);
        }
      },
    });
  };

  const handleRegister = (device: Device) => {
    setSelectedDevice(device);
    setIsRegisterModalVisible(true);
  };

  const handleModalClose = () => {
    setIsViewModalVisible(false);
    setIsRegisterModalVisible(false);
    setSelectedDevice(null);
  };

  const handleRegisterWithTabSwitch = async (
    deviceId: string,
    locationData: { building: string; floor: string; notes?: string }
  ) => {
    try {
      await registerDevice(
        deviceId,
        locationData.building,
        locationData.floor,
        locationData.notes
      );
      message.success('Device registered successfully!');
      setIsRegisterModalVisible(false);
      setSelectedDevice(null);
      setActiveTab('registered');
      refetch();
    } catch (error) {
      message.error('Failed to register device');
      console.error('Error registering device:', error);
    }
  };

  return (
    <AdminLayout>
      <Content style={{ padding: '24px' }}>
        <PageHeader
          title="Device Management"
          icon={<ApiOutlined />}
          description="Manage IoT devices, monitor status, and register new devices"
          breadcrumbItems={[
            { title: 'Devices', icon: <ApiOutlined /> }
          ]}
          actions={[
            {
              key: 'refresh',
              label: 'Refresh',
              icon: <ReloadOutlined spin={isLoading} />,
              onClick: refetch,
              disabled: isLoading,
            }
          ]}
        >
          {/* Search Bar */}
          <Search
            placeholder="Search devices by name, MAC address, or IP..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 500 }}
          />
        </PageHeader>

        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
          <DeviceStats stats={stats} />

          <DeviceTable
            activeTab={activeTab}
            onTabChange={setActiveTab}
            filteredDevices={filteredDevices}
            loading={isLoading}
            stats={stats}
            onView={handleView}
            onDelete={handleDelete}
            onRegister={handleRegister}
          />
        </Space>

        <ViewDeviceModal
          visible={isViewModalVisible}
          device={selectedDevice}
          onClose={handleModalClose}
        />

        <RegisterDeviceModal
          visible={isRegisterModalVisible}
          device={selectedDevice}
          onRegister={handleRegisterWithTabSwitch}
          onCancel={handleModalClose}
        />
      </Content>
    </AdminLayout>
  );
};
