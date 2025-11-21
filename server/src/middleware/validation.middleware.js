const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../errors');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw ValidationError.fromExpressValidator(errors.array());
  }
  next();
};

/**
 * Validation for sensor data processing
 */
const validateSensorData = [
  body('deviceId')
    .notEmpty().withMessage('Device ID is required')
    .isString().withMessage('Device ID must be a string')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Device ID must be 3-50 characters'),
  body('pH')
    .notEmpty().withMessage('pH value is required')
    .isFloat({ min: 0, max: 14 }).withMessage('pH must be between 0 and 14'),
  body('turbidity')
    .notEmpty().withMessage('Turbidity value is required')
    .isFloat({ min: 0 }).withMessage('Turbidity must be a positive number'),
  body('tds')
    .notEmpty().withMessage('TDS value is required')
    .isFloat({ min: 0 }).withMessage('TDS must be a positive number'),
  body('timestamp')
    .optional()
    .isISO8601().withMessage('Invalid timestamp format'),
  handleValidationErrors,
];

/**
 * Validation for device update
 */
const validateDeviceUpdate = [
  body('location')
    .optional()
    .isString().withMessage('Location must be a string')
    .trim()
    .isLength({ max: 200 }).withMessage('Location must be less than 200 characters'),
  body('registrationStatus')
    .optional()
    .isIn(['registered', 'pending']).withMessage('Invalid registration status'),
  body('metadata')
    .optional()
    .isObject().withMessage('Metadata must be an object'),
  handleValidationErrors,
];

/**
 * Validation for user role update
 */
const validateUserRoleUpdate = [
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['admin', 'staff']).withMessage('Role must be either admin or staff'),
  handleValidationErrors,
];

/**
 * Validation for user status update
 */
const validateUserStatusUpdate = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['active', 'pending', 'suspended']).withMessage('Status must be active, pending, or suspended'),
  handleValidationErrors,
];

/**
 * Validation for alert acknowledgment
 */
const validateAlertAcknowledgment = [
  param('id')
    .notEmpty().withMessage('Alert ID is required')
    .isMongoId().withMessage('Invalid alert ID'),
  handleValidationErrors,
];

/**
 * Validation for alert resolution
 */
const validateAlertResolution = [
  param('id')
    .notEmpty().withMessage('Alert ID is required')
    .isMongoId().withMessage('Invalid alert ID'),
  body('resolutionNotes')
    .optional()
    .isString().withMessage('Resolution notes must be a string')
    .trim()
    .isLength({ max: 1000 }).withMessage('Resolution notes must be less than 1000 characters'),
  handleValidationErrors,
];

/**
 * Validation for report generation
 */
const validateReportGeneration = [
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date format'),
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('deviceIds')
    .optional()
    .isArray().withMessage('Device IDs must be an array'),
  handleValidationErrors,
];

/**
 * Validation for date range queries
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
  handleValidationErrors,
];

/**
 * Validation for pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

/**
 * Validation for MongoDB ObjectId params
 */
const validateMongoId = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors,
];

module.exports = {
  validateSensorData,
  validateDeviceUpdate,
  validateUserRoleUpdate,
  validateUserStatusUpdate,
  validateAlertAcknowledgment,
  validateAlertResolution,
  validateReportGeneration,
  validateDateRange,
  validatePagination,
  validateMongoId,
  handleValidationErrors,
};
