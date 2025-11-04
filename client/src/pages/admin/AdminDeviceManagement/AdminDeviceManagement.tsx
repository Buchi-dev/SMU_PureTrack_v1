import { useState, useEffect } from 'react';
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

export const AdminDeviceManagement = () => {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'registered' | 'unregistered'>('registered');

  // Custom hooks with real-time updates enabled
  const { devices, loading, loadDevices } = useDeviceManagement({
    enableRealtime: true, // Enable real-time sensor data updates
  });
  
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

  // Handle device registration with tab switch
  const handleRegisterWithTabSwitch = async (
    deviceId: string,
    locationData: { building: string; floor: string; notes?: string }
  ) => {
    const success = await handleRegisterSave(deviceId, locationData);
    if (success) {
      setActiveTab('registered');
    }
  };

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
        {/* Header */}
        <DeviceHeader onRefresh={loadDevices} onSearchChange={setSearchText} />

        {/* Statistics Cards */}
        <DeviceStats stats={stats} />

        {/* Devices Table with Tabs */}
        <DeviceTable
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as 'registered' | 'unregistered')}
          filteredDevices={filteredDevices}
          loading={loading}
          stats={stats}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRegister={handleRegister}
        />

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
          onRegister={handleRegisterWithTabSwitch}
          onCancel={handleModalClose}
        />
      </div>
    </AdminLayout>
  );
};
