import { useState, useMemo, useEffect } from 'react';
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
import { useDevices, useDeviceMutations } from '../../../hooks';
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
 * - useDevices() - Real-time device data
 * - useDeviceMutations() - Device write operations (add, update, delete, register)
 * - useDeviceFilter() - Local UI logic for filtering and stats
 */
export const AdminDeviceManagement = () => {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'registered' | 'unregistered'>('registered');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ GLOBAL HOOK - Real-time device data
  // Use more aggressive polling (5s) when on unregistered tab to catch new devices quickly
  const pollInterval = activeTab === 'unregistered' ? 5000 : 15000;
  
  // Don't pass any filters - get ALL devices and filter client-side
  // This ensures we get both registered and unregistered devices
  const {
    devices: devicesWithSensorData,
    isLoading,
    refetch,
  } = useDevices({ 
    pollInterval,
    filters: {}, // Explicitly pass empty filters to get all devices
  });

  // ✅ GLOBAL HOOK - Device write operations
  const {
    deleteDevice,
    registerDevice,
  } = useDeviceMutations();

  // Extract Device objects - devices already have metadata
  const devices = useMemo(() => {
    return devicesWithSensorData as Device[];
  }, [devicesWithSensorData]);

  // ✅ LOCAL HOOK - UI-specific filtering logic
  const { filteredDevices, stats } = useDeviceFilter({
    devices,
    activeTab,
    searchText,
  });

  // Auto-refetch when switching to unregistered tab to see latest pending devices
  useEffect(() => {
    if (activeTab === 'unregistered') {
      console.log('[AdminDeviceManagement] Switched to unregistered tab - refetching devices');
      // Show subtle message about auto-refresh
      const unregisteredCount = stats.unregistered;
      if (unregisteredCount > 0) {
        message.info(`Found ${unregisteredCount} device${unregisteredCount > 1 ? 's' : ''} pending registration`, 2);
      }
      refetch();
    }
  }, [activeTab, refetch, stats.unregistered]);

  // Device action handlers
  const handleView = (device: Device) => {
    setSelectedDevice(device);
    setIsViewModalVisible(true);
  };

  const handleDelete = (device: Device) => {
    Modal.confirm({
      title: 'Delete Device',
      content: (
        <div>
          <p>Are you sure you want to delete "<strong>{device.name}</strong>"?</p>
          <p style={{ marginTop: '8px', color: '#ff4d4f' }}>
            This will:
          </p>
          <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
            <li>Send deregistration command to the device via MQTT</li>
            <li>Remove the device from the system database</li>
            <li>Delete all associated data and history</li>
          </ul>
          <p style={{ marginTop: '8px', fontWeight: 'bold' }}>
            This action cannot be undone.
          </p>
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // Backend deleteDevice automatically sends 'deregister' command
          // and handles device cleanup
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

  // Handle refresh with loading state
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent spam clicks
    
    setIsRefreshing(true);
    try {
      await refetch();
      setTimeout(() => setIsRefreshing(false), 500);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
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
              icon: <ReloadOutlined spin={isRefreshing} />,
              onClick: handleRefresh,
              disabled: isRefreshing,
              loading: isRefreshing,
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
