const ERROR_CODES = require('./errorCodes');

/**
 * Custom Application Error Class
 * Base class for all application errors
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application error code
   * @param {boolean} isOperational - Is this an operational error?
   * @param {Object} metadata - Additional error context
   */
  constructor(
    message, 
    statusCode = 500, 
    errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR,
    isOperational = true,
    metadata = {}
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      errorCode: this.errorCode,
      message: this.message,
      timestamp: this.timestamp,
      ...(Object.keys(this.metadata).length > 0 && { metadata: this.metadata }),
    };
  }
}

module.exports = AppError;
