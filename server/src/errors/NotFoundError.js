const AppError = require('./AppError');
const ERROR_CODES = require('./errorCodes');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Not Found Error Class
 * Used when a requested resource doesn't exist
 */
class NotFoundError extends AppError {
  /**
   * @param {string} resource - Name of the resource not found
   * @param {string} identifier - Identifier used to search for the resource
   * @param {Object} metadata - Additional context
   */
  constructor(resource = 'Resource', identifier = '', metadata = {}) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    // Determine specific error code based on resource type
    let errorCode = ERROR_CODES.RESOURCE_NOT_FOUND;
    
    const resourceLower = resource.toLowerCase();
    if (resourceLower.includes('user')) {
      errorCode = ERROR_CODES.USER_NOT_FOUND;
    } else if (resourceLower.includes('device')) {
      errorCode = ERROR_CODES.DEVICE_NOT_FOUND;
    } else if (resourceLower.includes('alert')) {
      errorCode = ERROR_CODES.ALERT_NOT_FOUND;
    } else if (resourceLower.includes('report')) {
      errorCode = ERROR_CODES.REPORT_NOT_FOUND;
    }

    super(message, HTTP_STATUS.NOT_FOUND, errorCode, true, metadata);
    
    this.name = 'NotFoundError';
    this.resource = resource;
    this.identifier = identifier;
  }
}

module.exports = NotFoundError;
