const AppError = require('./AppError');
const ERROR_CODES = require('./errorCodes');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Conflict Error Class
 * Used when a resource already exists or operation conflicts with current state
 */
class ConflictError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} errorCode - Specific conflict error code
   * @param {Object} metadata - Additional context
   */
  constructor(
    message = 'Resource conflict', 
    errorCode = ERROR_CODES.RESOURCE_ALREADY_EXISTS,
    metadata = {}
  ) {
    super(message, HTTP_STATUS.CONFLICT, errorCode, true, metadata);
    
    this.name = 'ConflictError';
  }

  /**
   * Create error for already acknowledged alert
   */
  static alertAlreadyAcknowledged() {
    return new ConflictError(
      'Alert is already acknowledged',
      ERROR_CODES.ALERT_ALREADY_ACKNOWLEDGED
    );
  }

  /**
   * Create error for already resolved alert
   */
  static alertAlreadyResolved() {
    return new ConflictError(
      'Alert is already resolved',
      ERROR_CODES.ALERT_ALREADY_RESOLVED
    );
  }
}

module.exports = ConflictError;
