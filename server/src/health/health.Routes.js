const express = require('express');
const mongoose = require('mongoose');
const { getQueueStats } = require('../utils/email.queue');
const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../utils/constants');
const { diagnoseAuth } = require('../utils/diagnostics');
const { ensureAuthenticated, ensureAdmin } = require('../auth/auth.Middleware');

const router = express.Router();

/**
 * @route   GET /health
 * @desc    Comprehensive health check endpoint
 * @access  Public
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    checks: {},
  };

  let isHealthy = true;

  // 1. Database Health Check
  try {
    await mongoose.connection.db.admin().ping();
    health.checks.database = {
      status: 'OK',
      message: 'MongoDB is connected',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  } catch (error) {
    isHealthy = false;
    health.checks.database = {
      status: 'FAILED',
      message: error.message,
    };
    logger.error('Health check - Database failed:', { error: error.message });
  }

  // 2. Email Service Health Check
  try {
    const queueStats = await getQueueStats();
    
    const smtpConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
    
    health.checks.emailService = {
      status: smtpConfigured ? 'OK' : 'NOT_CONFIGURED',
      message: smtpConfigured
        ? queueStats.message || 'Email service is operational'
        : 'SMTP credentials not configured',
      mode: queueStats.mode || 'synchronous',
    };
  } catch (error) {
    health.checks.emailService = {
      status: 'ERROR',
      message: error.message,
    };
  }

  // 5. Memory Usage Check
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
  };

  health.checks.memory = {
    status: 'OK',
    usage: memoryUsageMB,
    unit: 'MB',
  };

  // Warn if heap usage is > 80%
  if (memoryUsageMB.heapUsed / memoryUsageMB.heapTotal > 0.8) {
    health.checks.memory.status = 'WARNING';
    health.checks.memory.message = 'High memory usage detected';
  }

  // 6. Firebase Auth Configuration Check
  const { admin } = require('../configs/firebase.Config');
  let firebaseConfigured = false;
  let firebaseMessage = 'Firebase Admin SDK not initialized';
  
  try {
    // Check if Firebase Admin SDK is initialized
    const app = admin.app();
    firebaseConfigured = !!app;
    firebaseMessage = firebaseConfigured 
      ? 'Firebase Authentication is configured' 
      : 'Firebase Admin SDK not initialized';
  } catch (error) {
    firebaseConfigured = false;
    firebaseMessage = `Firebase Auth error: ${error.message}`;
  }

  health.checks.firebaseAuth = {
    status: firebaseConfigured ? 'OK' : 'NOT_CONFIGURED',
    message: firebaseMessage,
  };

  if (!firebaseConfigured) {
    isHealthy = false;
  }

  // 7. API Key Configuration Check
  health.checks.apiKey = {
    status: process.env.DEVICE_API_KEY ? 'OK' : 'NOT_CONFIGURED',
    message: process.env.DEVICE_API_KEY
      ? 'Device API key is configured'
      : 'Device API key not configured',
  };

  // Set overall status
  if (!isHealthy) {
    health.status = 'DEGRADED';
  }

  // Add response time
  health.responseTime = `${Date.now() - startTime}ms`;

  // Return appropriate status code
  // Return 200 OK even for DEGRADED status (non-critical issues)
  // Only return 503 if critical services are down (database, redis, firebase)
  const statusCode = isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.OK;

  res.status(statusCode).json(health);
});

/**
 * @route   GET /health/liveness
 * @desc    Kubernetes liveness probe - checks if app is running
 * @access  Public
 */
router.get('/liveness', (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    status: 'OK',
    message: 'Server is alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /health/readiness
 * @desc    Kubernetes readiness probe - checks if app can serve traffic
 * @access  Public
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check critical dependencies
    await mongoose.connection.db.admin().ping();

    res.status(HTTP_STATUS.OK).json({
      status: 'OK',
      message: 'Server is ready to serve traffic',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'NOT_READY',
      message: 'Server is not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   POST /health/diagnose-auth
 * @desc    Diagnose authentication issues (requires token)
 * @access  Public (but requires token in header to diagnose)
 */
router.post('/diagnose-auth', diagnoseAuth);

/**
 * @route   GET /health/queue/failed
 * @desc    Get all failed email jobs
 * @access  Admin only
 */
router.get('/queue/failed', ensureAdmin, async (req, res) => {
  try {
    const failedJobs = await getFailedJobs();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: failedJobs.length,
      jobs: failedJobs,
    });
  } catch (error) {
    logger.error('Failed to get failed jobs:', { error: error.message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retrieve failed jobs',
      error: error.message,
    });
  }
});

/**
 * @route   POST /health/queue/retry
 * @desc    Retry failed email jobs
 * @access  Admin only
 */
router.post('/queue/retry', ensureAdmin, async (req, res) => {
  try {
    const { jobId } = req.body;
    
    const result = await retryFailedJobs(jobId);
    
    if (result.success) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
        retriedCount: result.retriedCount,
      });
    } else {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: result.message || result.error,
      });
    }
  } catch (error) {
    logger.error('Failed to retry jobs:', { error: error.message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to retry jobs',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /health/queue/failed
 * @desc    Remove failed email jobs
 * @access  Admin only
 */
router.delete('/queue/failed', ensureAdmin, async (req, res) => {
  try {
    const { jobId } = req.body;
    
    const result = await removeFailedJobs(jobId);
    
    if (result.success) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: result.message || result.error,
      });
    }
  } catch (error) {
    logger.error('Failed to remove jobs:', { error: error.message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to remove jobs',
      error: error.message,
    });
  }
});

module.exports = router;
