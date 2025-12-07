import { useMemo } from 'react';
import type { DeviceWithReadings } from '../../../../schemas';
import { isDeviceRegistered } from '../../../../schemas';

interface UseDeviceFilterProps {
  devices: DeviceWithReadings[];
  activeTab: 'registered' | 'unregistered' | 'deleted';
  searchText: string;
  deletedDevices?: DeviceWithReadings[];
}

export const useDeviceFilter = ({ devices, activeTab, searchText, deletedDevices = [] }: UseDeviceFilterProps) => {
  return useMemo(() => {
    const registered = devices.filter((d) => isDeviceRegistered(d));
    const unregistered = devices.filter((d) => !isDeviceRegistered(d));
    
    const currentDevices = activeTab === 'registered' 
      ? registered 
      : activeTab === 'unregistered'
      ? unregistered
      : deletedDevices;
    
    const searchLower = searchText.toLowerCase();
    const filtered = searchText
      ? currentDevices.filter(
          (device) =>
            device.name.toLowerCase().includes(searchLower) ||
            device.deviceId.toLowerCase().includes(searchLower) ||
            device.type.toLowerCase().includes(searchLower) ||
            device.ipAddress.toLowerCase().includes(searchLower)
        )
      : currentDevices;

    return {
      registeredDevices: registered,
      unregisteredDevices: unregistered,
      filteredDevices: filtered,
      stats: {
        total: devices.length,
        online: devices.filter((d) => d.status === 'online').length,
        offline: devices.filter((d) => d.status === 'offline').length,
        registered: registered.length,
        unregistered: unregistered.length,
        deleted: deletedDevices.length,
      },
    };
  }, [devices, activeTab, searchText, deletedDevices]);
};
