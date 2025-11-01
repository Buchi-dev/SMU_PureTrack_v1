/**
 * Device Management Service
 * 
 * Provides API functions for device management operations
 * Communicates with Firebase Callable Function: deviceManagement
 * 
 * @module services/deviceManagementService
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type { 
  Device, 
  SensorReading, 
  DeviceData, 
  CommandParams, 
  DeviceResponse 
} from '../schemas';

// ============================================================================
// ERROR RESPONSE TYPE
// ============================================================================

/**
 * Generic error response
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// DEVICE MANAGEMENT SERVICE
// ============================================================================

/**
 * Device Management Service Class
 * Provides methods to interact with the deviceManagement Firebase Function
 */
export class DeviceManagementService {
  private functions;
  private functionName = 'deviceManagement';

  constructor() {
    this.functions = getFunctions();
  }

  /**
   * List all devices
   * 
   * Retrieves all devices from Firestore.
   * Requires admin authentication.
   * 
   * @returns {Promise<Device[]>} Array of devices
   * 
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new DeviceManagementService();
   * try {
   *   const devices = await service.listDevices();
   *   console.log(`Found ${devices.length} devices`);
   * } catch (error) {
   *   console.error('Failed to load devices:', error);
   * }
   */
  async listDevices(): Promise<Device[]> {
    try {
      const callable = httpsCallable<{ action: string }, DeviceResponse>(
        this.functions,
        this.functionName
      );

      const result = await callable({ action: 'listDevices' });

      return result.data.devices || [];
    } catch (error: any) {
      throw this.handleError(error, 'Failed to list devices');
    }
  }

  /**
   * Get a specific device
   * 
   * Retrieves details of a single device by ID.
   * Requires admin authentication.
   * 
   * @param {string} deviceId - The ID of the device to retrieve
   * 
   * @returns {Promise<Device>} Device data
   * 
   * @throws {ErrorResponse} If device is not found
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * 
   * @example
   * const device = await service.getDevice('arduino_001');
   */
  async getDevice(deviceId: string): Promise<Device> {
    try {
      const callable = httpsCallable<
        { action: string; deviceId: string },
        DeviceResponse
      >(this.functions, this.functionName);

      const result = await callable({ action: 'getDevice', deviceId });

      if (!result.data.device) {
        throw new Error('Device not found');
      }

      return result.data.device;
    } catch (error: any) {
      throw this.handleError(error, `Failed to get device ${deviceId}`);
    }
  }

  /**
   * Add a new device
   * 
   * Registers a new device in the system.
   * Requires admin authentication.
   * 
   * @param {string} deviceId - Unique device identifier
   * @param {DeviceData} deviceData - Device information
   * 
   * @returns {Promise<Device>} Created device data
   * 
   * @throws {ErrorResponse} If device already exists
   * @throws {ErrorResponse} If validation fails
   * 
   * @example
   * const device = await service.addDevice('arduino_001', {
   *   name: 'Lab Device 1',
   *   type: 'Arduino UNO R4 WiFi',
   *   sensors: ['turbidity', 'tds', 'ph']
   * });
   */
  async addDevice(deviceId: string, deviceData: DeviceData): Promise<Device> {
    try {
      const callable = httpsCallable<
        { action: string; deviceId: string; deviceData: DeviceData },
        DeviceResponse
      >(this.functions, this.functionName);

      const result = await callable({ action: 'addDevice', deviceId, deviceData });

      if (!result.data.device) {
        throw new Error('Device creation failed');
      }

      return result.data.device;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to add device');
    }
  }

  /**
   * Update a device
   * 
   * Updates device information.
   * Requires admin authentication.
   * 
   * @param {string} deviceId - Device ID to update
   * @param {DeviceData} deviceData - Updated device information
   * 
   * @returns {Promise<void>}
   * 
   * @throws {ErrorResponse} If device is not found
   * 
   * @example
   * await service.updateDevice('arduino_001', {
   *   name: 'Updated Device Name',
   *   status: 'maintenance'
   * });
   */
  async updateDevice(deviceId: string, deviceData: DeviceData): Promise<void> {
    try {
      const callable = httpsCallable<
        { action: string; deviceId: string; deviceData: DeviceData },
        DeviceResponse
      >(this.functions, this.functionName);

      await callable({ action: 'updateDevice', deviceId, deviceData });
    } catch (error: any) {
      throw this.handleError(error, `Failed to update device ${deviceId}`);
    }
  }

  /**
   * Delete a device
   * 
   * Removes a device from the system (Firestore + Realtime DB).
   * Requires admin authentication.
   * 
   * @param {string} deviceId - Device ID to delete
   * 
   * @returns {Promise<void>}
   * 
   * @throws {ErrorResponse} If device is not found
   * 
   * @example
   * await service.deleteDevice('arduino_001');
   */
  async deleteDevice(deviceId: string): Promise<void> {
    try {
      const callable = httpsCallable<
        { action: string; deviceId: string },
        DeviceResponse
      >(this.functions, this.functionName);

      await callable({ action: 'deleteDevice', deviceId });
    } catch (error: any) {
      throw this.handleError(error, `Failed to delete device ${deviceId}`);
    }
  }

  /**
   * Discover devices
   * 
   * Broadcasts discovery message to all devices via MQTT.
   * Requires admin authentication.
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await service.discoverDevices();
   */
  async discoverDevices(): Promise<void> {
    try {
      const callable = httpsCallable<{ action: string }, DeviceResponse>(
        this.functions,
        this.functionName
      );

      await callable({ action: 'discoverDevices' });
    } catch (error: any) {
      throw this.handleError(error, 'Failed to send discovery command');
    }
  }

  /**
   * Send command to device
   * 
   * Sends a command to a specific device via MQTT.
   * Requires admin authentication.
   * 
   * @param {string} deviceId - Target device ID
   * @param {string} command - Command to send
   * @param {CommandParams} params - Optional command parameters
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await service.sendCommand('arduino_001', 'CALIBRATE', { sensor: 'ph' });
   */
  async sendCommand(
    deviceId: string,
    command: string,
    params?: CommandParams
  ): Promise<void> {
    try {
      const callable = httpsCallable<
        { action: string; deviceId: string; command: string; params?: CommandParams },
        DeviceResponse
      >(this.functions, this.functionName);

      await callable({ action: 'sendCommand', deviceId, command, params });
    } catch (error: any) {
      throw this.handleError(error, `Failed to send command to device ${deviceId}`);
    }
  }

  /**
   * Get latest sensor readings
   * 
   * Retrieves the most recent sensor data for a device.
   * Requires admin authentication.
   * 
   * @param {string} deviceId - Device ID
   * 
   * @returns {Promise<SensorReading>} Latest sensor reading
   * 
   * @throws {ErrorResponse} If no readings found
   * 
   * @example
   * const reading = await service.getSensorReadings('arduino_001');
   * console.log(`pH: ${reading.ph}, TDS: ${reading.tds}`);
   */
  async getSensorReadings(deviceId: string): Promise<SensorReading> {
    try {
      const callable = httpsCallable<
        { action: string; deviceId: string },
        DeviceResponse
      >(this.functions, this.functionName);

      const result = await callable({ action: 'getSensorReadings', deviceId });

      if (!result.data.sensorData) {
        throw new Error('No sensor data found');
      }

      return result.data.sensorData;
    } catch (error: any) {
      throw this.handleError(error, `Failed to get sensor readings for ${deviceId}`);
    }
  }

  /**
   * Get sensor history
   * 
   * Retrieves historical sensor readings for a device.
   * Requires admin authentication.
   * 
   * @param {string} deviceId - Device ID
   * @param {number} limit - Number of readings to retrieve (default: 50)
   * 
   * @returns {Promise<SensorReading[]>} Array of sensor readings (most recent first)
   * 
   * @throws {ErrorResponse} If no history found
   * 
   * @example
   * const history = await service.getSensorHistory('arduino_001', 100);
   * console.log(`Retrieved ${history.length} readings`);
   */
  async getSensorHistory(deviceId: string, limit: number = 50): Promise<SensorReading[]> {
    try {
      const callable = httpsCallable<
        { action: string; deviceId: string; limit: number },
        DeviceResponse
      >(this.functions, this.functionName);

      const result = await callable({ action: 'getSensorHistory', deviceId, limit });

      return result.data.history || [];
    } catch (error: any) {
      throw this.handleError(error, `Failed to get sensor history for ${deviceId}`);
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Register device with location
   * 
   * Convenience method to register a device and set its location.
   * 
   * @param {string} deviceId - Device ID
   * @param {string} building - Building name
   * @param {string} floor - Floor level
   * @param {string} notes - Optional location notes
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await service.registerDevice('arduino_001', 'Main Building', '2nd Floor', 'Near entrance');
   */
  async registerDevice(
    deviceId: string,
    building: string,
    floor: string,
    notes?: string
  ): Promise<void> {
    const metadata = {
      location: {
        building,
        floor,
        notes: notes || '',
      },
    };

    await this.updateDevice(deviceId, { metadata });
  }

  /**
   * Send status command
   * 
   * Convenience method to request device status.
   * 
   * @param {string} deviceId - Device ID
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await service.sendStatusCommand('arduino_001');
   */
  async sendStatusCommand(deviceId: string): Promise<void> {
    await this.sendCommand(deviceId, 'STATUS');
  }

  /**
   * Set device to maintenance mode
   * 
   * Convenience method to set device status to maintenance.
   * 
   * @param {string} deviceId - Device ID
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await service.setMaintenanceMode('arduino_001');
   */
  async setMaintenanceMode(deviceId: string): Promise<void> {
    await this.updateDevice(deviceId, { status: 'maintenance' });
  }

  /**
   * Set device to online
   * 
   * Convenience method to set device status to online.
   * 
   * @param {string} deviceId - Device ID
   * 
   * @returns {Promise<void>}
   * 
   * @example
   * await service.setOnline('arduino_001');
   */
  async setOnline(deviceId: string): Promise<void> {
    await this.updateDevice(deviceId, { status: 'online' });
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Handle errors from Firebase Functions
   * 
   * Transforms Firebase Function errors into a consistent ErrorResponse format.
   * 
   * @private
   * @param {any} error - The error from Firebase Functions
   * @param {string} defaultMessage - Default message if error doesn't have one
   * 
   * @returns {ErrorResponse} Formatted error response
   */
  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('DeviceManagementService error:', error);

    // Extract error details from Firebase Functions error
    const code = error.code || 'unknown';
    const message = error.message || defaultMessage;
    const details = error.details || undefined;

    // Map Firebase error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'functions/unauthenticated': 'Please log in to perform this action',
      'functions/permission-denied': 'You do not have permission to perform this action',
      'functions/not-found': 'Device not found',
      'functions/already-exists': 'Device already exists',
      'functions/invalid-argument': 'Invalid request parameters',
      'functions/failed-precondition': message, // Use original message
      'functions/internal': 'An internal error occurred. Please try again',
      'functions/unavailable': 'Service temporarily unavailable. Please try again',
      'functions/deadline-exceeded': 'Request timeout. Please try again',
    };

    const friendlyMessage = errorMessages[code] || message;

    return {
      code,
      message: friendlyMessage,
      details,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE EXPORT
// ============================================================================

/**
 * Singleton instance of DeviceManagementService
 * Use this exported instance in your application
 * 
 * @example
 * import { deviceManagementService } from './services/deviceManagement.Service';
 * 
 * // List devices
 * const devices = await deviceManagementService.listDevices();
 * 
 * // Get sensor readings
 * const readings = await deviceManagementService.getSensorReadings('arduino_001');
 * 
 * // Send command
 * await deviceManagementService.sendCommand('arduino_001', 'CALIBRATE');
 */
export const deviceManagementService = new DeviceManagementService();

/**
 * Default export for convenience
 */
export default deviceManagementService;
