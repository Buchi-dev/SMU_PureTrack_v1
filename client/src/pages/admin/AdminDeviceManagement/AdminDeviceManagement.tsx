import { useState } from 'react';
import { AdminLayout } from '../../../components/layouts';
import {
  DeviceHeader,
  DeviceStats,
  DeviceTable,
  AddEditDeviceModal,
  ViewDeviceModal,
  RegisterDeviceModal,
} from './components';
import { useDeviceManagement, useDeviceActions, useDeviceFilter } from './hooks';
import './DeviceManagement.css';

export const AdminDeviceManagement = () => {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'registered' | 'unregistered'>('registered');

  const { devices, loading, loadDevices } = useDeviceManagement();
  
  const {
    selectedDevice,
    isAddEditModalVisible,
    isViewModalVisible,
    isRegisterModalVisible,
    modalMode,
    handleDelete,
    handleEdit,
    handleView,
    handleModalClose,
    handleSave,
    handleRegister,
    handleRegisterSave,
  } = useDeviceActions(loadDevices);

  const { filteredDevices, stats } = useDeviceFilter({
    devices,
    activeTab,
    searchText,
  });

  const handleRegisterWithTabSwitch = async (
    deviceId: string,
    locationData: { building: string; floor: string; notes?: string }
  ) => {
    const success = await handleRegisterSave(deviceId, locationData);
    if (success) {
      setActiveTab('registered');
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
        <DeviceHeader onRefresh={loadDevices} onSearchChange={setSearchText} />

        <DeviceStats stats={stats} />

        <DeviceTable
          activeTab={activeTab}
          onTabChange={setActiveTab}
          filteredDevices={filteredDevices}
          loading={loading}
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
