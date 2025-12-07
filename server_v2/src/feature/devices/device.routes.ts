/**
 * Device Routes
 * API endpoints for device management
 */

import { Router } from 'express';
import {
  getAllDevices,
  getDeviceById,
  registerDevice,
  approveDeviceRegistration,
  updateDevice,
  updateDeviceStatus,
  deleteDevice,
  recoverDevice,
  getDeletedDevices,
  getDeviceStatistics,
  getPendingRegistrations,
  sendCommand,
  requestImmediateData,
  checkOfflineDevices,
} from './device.controller';
import { requireStaff, requireAdmin } from '@core/middlewares';
import { validateRequest } from '@core/middlewares/validation.middleware';
import {
  registerDeviceSchema,
  updateDeviceSchema,
  approveDeviceSchema,
  updateDeviceStatusSchema,
  sendCommandSchema,
  getDeviceByIdSchema,
  deleteDeviceSchema,
} from './device.schema';

const router = Router();

/**
 * @route   GET /api/v1/devices/deleted
 * @desc    Get soft-deleted devices (Admin only)
 * @access  Protected (Admin only)
 */
router.get('/deleted', requireAdmin, getDeletedDevices);

/**
 * @route   GET /api/v1/devices/stats
 * @desc    Get device statistics (must be before /:id)
 * @access  Protected (Staff/Admin)
 * @websocket Device status updates available via WebSocket 'device:status' event
 */
router.get('/stats', requireStaff, getDeviceStatistics);

/**
 * @route   GET /api/v1/devices/pending
 * @desc    Get pending device registrations
 * @access  Protected (Admin only)
 */
router.get('/pending', requireAdmin, getPendingRegistrations);

/**
 * @route   POST /api/v1/devices/check-offline
 * @desc    Check and mark offline devices
 * @access  Protected (Admin only)
 */
router.post('/check-offline', requireAdmin, checkOfflineDevices);

/**
 * @route   GET /api/v1/devices
 * @desc    Get all devices with filters and pagination
 * @access  Protected (Staff/Admin)
 */
router.get('/', requireStaff, getAllDevices);

/**
 * @route   POST /api/v1/devices/register
 * @desc    Register new device
 * @access  Public (for device registration) or Protected (Admin)
 */
router.post('/register', validateRequest(registerDeviceSchema), registerDevice);

/**
 * @route   GET /api/v1/devices/:id
 * @desc    Get device by ID
 * @access  Protected (Staff/Admin)
 */
router.get('/:id', requireStaff, validateRequest(getDeviceByIdSchema), getDeviceById);

/**
 * @route   PATCH /api/v1/devices/:id
 * @desc    Update device
 * @access  Protected (Admin only)
 */
router.patch('/:id', requireAdmin, validateRequest(updateDeviceSchema), updateDevice);

/**
 * @route   PATCH /api/v1/devices/:deviceId/approve
 * @desc    Approve device registration
 * @access  Protected (Admin only)
 */
router.patch('/:deviceId/approve', requireAdmin, validateRequest(approveDeviceSchema), approveDeviceRegistration);

/**
 * @route   PATCH /api/v1/devices/:deviceId/status
 * @desc    Update device status
 * @access  Protected (Admin only)
 */
router.patch('/:deviceId/status', requireAdmin, validateRequest(updateDeviceStatusSchema), updateDeviceStatus);

/**
 * @route   POST /api/v1/devices/:deviceId/command
 * @route   POST /api/v1/devices/:deviceId/commands (alias)
 * @desc    Send command to device
 * @access  Protected (Admin only)
 */
router.post('/:deviceId/command', requireAdmin, validateRequest(sendCommandSchema), sendCommand);
router.post('/:deviceId/commands', requireAdmin, validateRequest(sendCommandSchema), sendCommand); // Alias for compatibility

/**
 * @route   POST /api/v1/devices/:deviceId/send-now
 * @desc    Request immediate data transmission from device
 * @access  Protected (Staff/Admin)
 * FIXED: Added endpoint for send_now command that device already supports
 */
router.post('/:deviceId/send-now', requireStaff, requestImmediateData);

/**
 * @route   POST /api/v1/devices/:id/recover
 * @desc    Recover soft-deleted device
 * @access  Protected (Admin only)
 */
router.post('/:id/recover', requireAdmin, recoverDevice);

/**
 * @route   DELETE /api/v1/devices/:id
 * @desc    Soft delete device
 * @access  Protected (Admin only)
 */
router.delete('/:id', requireAdmin, validateRequest(deleteDeviceSchema), deleteDevice);

export default router;
