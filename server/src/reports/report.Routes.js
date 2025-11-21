const express = require('express');
const {
  generateWaterQualityReport,
  generateDeviceStatusReport,
  getAllReports,
  getReportById,
  deleteReport,
} = require('./report.Controller');
const { ensureAuthenticated, ensureAdmin } = require('../auth/auth.Middleware');
const { reportLimiter } = require('../middleware/rate-limit.middleware');
const {
  validateReportGeneration,
  validateMongoId,
  validatePagination,
} = require('../middleware/validation.middleware');

const router = express.Router();

/**
 * @route   POST /api/v1/reports/water-quality
 * @desc    Generate water quality report
 * @access  Authenticated users (Staff and Admin)
 */
router.post('/water-quality', ensureAuthenticated, reportLimiter, validateReportGeneration, generateWaterQualityReport);

/**
 * @route   POST /api/v1/reports/device-status
 * @desc    Generate device status report
 * @access  Authenticated users (Staff and Admin)
 */
router.post('/device-status', ensureAuthenticated, reportLimiter, validateReportGeneration, generateDeviceStatusReport);

/**
 * @route   GET /api/v1/reports
 * @desc    Get all reports (with filters)
 * @access  Authenticated users
 */
router.get('/', ensureAuthenticated, validatePagination, getAllReports);

/**
 * @route   GET /api/v1/reports/:id
 * @desc    Get report by ID
 * @access  Authenticated users
 */
router.get('/:id', ensureAuthenticated, validateMongoId, getReportById);

/**
 * @route   DELETE /api/v1/reports/:id
 * @desc    Delete report
 * @access  Admin only
 */
router.delete('/:id', ensureAdmin, validateMongoId, deleteReport);

module.exports = router;
