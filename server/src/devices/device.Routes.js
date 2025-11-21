const express = require('express');
const {
  getAllDevices,
  getDeviceById,
  getDeviceReadings,
  updateDevice,
  deleteDevice,
  processSensorData,
  getDeviceStats,
} = require('./device.Controller');
const { ensureAuthenticated, ensureAdmin } = require('../auth/auth.Middleware');
const { ensureApiKey } = require('../middleware/apiKey.middleware');
const { sensorDataLimiter } = require('../middleware/rate-limit.middleware');
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
 * @route   GET /api/v1/devices/:id
 * @desc    Get device by ID
 * @access  Authenticated users
 */
router.get('/:id', ensureAuthenticated, validateMongoId, getDeviceById);

/**
 * @route   GET /api/v1/devices/:id/readings
 * @desc    Get device sensor readings
 * @access  Authenticated users
 */
router.get('/:id/readings', ensureAuthenticated, validateMongoId, validateDateRange, validatePagination, getDeviceReadings);

/**
 * @route   PATCH /api/v1/devices/:id
 * @desc    Update device
 * @access  Admin only
 */
router.patch('/:id', ensureAdmin, validateMongoId, validateDeviceUpdate, updateDevice);

/**
 * @route   DELETE /api/v1/devices/:id
 * @desc    Delete device
 * @access  Admin only
 */
router.delete('/:id', ensureAdmin, validateMongoId, deleteDevice);

/**
 * @route   POST /api/v1/devices/readings
 * @desc    Process sensor data from IoT devices
 * @access  Requires API key authentication
 * @security ApiKeyAuth
 */
router.post('/readings', sensorDataLimiter, ensureApiKey, validateSensorData, processSensorData);

module.exports = router;
