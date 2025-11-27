const express = require('express');
const {
  getAllDevices,
  getDeviceById,
  getDeviceReadings,
  updateDevice,
  deleteDevice,
  processSensorData,
  getDeviceStats,
  deviceRegister,
  approveDeviceRegistration,
  deviceSSEConnection,
} = require('./device.Controller');
const { ensureAuthenticated, ensureAdmin } = require('../auth/auth.Middleware');
const { ensureApiKey } = require('../middleware/apiKey.middleware');
const {
  validateSensorData,
  validateDeviceUpdate,
  validateMongoId,
  validateDateRange,
  validatePagination,
} = require('../middleware/validation.middleware');

const router = express.Router();

/**
 * @route   GET /api/v1/devices
 * @desc    Get all devices (with filters)
 * @access  Authenticated users
 */
router.get('/', ensureAuthenticated, validatePagination, getAllDevices);

/**
 * @route   GET /api/v1/devices/stats
 * @desc    Get device statistics
 * @access  Authenticated users
 */
router.get('/stats', ensureAuthenticated, getDeviceStats);

/**
 * @route   GET /api/v1/devices/:deviceId
 * @desc    Get device by ID
 * @access  Authenticated users
 */
router.get('/:deviceId', ensureAuthenticated, getDeviceById);

/**
 * @route   GET /api/v1/devices/:deviceId/readings
 * @desc    Get device sensor readings
 * @access  Authenticated users
 */
router.get('/:deviceId/readings', ensureAuthenticated, validateDateRange, validatePagination, getDeviceReadings);

/**
 * @route   PATCH /api/v1/devices/:deviceId
 * @desc    Update device
 * @access  Admin only
 */
router.patch('/:deviceId', ensureAdmin, validateDeviceUpdate, updateDevice);

/**
 * @route   DELETE /api/v1/devices/:deviceId
 * @desc    Delete device
 * @access  Admin only
 */
router.delete('/:deviceId', ensureAdmin, deleteDevice);

/**
 * @route   POST /api/v1/devices/readings
 * @desc    Process sensor data from IoT devices (real-time)
 * @access  Requires API key authentication
 * @security ApiKeyAuth
 * @note    This endpoint receives real-time sensor data from IoT devices
 */
router.post('/readings', ensureApiKey, validateSensorData, processSensorData);

/**
 * @route   POST /api/v1/devices/register
 * @desc    Device registration endpoint - for unregistered devices
 * @access  Requires API key authentication
 * @security ApiKeyAuth
 * @note    Unregistered devices call this endpoint to request registration
 */
router.post('/register', ensureApiKey, deviceRegister);

/**
 * @route   GET /api/v1/devices/sse/:deviceId
 * @desc    Establish SSE connection for device to receive commands
 * @access  Requires API key authentication
 * @security ApiKeyAuth
 * @note    Devices maintain SSE connection to receive 'go', 'deregister', and other commands
 */
router.get('/sse/:deviceId', ensureApiKey, deviceSSEConnection);

/**
 * @route   POST /api/v1/devices/:deviceId/approve
 * @desc    Approve device registration (sets isRegistered: true)
 * @access  Admin only
 * @note    Admin approves device registration, server sends 'go' command via SSE
 */
router.post('/:deviceId/approve', ensureAdmin, approveDeviceRegistration);

module.exports = router;
