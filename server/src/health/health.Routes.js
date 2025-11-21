const express = require('express');
const mongoose = require('mongoose');
const { pingRedis, isRedisAvailable } = require('../configs/redis.Config');
const { getQueueStats } = require('../utils/email.queue');
const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../utils/constants');

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

  // 2. Redis Health Check
  if (isRedisAvailable()) {
    const redisPing = await pingRedis();
    health.checks.redis = {
      status: redisPing ? 'OK' : 'FAILED',
      message: redisPing ? 'Redis is connected' : 'Redis ping failed',
    };
    
    if (!redisPing) {
      isHealthy = false;
    }
  } else {
    health.checks.redis = {
      status: 'NOT_CONFIGURED',
      message: 'Redis is not configured',
    };
  }

  // 3. Email Queue Health Check
  try {
    const queueStats = await getQueueStats();
    
    if (queueStats.available) {
      health.checks.emailQueue = {
        status: 'OK',
        message: 'Email queue is operational',
        stats: {
          waiting: queueStats.waiting,
          active: queueStats.active,
          failed: queueStats.failed,
        },
      };
      
      // Warn if too many failed jobs
      if (queueStats.failed > 10) {
        health.checks.emailQueue.status = 'WARNING';
        health.checks.emailQueue.message = `${queueStats.failed} failed jobs in queue`;
      }
    } else {
      health.checks.emailQueue = {
        status: 'NOT_CONFIGURED',
        message: queueStats.message || 'Email queue not initialized',
      };
    }
  } catch (error) {
    health.checks.emailQueue = {
      status: 'ERROR',
      message: error.message,
    };
  }

  // 4. Email Service Health Check
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
  
  health.checks.emailService = {
    status: smtpConfigured ? 'OK' : 'NOT_CONFIGURED',
    message: smtpConfigured
      ? 'SMTP is configured'
      : 'SMTP credentials not configured',
  };

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

  // 6. OAuth Configuration Check
  const oauthConfigured = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
  );

  health.checks.oauth = {
    status: oauthConfigured ? 'OK' : 'NOT_CONFIGURED',
    message: oauthConfigured
      ? 'Google OAuth is configured'
      : 'Google OAuth credentials not configured',
  };

  if (!oauthConfigured) {
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
  const statusCode = health.status === 'OK' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

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

module.exports = router;
