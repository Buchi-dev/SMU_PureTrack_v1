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
import Alert from '../alerts/alert.model';
import SensorReading from '../sensorReadings/sensorReading.model';
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
   * Changes status from pending to registered and updates location/metadata
   * Automatically sends 'go' command to device via MQTT
   */
  async approveDeviceRegistration(deviceId: string, updateData?: Partial<IUpdateDeviceData>): Promise<IDeviceDocument> {
    const device = await Device.findOne({ deviceId });
    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    if (device.isRegistered) {
      throw new ConflictError('Device is already registered');
    }

    // Atomic update with location and metadata
    const updatedDevice = await Device.findByIdAndUpdate(
      device._id,
      {
        $set: {
          registrationStatus: DeviceRegistrationStatus.REGISTERED,
          isRegistered: true,
          registeredAt: new Date(),
          ...(updateData?.location && { location: updateData.location }),
          ...(updateData?.metadata && { metadata: updateData.metadata }),
        },
      },
      { new: true }
    );

    if (!updatedDevice) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    // Send 'go' command to device via MQTT
    try {
      const mqttService = (await import('@utils/mqtt.service')).default;
      await mqttService.publishCommand(deviceId, { 
        command: 'go', 
        timestamp: new Date() 
      });
      logger.info(`✅ Sent 'go' command to device ${deviceId} after registration approval`);
    } catch (mqttError: any) {
      // Log error but don't fail the registration
      logger.error(`⚠️ Failed to send 'go' command to device ${deviceId}`, { 
        error: mqttError.message, 
        stack: mqttError.stack 
      });
    }

    return updatedDevice;
  }

  /**
   * Get device by ID
   * Excludes soft-deleted devices
   * Accepts either MongoDB ObjectId or deviceId
   */
  async getDeviceById(id: string): Promise<IDeviceDocument> {
    let device;

    // Try as MongoDB ObjectId first
    if (Types.ObjectId.isValid(id)) {
      device = await Device.findOne({ _id: id, isDeleted: { $ne: true } });
    }

    // If not found, try as deviceId
    if (!device) {
      device = await Device.findOne({ deviceId: id, isDeleted: { $ne: true } });
    }

    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    return device;
  }

  /**
   * Get device by deviceId
   * Excludes soft-deleted devices
   */
  async getDeviceByDeviceId(deviceId: string): Promise<IDeviceDocument | null> {
    return Device.findOne({ deviceId, isDeleted: { $ne: true } });
  }

  /**
   * Get all devices with filters and pagination
   * Excludes soft-deleted devices by default
   * Includes latest sensor reading for each device
   */
  async getAllDevices(filters: IDeviceFilters, page = 1, limit = 50) {
    const query = this.crud.query();

    // Exclude soft-deleted devices by default
    query.filter({ isDeleted: { $ne: true } });

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

    const result = await query.execute();

    // Enrich each device with latest sensor reading
    const devicesWithReadings = await Promise.all(
      result.data.map(async (device: any) => {
        const latestReading = await SensorReading.findOne({
          deviceId: device.deviceId,
          isDeleted: { $ne: true },
        })
          .sort({ timestamp: -1 })
          .limit(1)
          .lean();

        return {
          ...device.toObject(),
          latestReading: latestReading || null,
        };
      })
    );

    return {
      data: devicesWithReadings,
      pagination: result.pagination,
    };
  }

  /**
   * Update device
   * Accepts either MongoDB ObjectId or deviceId
   */
  async updateDevice(id: string, updateData: IUpdateDeviceData): Promise<IDeviceDocument> {
    let device;

    // Try as MongoDB ObjectId first
    if (Types.ObjectId.isValid(id)) {
      device = await this.crud.findById(id);
    }

    // If not found, try as deviceId
    if (!device) {
      device = await Device.findOne({ deviceId: id });
    }

    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    // Atomic update using the MongoDB _id
    const updatedDevice = await Device.findByIdAndUpdate(
      device._id,
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
   * Called when device responds to presence query (ping-pong)
   * This is the ONLY method that updates both lastSeen AND status
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
   * Update last seen timestamp only
   * Called when device sends sensor data (does NOT change status)
   * Status changes ONLY happen via presence query/response (ping-pong)
   */
  async updateLastSeenOnly(deviceId: string): Promise<void> {
    await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          lastSeen: new Date(),
        },
      }
    );
  }

  /**
   * Check offline devices
   * Marks devices as offline if lastSeen exceeds threshold
   * 🔥 FIX: Now broadcasts status changes via WebSocket
   */
  async checkOfflineDevices(): Promise<number> {
    const offlineThreshold = new Date(Date.now() - DEVICE.OFFLINE_THRESHOLD);

    // Find devices that will be marked offline
    const devicesToMarkOffline = await Device.find({
      lastSeen: { $lt: offlineThreshold },
      status: DeviceStatus.ONLINE,
    });

    const result = await Device.updateMany(
      {
        lastSeen: { $lt: offlineThreshold },
        status: DeviceStatus.ONLINE,
      },
      {
        $set: { status: DeviceStatus.OFFLINE },
      }
    );

    // 🔥 FIX: Broadcast offline status for each device
    if (result.modifiedCount > 0) {
      const { websocketService } = await import('@utils/websocket.service');
      devicesToMarkOffline.forEach((device) => {
        websocketService.broadcastDeviceStatus(device.deviceId, 'offline', device);
      });
    }

    return result.modifiedCount;
  }

  /**
   * Soft delete device with cascade
   * Marks device and all related data as deleted, recoverable for 30 days
   * Sends 'deregister' command to device via MQTT
   * Accepts either MongoDB ObjectId or deviceId
   */
  async deleteDevice(id: string, deletedBy?: Types.ObjectId): Promise<{ message: string }> {
    let device;

    // Try as MongoDB ObjectId first
    if (Types.ObjectId.isValid(id)) {
      device = await Device.findById(id);
    }

    // If not found, try as deviceId
    if (!device) {
      device = await Device.findOne({ deviceId: id });
    }

    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    if (device.isDeleted) {
      throw new BadRequestError('Device is already deleted');
    }

    // Send 'deregister' command to device via MQTT BEFORE deleting
    try {
      const mqttService = (await import('@utils/mqtt.service')).default;
      await mqttService.publishCommand(device.deviceId, { 
        command: 'deregister', 
        timestamp: new Date() 
      });
      logger.info(`✅ Sent 'deregister' command to device ${device.deviceId} before deletion`);
    } catch (mqttError: any) {
      // Log error but don't fail the deletion
      logger.error(`⚠️ Failed to send 'deregister' command to device ${device.deviceId}`, { 
        error: mqttError.message, 
        stack: mqttError.stack 
      });
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Soft delete device
    device.isDeleted = true;
    device.deletedAt = now;
    device.deletedBy = deletedBy;
    device.scheduledPermanentDeletionAt = thirtyDaysFromNow;
    await device.save();

    // Cascade soft delete to related sensor readings
    await SensorReading.updateMany(
      { deviceId: device.deviceId, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
          deletedBy,
          scheduledPermanentDeletionAt: thirtyDaysFromNow,
        },
      }
    );

    // Cascade soft delete to related alerts
    await Alert.updateMany(
      { deviceId: device.deviceId, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
          deletedBy,
          scheduledPermanentDeletionAt: thirtyDaysFromNow,
        },
      }
    );

    logger.info(`Device ${device.deviceId} soft-deleted, recoverable for 30 days`, {
      deviceId: device.deviceId,
      deletedBy,
      scheduledPermanentDeletionAt: thirtyDaysFromNow,
    });

    return { message: 'Device soft-deleted, recoverable for 30 days' };
  }

  /**
   * Recover soft-deleted device with cascade
   * Restores device and all related data if within 30-day window
   * Accepts either MongoDB ObjectId or deviceId
   */
  async recoverDevice(id: string): Promise<{ message: string }> {
    let device;

    // Try as MongoDB ObjectId first
    if (Types.ObjectId.isValid(id)) {
      device = await Device.findById(id);
    }

    // If not found, try as deviceId
    if (!device) {
      device = await Device.findOne({ deviceId: id });
    }

    if (!device) {
      throw new NotFoundError(ERROR_MESSAGES.DEVICE.NOT_FOUND);
    }

    if (!device.isDeleted) {
      throw new BadRequestError('Device is not deleted');
    }

    // Check if recovery window has passed
    if (device.scheduledPermanentDeletionAt && new Date() > device.scheduledPermanentDeletionAt) {
      throw new BadRequestError('Recovery window has expired. Device is permanently deleted.');
    }

    // Restore device
    device.isDeleted = false;
    device.deletedAt = undefined;
    device.deletedBy = undefined;
    device.scheduledPermanentDeletionAt = undefined;
    await device.save();

    // Restore related sensor readings
    await SensorReading.updateMany(
      { deviceId: device.deviceId, isDeleted: true },
      {
        $set: {
          isDeleted: false,
        },
        $unset: {
          deletedAt: '',
          deletedBy: '',
          scheduledPermanentDeletionAt: '',
        },
      }
    );

    // Restore related alerts
    await Alert.updateMany(
      { deviceId: device.deviceId, isDeleted: true },
      {
        $set: {
          isDeleted: false,
        },
        $unset: {
          deletedAt: '',
          deletedBy: '',
          scheduledPermanentDeletionAt: '',
        },
      }
    );

    // Send 'go' command via MQTT to instruct device to resume data transmission
    try {
      const mqttService = (await import('@utils/mqtt.service')).default;
      await mqttService.publishCommand(device.deviceId, { 
        command: 'go', 
        timestamp: new Date() 
      });
      logger.info(`✅ Sent 'go' command to recovered device ${device.deviceId}`, {
        deviceId: device.deviceId,
      });
    } catch (mqttError: any) {
      logger.warn(`⚠️ Failed to send 'go' command to device ${device.deviceId}`, {
        deviceId: device.deviceId,
        error: mqttError.message,
        stack: mqttError.stack,
      });
      // Don't fail the recovery if MQTT publish fails
    }

    logger.info(`Device ${device.deviceId} recovered from soft delete`, {
      deviceId: device.deviceId,
    });

    return { message: 'Device and all historical data restored' };
  }

  /**
   * Get soft-deleted devices (Admin only)
   * Returns devices that can still be recovered
   */
  async getDeletedDevices(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const [devices, total] = await Promise.all([
      Device.find({ 
        isDeleted: true,
        scheduledPermanentDeletionAt: { $gt: new Date() }
      })
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Device.countDocuments({ 
        isDeleted: true,
        scheduledPermanentDeletionAt: { $gt: new Date() }
      }),
    ]);

    // Add remaining days until permanent deletion
    const devicesWithCountdown = devices.map((device: any) => {
      const remainingMs = device.scheduledPermanentDeletionAt.getTime() - Date.now();
      const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      
      return {
        ...device,
        remainingDays,
        remainingDaysMessage: `${remainingDays} days remaining until permanent deletion`,
      };
    });

    return {
      data: devicesWithCountdown,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

    // Create new device with ONLINE status (auto-registration)
    const existingDevice = await Device.findOne({ deviceId: registrationData.deviceId });
    if (existingDevice) {
      throw new ConflictError(ERROR_MESSAGES.DEVICE.ALREADY_REGISTERED);
    }

    const newDevice = await this.crud.create({
      ...registrationData,
      registrationStatus: DeviceRegistrationStatus.PENDING,
      isRegistered: false,
      status: DeviceStatus.ONLINE, // Set to ONLINE for auto-registration
      lastSeen: new Date(),
    } as any);

    return newDevice;
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

