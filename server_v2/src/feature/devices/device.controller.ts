/**
 * Device Controller
 * HTTP request handlers for device management endpoints
 */

import { Request, Response } from 'express';
import deviceService from './device.service';
import { userService } from '@feature/users';
import { ResponseHandler } from '@utils/response.util';
import { asyncHandler } from '@utils/asyncHandler.util';
import { SUCCESS_MESSAGES } from '@core/configs/messages.config';
import { DeviceStatus } from './device.types';

/**
 * Get all devices with filters
 * @route GET /api/v1/devices
 */
export const getAllDevices = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    registrationStatus,
    isRegistered,
    search,
    page = 1,
    limit = 50,
  } = req.query;

  const filters = {
    ...(status && { status: status as any }),
    ...(registrationStatus && { registrationStatus: registrationStatus as any }),
    ...(isRegistered !== undefined && { isRegistered: isRegistered === 'true' }),
    ...(search && { search: search as string }),
  };

  const result = await deviceService.getAllDevices(filters, Number(page), Number(limit));

  // Map devices to public profile, preserving latestReading
  const devicesData = result.data.map((device: any) => {
    // If device has toPublicProfile method, use it
    if (typeof device.toPublicProfile === 'function') {
      return {
        ...device.toPublicProfile(),
        latestReading: device.latestReading || null,
      };
    }
    // Otherwise, device is already a plain object with latestReading
    return device;
  });

  ResponseHandler.paginated(res, devicesData, result.pagination);
});

/**
 * Get device by ID
 * @route GET /api/v1/devices/:id
 */
export const getDeviceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('Device ID is required');
  }

  const device = await deviceService.getDeviceById(id);

  ResponseHandler.success(res, device.toPublicProfile());
});

/**
 * Register new device
 * @route POST /api/v1/devices/register
 */
export const registerDevice = asyncHandler(async (req: Request, res: Response) => {
  const deviceData = req.body;

  const newDevice = await deviceService.registerDevice(deviceData);

  ResponseHandler.created(res, newDevice.toPublicProfile(), SUCCESS_MESSAGES.DEVICE.REGISTERED);
});

/**
 * Approve device registration
 * @route PATCH /api/v1/devices/:deviceId/approve
 */
export const approveDeviceRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const updateData = req.body;

  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const device = await deviceService.approveDeviceRegistration(deviceId, updateData);

  ResponseHandler.success(
    res,
    device.toPublicProfile(),
    'Device registration approved successfully'
  );
});

/**
 * Update device
 * @route PATCH /api/v1/devices/:id
 */
export const updateDevice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('Device ID is required');
  }

  const updateData = req.body;

  const updatedDevice = await deviceService.updateDevice(id, updateData);

  ResponseHandler.success(res, updatedDevice.toPublicProfile(), SUCCESS_MESSAGES.DEVICE.UPDATED);
});

/**
 * Update device status
 * @route PATCH /api/v1/devices/:deviceId/status
 */
export const updateDeviceStatus = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const { status } = req.body;

  const updatedDevice = await deviceService.updateDeviceStatus(deviceId, status);

  ResponseHandler.success(
    res,
    updatedDevice.toPublicProfile(),
    SUCCESS_MESSAGES.DEVICE.STATUS_UPDATED
  );
});

/**
 * Soft delete device
 * Sends 'deregister' command to device before deletion
 * @route DELETE /api/v1/devices/:id
 */
export const deleteDevice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const firebaseUid = (req as any).user?.uid; // Get Firebase UID from auth middleware

  if (!id) {
    throw new Error('Device ID is required');
  }

  // Convert Firebase UID to MongoDB ObjectId
  let deletedBy;
  if (firebaseUid) {
    const user = await userService.getUserByFirebaseUid(firebaseUid);
    deletedBy = user?._id;
  }

  const result = await deviceService.deleteDevice(id, deletedBy);

  ResponseHandler.success(res, null, result.message);
});

/**
 * Recover soft-deleted device
 * @route POST /api/v1/devices/:id/recover
 */
export const recoverDevice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('Device ID is required');
  }

  const result = await deviceService.recoverDevice(id);

  ResponseHandler.success(res, null, result.message);
});

/**
 * Get soft-deleted devices (Admin only)
 * @route GET /api/v1/devices/deleted
 */
export const getDeletedDevices = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;

  const result = await deviceService.getDeletedDevices(Number(page), Number(limit));

  ResponseHandler.paginated(res, result.data, {
    ...result.pagination,
    hasNext: result.pagination.page < result.pagination.totalPages,
    hasPrev: result.pagination.page > 1,
  });
});

/**
 * Get device statistics
 * @route GET /api/v1/devices/statistics
 */
export const getDeviceStatistics = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await deviceService.getDeviceStatistics();

  ResponseHandler.success(res, stats);
});

/**
 * Get pending registrations
 * @route GET /api/v1/devices/pending
 */
export const getPendingRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;

  const result = await deviceService.getPendingRegistrations(Number(page), Number(limit));

  const devicesData = result.data.map((device) => device.toPublicProfile());

  ResponseHandler.paginated(res, devicesData, result.pagination);
});

/**
 * Get online devices
 * @route GET /api/v1/devices/online
 */
export const getOnlineDevices = asyncHandler(async (_req: Request, res: Response) => {
  const devices = await deviceService.getOnlineDevices();

  const devicesData = devices.map((device: any) => device);

  ResponseHandler.success(res, devicesData);
});

/**
 * Send command to device
 * @route POST /api/v1/devices/:deviceId/command
 * @route POST /api/v1/devices/:deviceId/commands
 */
export const sendCommand = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const { command, payload } = req.body;

  await deviceService.sendCommand(deviceId, command, payload || {});

  // Get device to check current status
  const device = await deviceService.getDeviceByDeviceId(deviceId);

  // Return structured response expected by frontend
  const responseData = {
    commandId: `${deviceId}-${command}-${Date.now()}`,
    status: device?.status === DeviceStatus.ONLINE ? 'sent' : 'queued',
    deviceStatus: device?.status || DeviceStatus.OFFLINE,
    command,
    timestamp: new Date().toISOString(),
  };

  ResponseHandler.success(res, responseData, SUCCESS_MESSAGES.DEVICE.COMMAND_SENT);
});

/**
 * Request immediate data transmission from device
 * @route POST /api/v1/devices/:deviceId/send-now
 * FIXED: Added support for send_now command that device already implements
 */
export const requestImmediateData = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  await deviceService.sendCommand(deviceId, 'send_now', {});

  ResponseHandler.success(res, null, 'Immediate data transmission requested');
});

/**
 * Check offline devices
 * @route POST /api/v1/devices/check-offline
 */
export const checkOfflineDevices = asyncHandler(async (_req: Request, res: Response) => {
  const count = await deviceService.checkOfflineDevices();

  ResponseHandler.success(res, { devicesMarkedOffline: count });
});
