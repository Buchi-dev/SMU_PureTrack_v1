/**
 * Sensor Data Processing Queue
 * Uses Bull queue to process device sensor data asynchronously
 * This prevents blocking the MQTT message handler during high load
 */

const Bull = require('bull');
const logger = require('./logger');

// Parse Redis URL for Bull queue configuration
// Format: redis://username:password@host:port
function parseRedisUrl(url) {
  if (!url) {
    logger.warn('[Sensor Queue] ⚠️ REDIS_URL not set - using localhost fallback (NOT recommended for production)');
    return {
      host: 'localhost',
      port: 6379,
      db: 1
    };
  }
  
  try {
    const urlObj = new URL(url);
    const config = {
      host: urlObj.hostname,
      port: parseInt(urlObj.port) || 6379,
      password: urlObj.password || undefined,
      username: urlObj.username !== 'default' ? urlObj.username : undefined,
      db: 1 // Use separate DB for Bull jobs (separate from main Redis cache)
    };
    
    logger.info('[Sensor Queue] ✓ Redis configured for Bull queue', {
      host: config.host,
      port: config.port,
      db: config.db,
      hasPassword: !!config.password,
      hasUsername: !!config.username
    });
    
    return config;
  } catch (error) {
    logger.error('[Sensor Queue] ❌ Failed to parse REDIS_URL - using localhost fallback:', {
      error: error.message,
      url: url.substring(0, 20) + '...' // Log partial URL for debugging
    });
    return {
      host: 'localhost',
      port: 6379,
      db: 1
    };
  }
}

// Create Bull queue for sensor data processing
const sensorDataQueue = new Bull('sensor-data-processing', {
  redis: parseRedisUrl(process.env.REDIS_URL),
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: 100, // Keep last 100 completed jobs for debugging
    removeOnFail: 500, // Keep last 500 failed jobs for analysis
  },
  limiter: {
    max: 50, // Process max 50 jobs
    duration: 1000, // per second (rate limiting)
  },
});

/**
 * Add sensor data to processing queue
 * @param {string} deviceId - Device identifier
 * @param {Object} data - Sensor data payload
 * @returns {Promise<Object>} Job instance
 */
async function queueSensorData(deviceId, data) {
  try {
    const job = await sensorDataQueue.add(
      'process-sensor-data',
      { deviceId, data },
      {
        priority: data.priority || 5, // Lower number = higher priority
        jobId: `${deviceId}-${Date.now()}`, // Unique job ID to prevent duplicates
      }
    );

    logger.debug(`[Sensor Queue] Queued sensor data from ${deviceId}`, {
      jobId: job.id,
      queueSize: await sensorDataQueue.count(),
    });

    return job;
  } catch (error) {
    logger.error(`[Sensor Queue] Failed to queue sensor data from ${deviceId}:`, error);
    throw error;
  }
}

/**
 * Process sensor data jobs
 */
sensorDataQueue.process('process-sensor-data', 10, async (job) => {
  const { deviceId, data } = job.data;
  const startTime = Date.now();

  try {
    logger.debug(`[Sensor Queue] Processing sensor data from ${deviceId}`, {
      jobId: job.id,
      attempt: job.attemptsMade + 1,
    });

    // Import controller dynamically to avoid circular dependencies
    const { processSensorData } = require('../devices/device.Controller');

    // Create mock request/response objects
    const mockReq = {
      body: {
        deviceId,
        ...data,
      },
      headers: {
        'x-api-key': process.env.API_KEY,
      },
    };

    const mockRes = {
      status: (code) => ({
        json: (responseData) => {
          job.progress(100);
          return responseData;
        },
      }),
      json: (responseData) => {
        job.progress(100);
        return responseData;
      },
    };

    // Process the sensor data
    await processSensorData(mockReq, mockRes);

    const duration = Date.now() - startTime;
    logger.debug(`[Sensor Queue] Completed processing for ${deviceId}`, {
      jobId: job.id,
      duration: `${duration}ms`,
    });

    return { success: true, deviceId, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[Sensor Queue] Failed to process sensor data from ${deviceId}:`, {
      jobId: job.id,
      attempt: job.attemptsMade + 1,
      duration: `${duration}ms`,
      error: error.message,
    });

    throw error; // Re-throw to trigger Bull's retry mechanism
  }
});

/**
 * Queue event handlers for monitoring
 */
sensorDataQueue.on('completed', (job, result) => {
  logger.debug(`[Sensor Queue] Job completed`, {
    jobId: job.id,
    deviceId: job.data.deviceId,
    duration: result.duration,
  });
});

sensorDataQueue.on('failed', (job, err) => {
  logger.error(`[Sensor Queue] Job failed`, {
    jobId: job.id,
    deviceId: job.data.deviceId,
    attempt: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    error: err.message,
  });
});

sensorDataQueue.on('stalled', (job) => {
  logger.warn(`[Sensor Queue] Job stalled`, {
    jobId: job.id,
    deviceId: job.data.deviceId,
  });
});

sensorDataQueue.on('active', (job) => {
  logger.debug(`[Sensor Queue] Job started`, {
    jobId: job.id,
    deviceId: job.data.deviceId,
  });
});

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue stats
 */
async function getQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      sensorDataQueue.getWaitingCount(),
      sensorDataQueue.getActiveCount(),
      sensorDataQueue.getCompletedCount(),
      sensorDataQueue.getFailedCount(),
      sensorDataQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  } catch (error) {
    logger.error('[Sensor Queue] Failed to get queue stats:', error);
    return null;
  }
}

/**
 * Clean old jobs from queue
 * @param {number} grace - Grace period in milliseconds (default: 1 hour)
 */
async function cleanOldJobs(grace = 3600000) {
  try {
    await sensorDataQueue.clean(grace, 'completed');
    await sensorDataQueue.clean(grace, 'failed');
    logger.info(`[Sensor Queue] Cleaned old jobs (grace period: ${grace}ms)`);
  } catch (error) {
    logger.error('[Sensor Queue] Failed to clean old jobs:', error);
  }
}

/**
 * Gracefully close the queue
 */
async function closeQueue() {
  try {
    logger.info('[Sensor Queue] Closing sensor data queue...');
    await sensorDataQueue.close();
    logger.info('[Sensor Queue] Queue closed successfully');
  } catch (error) {
    logger.error('[Sensor Queue] Error closing queue:', error);
  }
}

// Clean old jobs every hour
setInterval(() => {
  cleanOldJobs(3600000); // 1 hour
}, 3600000);

module.exports = {
  sensorDataQueue,
  queueSensorData,
  getQueueStats,
  cleanOldJobs,
  closeQueue,
};
