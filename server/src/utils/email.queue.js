const Queue = require('bull');
const logger = require('./logger');
const { sendWeeklyReportEmail, sendAlertEmail } = require('./email.service');
const { EMAIL } = require('./constants');

/**
 * Email Queue Service
 * Handles asynchronous email sending using Bull queues
 * Provides retry logic and batch processing
 */

let emailQueue = null;

/**
 * Initialize email queue
 * @param {string} redisUrl - Redis connection URL
 */
const initializeEmailQueue = (redisUrl) => {
  if (!redisUrl) {
    logger.warn('Redis URL not provided. Email queue disabled. Emails will be sent synchronously.');
    return null;
  }

  try {
    emailQueue = new Queue('email-notifications', redisUrl, {
      defaultJobOptions: {
        attempts: EMAIL.RETRY_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: EMAIL.RETRY_DELAY,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Event handlers
    emailQueue.on('error', (error) => {
      logger.error('Email queue error:', { error: error.message });
    });

    emailQueue.on('failed', (job, error) => {
      logger.error('Email job failed:', {
        jobId: job.id,
        jobType: job.data.type,
        recipient: job.data.recipient,
        error: error.message,
        attempts: job.attemptsMade,
      });
    });

    emailQueue.on('completed', (job) => {
      logger.info('Email job completed:', {
        jobId: job.id,
        jobType: job.data.type,
        recipient: job.data.recipient,
        duration: Date.now() - job.timestamp,
      });
    });

    // Process jobs
    emailQueue.process(EMAIL.BATCH_SIZE, async (job) => {
      return await processEmailJob(job);
    });

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      logger.info('[OK] Email queue ready');
    } else {
      logger.info('[OK] Email queue initialized');
    }
    return emailQueue;
  } catch (error) {
    logger.error('Failed to initialize email queue:', { error: error.message });
    return null;
  }
};

/**
 * Process email job
 * @param {Object} job - Bull job object
 */
const processEmailJob = async (job) => {
  const { type, recipient, data } = job.data;

  try {
    logger.debug('Processing email job:', {
      jobId: job.id,
      type,
      recipient,
    });

    let success = false;

    switch (type) {
      case 'weekly-report':
        success = await sendWeeklyReportEmail(recipient, data.reports);
        break;

      case 'alert':
        success = await sendAlertEmail(recipient, data.alert);
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    if (!success) {
      throw new Error('Email sending failed');
    }

    return { success: true, recipient };
  } catch (error) {
    logger.error('Email job processing error:', {
      jobId: job.id,
      type,
      recipient,
      error: error.message,
    });
    throw error; // Re-throw to trigger retry
  }
};

/**
 * Add weekly report email to queue
 * @param {Object} user - User object with email
 * @param {Array} reports - Array of report objects
 * @returns {Promise<Object>} Job object
 */
const queueWeeklyReportEmail = async (user, reports) => {
  if (!emailQueue) {
    // Fallback to synchronous sending if queue not available
    logger.warn('Email queue not available, sending synchronously');
    await sendWeeklyReportEmail(user, reports);
    return null;
  }

  try {
    const job = await emailQueue.add({
      type: 'weekly-report',
      recipient: user.email,
      data: {
        reports,
      },
    });

    logger.debug('Weekly report email queued:', {
      jobId: job.id,
      recipient: user.email,
    });

    return job;
  } catch (error) {
    logger.error('Failed to queue weekly report email:', {
      recipient: user.email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Add alert email to queue
 * @param {Object} user - User object with email
 * @param {Object} alert - Alert object
 * @returns {Promise<Object>} Job object
 */
const queueAlertEmail = async (user, alert) => {
  if (!emailQueue) {
    // Fallback to synchronous sending if queue not available
    logger.warn('Email queue not available, sending synchronously');
    if (typeof sendAlertEmail === 'function') {
      await sendAlertEmail(user, alert);
    }
    return null;
  }

  try {
    const job = await emailQueue.add(
      {
        type: 'alert',
        recipient: user.email,
        data: {
          alert,
        },
      },
      {
        priority: 1, // High priority for alerts
      }
    );

    logger.debug('Alert email queued:', {
      jobId: job.id,
      recipient: user.email,
      alertId: alert.alertId,
    });

    return job;
  } catch (error) {
    logger.error('Failed to queue alert email:', {
      recipient: user.email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get queue statistics
 * @returns {Promise<Object>}
 */
const getQueueStats = async () => {
  if (!emailQueue) {
    return {
      available: false,
      message: 'Email queue not initialized',
    };
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ]);

    return {
      available: true,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', { error: error.message });
    return {
      available: false,
      error: error.message,
    };
  }
};

/**
 * Clean completed jobs
 * @param {number} grace - Grace period in milliseconds
 */
const cleanCompletedJobs = async (grace = 3600000) => {
  if (!emailQueue) {
    return;
  }

  try {
    await emailQueue.clean(grace, 'completed');
    logger.info('Cleaned completed email jobs');
  } catch (error) {
    logger.error('Failed to clean completed jobs:', { error: error.message });
  }
};

/**
 * Close email queue
 */
const closeEmailQueue = async () => {
  if (emailQueue) {
    try {
      await emailQueue.close();
      logger.info('Email queue closed');
    } catch (error) {
      logger.error('Error closing email queue:', { error: error.message });
    }
  }
};

module.exports = {
  initializeEmailQueue,
  queueWeeklyReportEmail,
  queueAlertEmail,
  getQueueStats,
  cleanCompletedJobs,
  closeEmailQueue,
};
