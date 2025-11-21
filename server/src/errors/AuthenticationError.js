const AppError = require('./AppError');
const ERROR_CODES = require('./errorCodes');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Authentication Error Class
 * Used for authentication and authorization failures
 */
class AuthenticationError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} errorCode - Specific auth error code
   * @param {Object} metadata - Additional context
   */
  constructor(
    message = 'Authentication failed', 
    errorCode = ERROR_CODES.AUTH_UNAUTHORIZED,
    metadata = {}
  ) {
    // Determine status code based on error type
    const statusCode = errorCode.includes('FORBIDDEN') 
      ? HTTP_STATUS.FORBIDDEN 
      : HTTP_STATUS.UNAUTHORIZED;

    super(message, statusCode, errorCode, true, metadata);
    
    this.name = 'AuthenticationError';
  }

  /**
   * Create error for missing token
   */
  static missingToken() {
    return new AuthenticationError(
      'Authentication token is required',
      ERROR_CODES.AUTH_TOKEN_MISSING
    );
  }

  /**
   * Create error for invalid token
   */
  static invalidToken(details = '') {
    return new AuthenticationError(
      'Invalid authentication token',
      ERROR_CODES.AUTH_TOKEN_INVALID,
      details ? { details } : {}
    );
  }

  /**
   * Create error for expired token
   */
  static expiredToken() {
    return new AuthenticationError(
      'Authentication token has expired',
      ERROR_CODES.AUTH_TOKEN_EXPIRED
    );
  }

  /**
   * Create error for suspended account
   */
  static accountSuspended() {
    return new AuthenticationError(
      'Account has been suspended',
      ERROR_CODES.AUTH_ACCOUNT_SUSPENDED,
      {}
    );
  }

  /**
   * Create error for pending account
   */
  static accountPending() {
    return new AuthenticationError(
      'Account is pending approval',
      ERROR_CODES.AUTH_ACCOUNT_PENDING,
      {}
    );
  }

  /**
   * Create error for insufficient permissions
   */
  static forbidden(action = '') {
    const message = action 
      ? `You don't have permission to ${action}`
      : 'Insufficient permissions';
      
    return new AuthenticationError(
      message,
      ERROR_CODES.AUTH_FORBIDDEN
    );
  }
}

module.exports = AuthenticationError;
