import { useState, useMemo } from 'react';
import { Modal, message } from 'antd';
import { AdminLayout } from '../../../components/layouts';
import {
  DeviceHeader,
  DeviceStats,
  DeviceTable,
  AddEditDeviceModal,
  ViewDeviceModal,
  RegisterDeviceModal,
} from './components';
import { useDeviceFilter } from './hooks';
import { useRealtime_Devices, useCall_Devices } from '../../../hooks';
import type { Device } from '../../../schemas';
import './DeviceManagement.css';

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
  const [isAddEditModalVisible, setIsAddEditModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  // ✅ GLOBAL HOOK - Real-time device data
  const {
    devices: devicesWithSensorData,
    isLoading,
    refetch,
  } = useRealtime_Devices({ includeMetadata: true });

  // ✅ GLOBAL HOOK - Device write operations
  const {
    addDevice,
    updateDevice,
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

  const handleEdit = (device: Device) => {
    setModalMode('edit');
    setSelectedDevice(device);
    setIsAddEditModalVisible(true);
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
    setIsAddEditModalVisible(false);
    setIsViewModalVisible(false);
    setIsRegisterModalVisible(false);
    setSelectedDevice(null);
  };

  const handleSave = async (deviceData: Partial<Device>) => {
    try {
      if (modalMode === 'add') {
        await addDevice(deviceData.deviceId!, deviceData);
        message.success('Device added successfully');
      } else {
        await updateDevice(selectedDevice!.deviceId, deviceData);
        message.success('Device updated successfully');
      }
      handleModalClose();
      refetch();
    } catch (error) {
      message.error(`Failed to ${modalMode} device`);
      console.error(`Error ${modalMode}ing device:`, error);
    }
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          height: '100%',
          padding: '4px',
        }}
      >
        <DeviceHeader onRefresh={refetch} onSearchChange={setSearchText} />

        <DeviceStats stats={stats} />

        <DeviceTable
          activeTab={activeTab}
          onTabChange={setActiveTab}
          filteredDevices={filteredDevices}
          loading={isLoading}
          stats={stats}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRegister={handleRegister}
        />

        <AddEditDeviceModal
          visible={isAddEditModalVisible}
          mode={modalMode}
          device={selectedDevice}
          onSave={handleSave}
          onCancel={handleModalClose}
        />

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
      </div>
    </AdminLayout>
  );
};
