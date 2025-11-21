const AppError = require('./AppError');
const ERROR_CODES = require('./errorCodes');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Validation Error Class
 * Used for input validation failures
 */
class ValidationError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Array} errors - Array of validation errors
   * @param {Object} metadata - Additional context
   */
  constructor(message = 'Validation failed', errors = [], metadata = {}) {
    super(
      message,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_FAILED,
      true,
      { ...metadata, errors }
    );
    
    this.name = 'ValidationError';
  }

  /**
   * Create validation error from express-validator errors
   * @param {Array} validationErrors - Express-validator errors array
   */
  static fromExpressValidator(validationErrors) {
    const formattedErrors = validationErrors.map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return new ValidationError('Validation failed', formattedErrors);
  }
}

module.exports = ValidationError;
