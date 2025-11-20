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

const router = express.Router();

/**
 * @route   GET /api/devices
 * @desc    Get all devices (with filters)
 * @access  Authenticated users
 */
router.get('/', ensureAuthenticated, getAllDevices);

/**
 * @route   GET /api/devices/stats
 * @desc    Get device statistics
 * @access  Authenticated users
 */
router.get('/stats', ensureAuthenticated, getDeviceStats);

/**
 * @route   GET /api/devices/:id
 * @desc    Get device by ID
 * @access  Authenticated users
 */
router.get('/:id', ensureAuthenticated, getDeviceById);

/**
 * @route   GET /api/devices/:id/readings
 * @desc    Get device sensor readings
 * @access  Authenticated users
 */
router.get('/:id/readings', ensureAuthenticated, getDeviceReadings);

/**
 * @route   PATCH /api/devices/:id
 * @desc    Update device
 * @access  Admin only
 */
router.patch('/:id', ensureAdmin, updateDevice);

/**
 * @route   DELETE /api/devices/:id
 * @desc    Delete device
 * @access  Admin only
 */
router.delete('/:id', ensureAdmin, deleteDevice);

/**
 * @route   POST /api/devices/readings
 * @desc    Process sensor data (internal - called by MQTT Bridge)
 * @access  Internal/System (should add API key middleware in production)
 */
router.post('/readings', processSensorData);

module.exports = router;
