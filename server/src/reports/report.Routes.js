const express = require('express');
const {
  generateWaterQualityReport,
  generateDeviceStatusReport,
  getAllReports,
  getReportById,
  deleteReport,
} = require('./report.Controller');
const { ensureAuthenticated, ensureAdmin } = require('../auth/auth.Middleware');

const router = express.Router();

/**
 * @route   POST /api/reports/water-quality
 * @desc    Generate water quality report
 * @access  Authenticated users (Staff and Admin)
 */
router.post('/water-quality', ensureAuthenticated, generateWaterQualityReport);

/**
 * @route   POST /api/reports/device-status
 * @desc    Generate device status report
 * @access  Authenticated users (Staff and Admin)
 */
router.post('/device-status', ensureAuthenticated, generateDeviceStatusReport);

/**
 * @route   GET /api/reports
 * @desc    Get all reports (with filters)
 * @access  Authenticated users
 */
router.get('/', ensureAuthenticated, getAllReports);

/**
 * @route   GET /api/reports/:id
 * @desc    Get report by ID
 * @access  Authenticated users
 */
router.get('/:id', ensureAuthenticated, getReportById);

/**
 * @route   DELETE /api/reports/:id
 * @desc    Delete report
 * @access  Admin only
 */
router.delete('/:id', ensureAdmin, deleteReport);

module.exports = router;
