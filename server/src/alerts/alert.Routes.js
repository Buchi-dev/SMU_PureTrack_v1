const express = require('express');
const {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  createAlert,
  deleteAlert,
  getAlertStats,
} = require('./alert.Controller');
const { ensureAuthenticated, ensureAdmin } = require('../auth/auth.Middleware');

const router = express.Router();

/**
 * @route   GET /api/alerts
 * @desc    Get all alerts (with filters)
 * @access  Authenticated users
 */
router.get('/', ensureAuthenticated, getAllAlerts);

/**
 * @route   GET /api/alerts/stats
 * @desc    Get alert statistics
 * @access  Authenticated users
 */
router.get('/stats', ensureAuthenticated, getAlertStats);

/**
 * @route   GET /api/alerts/:id
 * @desc    Get alert by ID
 * @access  Authenticated users
 */
router.get('/:id', ensureAuthenticated, getAlertById);

/**
 * @route   PATCH /api/alerts/:id/acknowledge
 * @desc    Acknowledge alert
 * @access  Authenticated users (Staff and Admin)
 */
router.patch('/:id/acknowledge', ensureAuthenticated, acknowledgeAlert);

/**
 * @route   PATCH /api/alerts/:id/resolve
 * @desc    Resolve alert with notes
 * @access  Authenticated users (Staff and Admin)
 */
router.patch('/:id/resolve', ensureAuthenticated, resolveAlert);

/**
 * @route   POST /api/alerts
 * @desc    Create alert (internal - called by sensor processor)
 * @access  Internal/System (should add API key middleware in production)
 */
router.post('/', createAlert);

/**
 * @route   DELETE /api/alerts/:id
 * @desc    Delete alert
 * @access  Admin only
 */
router.delete('/:id', ensureAdmin, deleteAlert);

module.exports = router;
