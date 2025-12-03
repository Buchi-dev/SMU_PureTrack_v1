/**
 * Devices Service
 * 
 * Manages IoT devices and their sensor readings through Express REST API.
 * 
 * Write Operations: REST API (PATCH /api/devices/:id, DELETE /api/devices/:id)
 * Read Operations: REST API with SWR polling for real-time updates
 * 
 * Features:
 * - Device CRUD operations
 * - Sensor reading retrieval with pagination
 * - Device statistics
 * - Multi-device monitoring
 * 
 * @module services/devices
 */

import { apiClient, getErrorMessage } from '../config/api.config';
import {
  DEVICE_ENDPOINTS,
  buildDevicesUrl,
  buildDeviceReadingsUrl,
} from '../config/endpoints';
import type { Device, SensorReading } from '../schemas';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DeviceFilters {
  status?: 'online' | 'offline';
  registrationStatus?: 'registered' | 'pending';
  page?: number;
  limit?: number;
}

export interface DeviceReadingFilters {
  limit?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
}

export interface DeviceListResponse {
  success: boolean;
  data: Device[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface DeviceResponse {
  success: boolean;
  data: Device;
  message?: string;
}

export interface DeviceReadingsResponse {
  success: boolean;
  data: SensorReading[];
  metadata?: {
    count: number;
    avgPH: number;
    avgTurbidity: number;
    avgTDS: number;
  };
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  registered: number;
  pending: number;
}

export interface DeviceStatsResponse {
  success: boolean;
  data: DeviceStats;
}

export interface UpdateDevicePayload {
  location?: string;
  registrationStatus?: 'registered' | 'pending';
  status?: 'online' | 'offline';
  deviceName?: string;
  metadata?: {
    location?: {
      building: string;
      floor: string;
      notes?: string;
    };
    firmware?: string;
    hardware?: string;
    ipAddress?: string;
    [key: string]: any; // Allow additional properties
  };
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DevicesService {

  // ==========================================================================
  // WRITE OPERATIONS (REST API)
  // ==========================================================================

  /**
   * Update device properties (admin only)
   * Used to set location, registration status, or device name
   * 
   * @param deviceId - Device ID to update
   * @param data - Device properties to update
   * @throws {Error} If update fails
   * @example
   * await devicesService.updateDevice('WQ-001', { 
   *   location: 'Building A', 
   *   registrationStatus: 'registered' 
   * });
   */
  async updateDevice(
    deviceId: string,
    data: UpdateDevicePayload
  ): Promise<DeviceResponse> {
    try {
      const response = await apiClient.patch<DeviceResponse>(
        DEVICE_ENDPOINTS.UPDATE(deviceId),
        data
      );
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[DevicesService] Update error:', message);
      throw new Error(message);
    }
  }

  /**
   * Register a device by setting its location (convenience method)
   * 
   * @param deviceId - Device ID to register
   * @param location - Physical location of device
   * @throws {Error} If registration fails
   * @example
   * await devicesService.registerDevice('WQ-001', 'Building A - Floor 2');
   */
  async registerDevice(deviceId: string, location: string): Promise<DeviceResponse> {
    return this.updateDevice(deviceId, {
      location,
      registrationStatus: 'registered',
    });
  }

  /**
   * Delete a device (admin only)
   * Removes device and all associated sensor readings
   * 
   * @param deviceId - Device ID to delete
   * @throws {Error} If deletion fails
   * @example
   * await devicesService.deleteDevice('WQ-001');
   */
  async deleteDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        DEVICE_ENDPOINTS.DELETE(deviceId)
      );
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[DevicesService] Delete error:', message);
      throw new Error(message);
    }
  }

  // ==========================================================================
  // READ OPERATIONS (REST API)
  // ==========================================================================

  /**
   * Get list of devices with optional filters
   * Use global hooks for real-time polling instead of calling this directly
   * 
   * @param filters - Optional filters for status, registration
   * @returns Promise with device list and pagination
   * @example
   * const response = await devicesService.getDevices({ status: 'online' });
   */
  async getDevices(filters?: DeviceFilters): Promise<DeviceListResponse> {
    try {
      const url = buildDevicesUrl(filters);
      const response = await apiClient.get<DeviceListResponse>(url);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[DevicesService] Get devices error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get single device by ID
   * 
   * @param deviceId - Device ID to fetch
   * @returns Promise with device data
   * @example
   * const response = await devicesService.getDeviceById('WQ-001');
   */
  async getDeviceById(deviceId: string): Promise<DeviceResponse> {
    try {
      const response = await apiClient.get<DeviceResponse>(
        DEVICE_ENDPOINTS.BY_ID(deviceId)
      );
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[DevicesService] Get device error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get sensor readings for a device
   * Returns paginated sensor readings with optional date range
   * 
   * @param deviceId - Device ID to fetch readings for
   * @param filters - Optional filters for limit, dates, pagination
   * @returns Promise with sensor readings and metadata
   * @example
   * const response = await devicesService.getDeviceReadings('WQ-001', { 
   *   limit: 100,
   *   startDate: '2025-01-01',
   *   endDate: '2025-01-31'
   * });
   */
  async getDeviceReadings(
    deviceId: string,
    filters?: DeviceReadingFilters
  ): Promise<DeviceReadingsResponse> {
    try {
      const url = buildDeviceReadingsUrl(deviceId, filters);
      const response = await apiClient.get<DeviceReadingsResponse>(url);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[DevicesService] Get readings error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get latest sensor reading for a device
   * Convenience method to get most recent reading only
   * 
   * @param deviceId - Device ID to fetch latest reading for
   * @returns Promise with latest sensor reading
   * @example
   * const response = await devicesService.getLatestReading('WQ-001');
   * const reading = response.data[0];
   */
  async getLatestReading(deviceId: string): Promise<DeviceReadingsResponse> {
    return this.getDeviceReadings(deviceId, { limit: 1 });
  }

  /**
   * Get device statistics
   * Returns aggregate statistics for all devices
   * 
   * @returns Promise with device statistics
   * @example
   * const response = await devicesService.getDeviceStats();
   * console.log(response.data.total, response.data.online, response.data.offline);
   */
  async getDeviceStats(): Promise<DeviceStatsResponse> {
    try {
      const response = await apiClient.get<DeviceStatsResponse>(
        DEVICE_ENDPOINTS.STATS
      );
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[DevicesService] Get stats error:', message);
      throw new Error(message);
    }
  }

  // ==========================================================================
  // LEGACY METHODS (DEPRECATED - For backwards compatibility)
  // ==========================================================================

  /**
   * @deprecated Use getDevices() instead
   * Legacy method for backwards compatibility
   */
  async listDevices(): Promise<Device[]> {
    const response = await this.getDevices();
    return response.data;
  }

  /**
   * @deprecated Use getLatestReading() instead  
   * Legacy method for backwards compatibility
   */
  async getSensorReadings(deviceId: string): Promise<SensorReading | null> {
    const response = await this.getLatestReading(deviceId);
    return response.data[0] || null;
  }

  /**
   * @deprecated Use getDeviceReadings() instead
   * Legacy method for backwards compatibility
   */
  async getSensorHistory(deviceId: string, limit: number = 50): Promise<SensorReading[]> {
    const response = await this.getDeviceReadings(deviceId, { limit });
    return response.data;
  }

  // ==========================================================================
  // DEVICE REGISTRATION SYSTEM
  // ==========================================================================

  /**
   * Approve device registration (Admin only)
   * Sets isRegistered: true and sends 'go' command to device via SSE
   * 
   * @param deviceId - Device ID to approve
   * @param payload - Location and metadata for the device
   * @returns Promise with approved device
   * @example
   * await devicesService.approveDeviceRegistration('WQ-001', {
   *   location: 'Building A - Floor 2',
   *   metadata: { location: { building: 'A', floor: '2' } }
   * });
   */
  async approveDeviceRegistration(
    deviceId: string,
    payload: UpdateDevicePayload
  ): Promise<DeviceResponse> {
    try {
      const response = await apiClient.post<DeviceResponse>(
        `${DEVICE_ENDPOINTS.BY_ID(deviceId)}/approve`,
        payload
      );
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[DevicesService] Approve registration error:', message);
      throw new Error(message);
    }
  }

  // ==========================================================================
  // DEVICE COMMANDS
  // ==========================================================================

  /**
   * Send command to device via MQTT (Admin only)
   * Backend handles MQTT publishing to device
   * 
   * @param deviceId - Device ID to send command to
   * @param command - Command type (send_now, restart, go, wait, deregister)
   * @param data - Optional command data
   * @returns Promise with command status
   * @example
   * await devicesService.sendDeviceCommand('WQ-001', 'restart');
   * await devicesService.sendDeviceCommand('WQ-001', 'send_now');
   */
  async sendDeviceCommand(
    deviceId: string,
    command: 'send_now' | 'restart' | 'go' | 'wait' | 'deregister',
    data: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    data: {
      deviceId: string;
      command: string;
      status: string;
      timestamp: string;
      deviceStatus: string;
    };
    message: string;
  }> {
    try {
      const response = await apiClient.post(
        `${DEVICE_ENDPOINTS.BY_ID(deviceId)}/commands`,
        { command, data }
      );
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[DevicesService] Send command error:', message);
      throw new Error(message);
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const devicesService = new DevicesService();
export default devicesService;
