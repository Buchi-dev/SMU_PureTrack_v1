import { useMemo } from 'react';
import type { Device } from '../../../../schemas';
import { isDeviceRegistered } from '../../../../schemas';

interface UseDeviceFilterProps {
  devices: Device[];
  activeTab: 'registered' | 'unregistered';
  searchText: string;
}

export const useDeviceFilter = ({ devices, activeTab, searchText }: UseDeviceFilterProps) => {
  return useMemo(() => {
    const registered = devices.filter((d) => isDeviceRegistered(d));
    const unregistered = devices.filter((d) => !isDeviceRegistered(d));
    
    const currentDevices = activeTab === 'registered' ? registered : unregistered;
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
        maintenance: devices.filter((d) => d.status === 'maintenance').length,
        registered: registered.length,
        unregistered: unregistered.length,
      },
    };
  }, [devices, activeTab, searchText]);
};
