/**
 * useCall_Devices - Write Hook
 * 
 * Handles device write operations (add, update, delete, register).
 * Wraps devicesService functions with React-friendly state management.
 * 
 * ⚠️ WRITE ONLY - Does not handle real-time subscriptions
 * 
 * @module hooks/writes
 */

import { useMutation } from './useMutation';
import { devicesService } from '../../services/devices.Service';
import type { Device, DeviceData } from '../../schemas';

/**
 * Hook return value
 */
interface UseCallDevicesReturn {
  /** Add a new device */
  addDevice: (deviceId: string, deviceData: DeviceData) => Promise<Device>;
  /** Update an existing device */
  updateDevice: (deviceId: string, deviceData: DeviceData) => Promise<void>;
  /** Delete a device */
  deleteDevice: (deviceId: string) => Promise<void>;
  /** Register a device with location */
  registerDevice: (deviceId: string, building: string, floor: string, notes?: string) => Promise<void>;
  /** Loading state for any operation */
  isLoading: boolean;
  /** Error from last operation (combined from all mutations) */
  error: Error | null;
  /** Success flag - true after successful operation */
  isSuccess: boolean;
  /** Result from last add operation */
  addedDevice: Device | null;
  /** Reset error, success states, and added device */
  reset: () => void;
  /** 
   * Granular error tracking for each operation type.
   * Useful when you need to know which specific operation failed.
   */
  errors: {
    add: Error | null;
    update: Error | null;
    delete: Error | null;
    register: Error | null;
  };
  /**
   * Granular loading tracking for each operation type.
   * Useful for showing operation-specific loading indicators.
   */
  loadingStates: {
    isAdding: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isRegistering: boolean;
  };
}

/**
 * Hook for device write operations
 * 
 * Provides functions for all device CRUD operations with proper
 * loading/error/success state management.
 * 
 * @example
 * ```tsx
 * const { 
 *   addDevice, 
 *   updateDevice, 
 *   deleteDevice, 
 *   registerDevice,
 *   isLoading, 
 *   error, 
 *   isSuccess,
 *   addedDevice
 * } = useCall_Devices();
 * 
 * // Add new device
 * const device = await addDevice('ESP32-001', {
 *   name: 'Water Quality Sensor 1',
 *   type: 'ESP32',
 *   sensors: ['tds', 'ph', 'turbidity']
 * });
 * 
 * // Update device with granular loading state
 * if (loadingStates.isUpdating) {
 *   console.log('Updating device...');
 * }
 * await updateDevice('ESP32-001', { status: 'maintenance' });
 * 
 * // Check specific error
 * if (errors.update) {
 *   console.error('Update failed:', errors.update.message);
 * }
 * 
 * // Register device location
 * await registerDevice('ESP32-001', 'Building A', 'Floor 2', 'Near cafeteria');
 * 
 * // Delete device
 * await deleteDevice('ESP32-001');
 * ```
 * 
 * @returns Device operation functions and state
 */
export const useCall_Devices = (): UseCallDevicesReturn => {
  const addMutation = useMutation<Device, Error, { deviceId: string; deviceData: DeviceData }>({
    mutationFn: async ({ deviceId, deviceData }) => {
      return await devicesService.addDevice(deviceId, deviceData);
    },
    invalidateQueries: [['devices', 'realtime']], // Auto-refresh devices list
    onError: (error) => {
      console.error('[useCall_Devices] Add error:', error);
    },
  });

  const updateMutation = useMutation<void, Error, { deviceId: string; deviceData: DeviceData }>({
    mutationFn: async ({ deviceId, deviceData }) => {
      await devicesService.updateDevice(deviceId, deviceData);
    },
    invalidateQueries: [['devices', 'realtime']], // Auto-refresh devices list
    onError: (error) => {
      console.error('[useCall_Devices] Update error:', error);
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (deviceId) => {
      await devicesService.deleteDevice(deviceId);
    },
    invalidateQueries: [['devices', 'realtime']], // Auto-refresh devices list
    onError: (error) => {
      console.error('[useCall_Devices] Delete error:', error);
    },
  });

  const registerMutation = useMutation<void, Error, { deviceId: string; building: string; floor: string; notes?: string }>({
    mutationFn: async ({ deviceId, building, floor, notes }) => {
      await devicesService.registerDevice(deviceId, building, floor, notes);
    },
    invalidateQueries: [['devices', 'realtime']], // Auto-refresh devices list
    onError: (error) => {
      console.error('[useCall_Devices] Register error:', error);
    },
  });

  // Determine combined loading/error/success state (React Query uses 'isPending')
  const isLoading = 
    addMutation.isPending || 
    updateMutation.isPending || 
    deleteMutation.isPending || 
    registerMutation.isPending;
  
  const error = 
    addMutation.error || 
    updateMutation.error || 
    deleteMutation.error || 
    registerMutation.error;
  
  const isSuccess = 
    addMutation.isSuccess || 
    updateMutation.isSuccess || 
    deleteMutation.isSuccess || 
    registerMutation.isSuccess;

  const reset = () => {
    addMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
    registerMutation.reset();
  };

  return {
    addDevice: (deviceId: string, deviceData: DeviceData) => 
      addMutation.mutateAsync({ deviceId, deviceData }),
    updateDevice: (deviceId: string, deviceData: DeviceData) => 
      updateMutation.mutateAsync({ deviceId, deviceData }),
    deleteDevice: deleteMutation.mutateAsync,
    registerDevice: (deviceId: string, building: string, floor: string, notes?: string) => 
      registerMutation.mutateAsync({ deviceId, building, floor, notes }),
    isLoading,
    error,
    isSuccess,
    addedDevice: addMutation.data ?? null,
    reset,
    // Granular error tracking
    errors: {
      add: addMutation.error,
      update: updateMutation.error,
      delete: deleteMutation.error,
      register: registerMutation.error,
    },
    // Granular loading tracking
    loadingStates: {
      isAdding: addMutation.isPending,
      isUpdating: updateMutation.isPending,
      isDeleting: deleteMutation.isPending,
      isRegistering: registerMutation.isPending,
    },
  };
};

export default useCall_Devices;
