/**
 * Device Service
 * 
 * Business logic for device management:
 * - Device registration and lifecycle
 * - Status monitoring (online/offline detection)
 * - MQTT integration for device communication
 * - Heartbeat monitoring
 * - Command queueing
 * 
 * @module feature/devices/device.service
 */

import Device from './device.model';
import {
  IDeviceDocument,
  ICreateDeviceData,
  IUpdateDeviceData,
  IDeviceFilters,
  IDeviceStatistics,
  DeviceStatus,
  DeviceRegistrationStatus,
} from './device.types';
import { CRUDOperations } from '@utils/queryBuilder.util';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '@utils/errors.util';
import { ERROR_MESSAGES } from '@core/configs/messages.config';
import { DEVICE } from '@core/configs/constants.config';
import { Types, Document } from 'mongoose';
import logger from '@utils/logger.util';

/**
 * Device Service Class
 * Handles all device-related business logic
 */
export class DeviceService {
  private crud: CRUDOperations<IDeviceDocument & Document>;

  constructor() {
    this.crud = new CRUDOperations<IDeviceDocument & Document>(Device as any);
  }

  /**
   * Register new device
   * Creates device with pending status
   */
  async registerDevice(deviceData: ICreateDeviceData): Promise<IDeviceDocument> {
    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId: deviceData.deviceId });
    if (existingDevice) {
      throw new ConflictError(ERROR_MESSAGES.DEVICE.ALREADY_REGISTERED);
    }

    const newDevice = await this.crud.create({
      ...deviceData,
      registrationStatus: DeviceRegistrationStatus.PENDING,
      isRegistered: false,
      status: DeviceStatus.OFFLINE,
    } as any);

    return newDevice;
  }

  /**
   * Approve device registration
   * Changes status from pending to registered
   */
  async approveDeviceRegistration(deviceId: string): Promise<IDeviceDocument> {
    const device = await Device.findOne({ deviceId });
    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    if (device.isRegistered) {
      throw new ConflictError('Device is already registered');
    }

    // Atomic update
    const updatedDevice = await Device.findByIdAndUpdate(
      device._id,
      {
        $set: {
          registrationStatus: DeviceRegistrationStatus.REGISTERED,
          isRegistered: true,
        },
      },
      { new: true }
    );

    if (!updatedDevice) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    return updatedDevice;
  }

  /**
   * Get device by ID
   */
  async getDeviceById(id: string): Promise<IDeviceDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('Device ID'));
    }

    const device = await this.crud.findById(id);
    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    return device;
  }

  /**
   * Get device by deviceId
   */
  async getDeviceByDeviceId(deviceId: string): Promise<IDeviceDocument | null> {
    return Device.findOne({ deviceId });
  }

  /**
   * Get all devices with filters and pagination
   */
  async getAllDevices(filters: IDeviceFilters, page = 1, limit = 50) {
    const query = this.crud.query();

    // Apply filters
    if (filters.status) query.filter({ status: filters.status });
    if (filters.registrationStatus) query.filter({ registrationStatus: filters.registrationStatus });
    if (filters.isRegistered !== undefined) query.filter({ isRegistered: filters.isRegistered });

    // Search in name/deviceId
    if (filters.search) {
      query.search(['name', 'deviceId'], filters.search);
    }

    // Pagination and sorting
    query.paginate(page, limit).sortBy('-lastSeen');

    return query.execute();
  }

  /**
   * Update device
   */
  async updateDevice(id: string, updateData: IUpdateDeviceData): Promise<IDeviceDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('Device ID'));
    }

    const device = await this.crud.findById(id);
    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    // Atomic update
    const updatedDevice = await Device.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedDevice) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    return updatedDevice;
  }

  /**
   * Update device status (online/offline)
   * Uses atomic operation
   */
  async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<IDeviceDocument> {
    const device = await Device.findOne({ deviceId });
    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    // Atomic update with lastSeen timestamp
    const updatedDevice = await Device.findByIdAndUpdate(
      device._id,
      {
        $set: {
          status,
          lastSeen: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedDevice) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    return updatedDevice;
  }

  /**
   * Update device heartbeat
   * Called when device sends data or presence message
   */
  async updateHeartbeat(deviceId: string): Promise<void> {
    await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          lastSeen: new Date(),
          status: DeviceStatus.ONLINE,
        },
      }
    );
  }

  /**
   * Check offline devices
   * Marks devices as offline if lastSeen exceeds threshold
   */
  async checkOfflineDevices(): Promise<number> {
    const offlineThreshold = new Date(Date.now() - DEVICE.OFFLINE_THRESHOLD);

    const result = await Device.updateMany(
      {
        lastSeen: { $lt: offlineThreshold },
        status: DeviceStatus.ONLINE,
      },
      {
        $set: { status: DeviceStatus.OFFLINE },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Delete device
   */
  async deleteDevice(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError(ERROR_MESSAGES.VALIDATION.INVALID_OBJECT_ID('Device ID'));
    }

    const deleted = await this.crud.deleteById(id);
    if (!deleted) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }
  }

  /**
   * Get online devices
   */
  async getOnlineDevices(): Promise<IDeviceDocument[]> {
    return Device.find({ status: DeviceStatus.ONLINE }).lean() as any;
  }

  /**
   * Get pending registrations
   */
  async getPendingRegistrations(page = 1, limit = 50) {
    return this.getAllDevices(
      { registrationStatus: DeviceRegistrationStatus.PENDING },
      page,
      limit
    );
  }

  /**
   * Get device statistics
   */
  async getDeviceStatistics(): Promise<IDeviceStatistics> {
    const stats = await Device.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          byRegistrationStatus: [
            {
              $group: {
                _id: '$registrationStatus',
                count: { $sum: 1 },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const result = stats[0];

    return {
      total: result.total[0]?.count || 0,
      byStatus: {
        online: result.byStatus.find((s: any) => s._id === DeviceStatus.ONLINE)?.count || 0,
        offline: result.byStatus.find((s: any) => s._id === DeviceStatus.OFFLINE)?.count || 0,
      },
      byRegistrationStatus: {
        registered: result.byRegistrationStatus.find((s: any) => s._id === DeviceRegistrationStatus.REGISTERED)?.count || 0,
        pending: result.byRegistrationStatus.find((s: any) => s._id === DeviceRegistrationStatus.PENDING)?.count || 0,
      },
    };
  }

  /**
   * Get device count
   */
  async getDeviceCount(): Promise<number> {
    return Device.countDocuments();
  }

  /**
   * Process device registration from MQTT
   * Called when device publishes registration message
   */
  async processDeviceRegistration(registrationData: ICreateDeviceData): Promise<IDeviceDocument> {
    // Check if device exists
    let device = await Device.findOne({ deviceId: registrationData.deviceId });

    if (device) {
      // Update existing device
      device = await Device.findByIdAndUpdate(
        device._id,
        {
          $set: {
            ...registrationData,
            lastSeen: new Date(),
            status: DeviceStatus.ONLINE,
          },
        },
        { new: true }
      );

      if (!device) {
        throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
      }

      return device;
    }

    // Create new device
    return this.registerDevice(registrationData);
  }

  /**
   * Send command to device via MQTT
   * Placeholder for MQTT service integration
   */
  async sendCommand(deviceId: string, command: string, payload: any): Promise<void> {
    const device = await Device.findOne({ deviceId });
    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    if (!device.isRegistered) {
      throw new BadRequestError(ERROR_MESSAGES.DEVICE.NOT_REGISTERED);
    }

    if (device.status === DeviceStatus.OFFLINE) {
      throw new BadRequestError(ERROR_MESSAGES.DEVICE.OFFLINE);
    }

    // Publish command to MQTT broker
    const mqttService = (await import('@utils/mqtt.service')).default;
    await mqttService.publishCommand(deviceId, { command, payload, timestamp: new Date() });
    
    logger.info(`✅ Command sent to device ${deviceId}: ${command}`, payload);
  }
}

export default new DeviceService();

