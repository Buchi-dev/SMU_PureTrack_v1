const logger = require('./logger');
const { sendAlertEmail } = require('./email.service');

/**
 * Email Service
 * Handles synchronous email sending with simple retry logic
 */

// No initialization needed for synchronous email sending

/**
 * Send alert email with retry logic
 * @param {Object} user - User object with email
 * @param {Object} alert - Alert object
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<boolean>}
 */
const sendAlertEmailWithRetry = async (user, alert, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('Sending alert email:', {
        attempt,
        maxRetries,
        userEmail: user.email,
        alertId: alert.alertId,
        severity: alert.severity,
        parameter: alert.parameter,
      });

      const success = await sendAlertEmail(user, alert);

      if (success) {
        logger.info('Alert email sent successfully:', {
          userEmail: user.email,
          alertId: alert.alertId,
          attempt,
        });
        return true;
      } else {
        throw new Error('Email sending returned false');
      }
    } catch (error) {
      logger.error('Failed to send alert email:', {
        attempt,
        maxRetries,
        userEmail: user.email,
        alertId: alert.alertId,
        error: error.message,
        willRetry: attempt < maxRetries,
      });

      if (attempt >= maxRetries) {
        logger.error('Alert email failed after all retries:', {
          userEmail: user.email,
          alertId: alert.alertId,
          totalAttempts: maxRetries,
        });
        return false;
      }

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return false;
};

/**
 * Queue alert email (now sends synchronously)
 * @param {Object} user - User object with email
 * @param {Object} alert - Alert object
 * @returns {Promise<Object>}
 */
const queueAlertEmail = async (user, alert) => {
  logger.info('Sending alert email:', {
    userId: user._id,
    userEmail: user.email,
    alertId: alert.alertId,
    severity: alert.severity,
    parameter: alert.parameter,
  });

  try {
    const success = await sendAlertEmailWithRetry(user, alert);
    return { 
      synchronous: true, 
      success,
      recipient: user.email,
      alertId: alert.alertId 
    };
  } catch (error) {
    logger.error('Failed to send alert email:', {
      recipient: user.email,
      alertId: alert.alertId,
      error: error.message,
    });
    return { 
      synchronous: true, 
      success: false,
      error: error.message 
    };
  }
};

/**
 * Get email service statistics (simplified for synchronous mode)
 * @returns {Promise<Object>}
 */
const getQueueStats = async () => {
  return {
    mode: 'synchronous',
    message: 'Emails are sent synchronously without queuing',
  };
};

module.exports = {
  queueAlertEmail,
  getQueueStats,
};
