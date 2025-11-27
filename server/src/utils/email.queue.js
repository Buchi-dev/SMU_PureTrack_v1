const Queue = require('bull');
const logger = require('./logger');
const { sendAlertEmail } = require('./email.service');
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
 * Process email job with improved error handling
 * @param {Object} job - Bull job object
 */
const processEmailJob = async (job) => {
  const { type, recipient, data } = job.data;

  logger.info('Processing email job:', {
    jobId: job.id,
    type,
    recipient: recipient.email,
    attempts: job.attemptsMade + 1, // Current attempt (0-indexed, so +1)
    maxAttempts: EMAIL.RETRY_ATTEMPTS,
    jobData: {
      alertId: data?.alert?.alertId,
      severity: data?.alert?.severity,
      parameter: data?.alert?.parameter,
    },
  });

  try {
    let success = false;

    switch (type) {
      case 'alert':
        logger.info('Sending alert email:', {
          jobId: job.id,
          recipient: recipient.email,
          alertId: data.alert.alertId,
          severity: data.alert.severity,
        });
        success = await sendAlertEmail(recipient, data.alert);
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    if (!success) {
      const attemptNumber = job.attemptsMade + 1;
      
      // Different logging based on retry status
      if (attemptNumber < EMAIL.RETRY_ATTEMPTS) {
        logger.warn('Email sending failed, will retry:', {
          jobId: job.id,
          type,
          recipient: recipient.email,
          attemptNumber,
          maxAttempts: EMAIL.RETRY_ATTEMPTS,
          nextRetryIn: `${EMAIL.RETRY_DELAY / 1000}s`,
        });
      } else {
        logger.error('Email sending failed after all retries:', {
          jobId: job.id,
          type,
          recipient: recipient.email,
          totalAttempts: EMAIL.RETRY_ATTEMPTS,
        });
      }
      
      throw new Error('Email sending failed');
    }

    logger.info('Email job completed successfully:', {
      jobId: job.id,
      type,
      recipient: recipient.email,
    });

    return { success: true, recipient: recipient.email };
  } catch (error) {
    const attemptNumber = job.attemptsMade + 1;
    const isLastAttempt = attemptNumber >= EMAIL.RETRY_ATTEMPTS;
    
    logger.error('Email job processing error:', {
      jobId: job.id,
      type,
      recipient: recipient.email,
      error: error.message,
      // Only log stack trace on final failure to reduce log noise
      ...(isLastAttempt && { stack: error.stack }),
      attemptNumber,
      maxAttempts: EMAIL.RETRY_ATTEMPTS,
      willRetry: !isLastAttempt,
    });
    
    throw error; // Re-throw to trigger retry
  }
};

/**
 * Add alert email to queue
 * @param {Object} user - User object with email
 * @param {Object} alert - Alert object
 * @returns {Promise<Object>} Job object
 */
const queueAlertEmail = async (user, alert) => {
  logger.info('Queueing alert email:', {
    userId: user._id,
    userEmail: user.email,
    alertId: alert.alertId,
    severity: alert.severity,
    parameter: alert.parameter,
    queueAvailable: !!emailQueue,
  });

  if (!emailQueue) {
    // Fallback to synchronous sending if queue not available
    logger.warn('Email queue not available, attempting synchronous send', {
      userEmail: user.email,
      alertId: alert.alertId,
    });
    try {
      if (typeof sendAlertEmail === 'function') {
        const success = await sendAlertEmail(user, alert);
        logger.info('Synchronous email send result:', {
          userEmail: user.email,
          alertId: alert.alertId,
          success,
        });
        return { synchronous: true, success };
      } else {
        logger.error('sendAlertEmail function not available');
        return { synchronous: true, success: false };
      }
    } catch (syncError) {
      logger.error('Synchronous email send failed:', {
        userEmail: user.email,
        alertId: alert.alertId,
        error: syncError.message,
      });
      return { synchronous: true, success: false };
    }
  }

  try {
    logger.info('Adding email job to queue:', {
      userEmail: user.email,
      alertId: alert.alertId,
      severity: alert.severity,
    });

    const job = await emailQueue.add(
      {
        type: 'alert',
        recipient: user,
        data: {
          alert,
        },
      },
      {
        priority: 1, // High priority for alerts
      }
    );

    logger.info('Alert email successfully queued:', {
      jobId: job.id,
      recipient: user.email,
      alertId: alert.alertId,
      severity: alert.severity,
      queueName: 'email-notifications',
    });

    return job;
  } catch (error) {
    logger.error('Failed to queue alert email:', {
      recipient: user.email,
      alertId: alert.alertId,
      error: error.message,
      stack: error.stack,
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
  queueAlertEmail,
  getQueueStats,
  cleanCompletedJobs,
  closeEmailQueue,
};
