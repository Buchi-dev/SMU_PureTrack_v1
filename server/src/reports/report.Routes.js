const express = require('express');
const {
  generateWaterQualityReport,
  generateDeviceStatusReport,
  getAllReports,
  getReportById,
  deleteReport,
  getReportHistory,
  downloadReport,
  getReportDiagnostics,
} = require('./report.Controller');
const { ensureAuthenticated, ensureAdmin } = require('../auth/auth.Middleware');
const {
  validateReportGeneration,
  validateMongoId,
  validatePagination,
} = require('../middleware/validation.middleware');

const router = express.Router();

/**
 * @route   GET /api/v1/reports/diagnostics
 * @desc    Get report generation diagnostics (data availability check)
 * @access  Authenticated users (Staff and Admin)
 */
router.get('/diagnostics', ensureAuthenticated, getReportDiagnostics);

/**
 * @route   POST /api/v1/reports/water-quality
 * @desc    Generate water quality report
 * @access  Authenticated users (Staff and Admin)
 */
router.post('/water-quality', ensureAuthenticated, validateReportGeneration, generateWaterQualityReport);

/**
 * @route   POST /api/v1/reports/device-status
 * @desc    Generate device status report
 * @access  Authenticated users (Staff and Admin)
 */
router.post('/device-status', ensureAuthenticated, validateReportGeneration, generateDeviceStatusReport);

/**
 * @route   GET /api/v1/reports
 * @desc    Get all reports (with filters)
 * @access  Authenticated users
 */
router.get('/', ensureAuthenticated, validatePagination, getAllReports);

/**
 * @route   GET /api/v1/reports/history
 * @desc    Get report history with stored PDFs
 * @access  Authenticated users
 */
router.get('/history', ensureAuthenticated, validatePagination, getReportHistory);

/**
 * @route   GET /api/v1/reports/download/:fileId
 * @desc    Download report PDF from GridFS
 * @access  Authenticated users (only their own reports)
 */
router.get('/download/:fileId', ensureAuthenticated, downloadReport);

/**
 * @route   DELETE /api/v1/reports/:id
 * @desc    Delete report
 * @access  Admin only
 */
router.delete('/:id', ensureAdmin, validateMongoId, deleteReport);

module.exports = router;
