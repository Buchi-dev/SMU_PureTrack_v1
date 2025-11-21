/**
 * Error Classes Export
 * Centralized export for all custom error classes
 */

const AppError = require('./AppError');
const ValidationError = require('./ValidationError');
const NotFoundError = require('./NotFoundError');
const AuthenticationError = require('./AuthenticationError');
const ConflictError = require('./ConflictError');
const ERROR_CODES = require('./errorCodes');

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  ConflictError,
  ERROR_CODES,
};
