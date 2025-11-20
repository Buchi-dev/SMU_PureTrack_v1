const express = require('express');
const {
  getTrends,
  getSummary,
  getParameterAnalytics,
} = require('./analytics.Controller');
const { ensureAuthenticated } = require('../auth/auth.Middleware');

const router = express.Router();

/**
 * @route   GET /api/analytics/summary
 * @desc    Get dashboard summary statistics
 * @access  Authenticated users
 */
router.get('/summary', ensureAuthenticated, getSummary);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get water quality trends over time
 * @access  Authenticated users
 */
router.get('/trends', ensureAuthenticated, getTrends);

/**
 * @route   GET /api/analytics/parameters
 * @desc    Get parameter-specific analytics
 * @access  Authenticated users
 */
router.get('/parameters', ensureAuthenticated, getParameterAnalytics);

module.exports = router;
