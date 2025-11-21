const { HTTP_STATUS } = require('./constants');

/**
 * Response Helpers
 * Standardized response functions for consistent API responses
 */

class ResponseHelper {
  /**
   * Send success response with data
   * @param {Object} res - Express response object
   * @param {any} data - Response data
   * @param {string} message - Optional success message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data, message = null, statusCode = HTTP_STATUS.OK) {
    const response = {
      success: true,
    };

    if (message) {
      response.message = message;
    }

    if (data !== undefined && data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send success response for resource creation
   * @param {Object} res - Express response object
   * @param {any} data - Created resource data
   * @param {string} message - Success message
   */
  static created(res, data, message = 'Resource created successfully') {
    return ResponseHelper.success(res, data, message, HTTP_STATUS.CREATED);
  }

  /**
   * Send paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of items
   * @param {Object} pagination - Pagination metadata
   * @param {string} message - Optional message
   */
  static paginated(res, data, pagination, message = null) {
    const response = {
      success: true,
    };

    if (message) {
      response.message = message;
    }

    response.data = data;
    response.pagination = {
      total: pagination.total || 0,
      page: pagination.page || 1,
      pages: pagination.pages || 1,
      limit: pagination.limit || data.length,
    };

    return res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Send no content response (204)
   * Used for successful DELETE operations
   * @param {Object} res - Express response object
   */
  static noContent(res) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application error code
   * @param {Object} metadata - Additional error context
   */
  static error(res, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode = null, metadata = {}) {
    const response = {
      success: false,
      message,
    };

    if (errorCode) {
      response.errorCode = errorCode;
    }

    if (Object.keys(metadata).length > 0) {
      response.metadata = metadata;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send not found error (404)
   * @param {Object} res - Express response object
   * @param {string} resource - Resource name
   */
  static notFound(res, resource = 'Resource') {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: `${resource} not found`,
    });
  }

  /**
   * Send bad request error (400)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Array} errors - Validation errors array
   */
  static badRequest(res, message = 'Bad request', errors = []) {
    const response = {
      success: false,
      message,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return res.status(HTTP_STATUS.BAD_REQUEST).json(response);
  }

  /**
   * Send unauthorized error (401)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static unauthorized(res, message = 'Unauthorized') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message,
    });
  }

  /**
   * Send forbidden error (403)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static forbidden(res, message = 'Forbidden') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message,
    });
  }

  /**
   * Send conflict error (409)
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   */
  static conflict(res, message = 'Resource conflict') {
    return res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      message,
    });
  }

  /**
   * Send validation error response
   * @param {Object} res - Express response object
   * @param {Array} errors - Validation errors from express-validator
   */
  static validationError(res, errors) {
    const formattedErrors = errors.map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }
}

module.exports = ResponseHelper;
