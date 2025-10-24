/**
 * HTTP Error Handler
 * Handles HTTP errors and provides user-friendly error messages
 */

import { AxiosError } from 'axios';
import type { ApiError } from '../../types';

/**
 * Parse Axios error and return structured error object
 */
export const parseHttpError = (error: unknown): ApiError => {
  if (error instanceof AxiosError) {
    const axiosError = error as AxiosError;

    // Extract error details from response
    const responseData = axiosError.response?.data as Record<string, unknown> | undefined;
    const message =
      (responseData?.error as string) ||
      (responseData?.message as string) ||
      axiosError.message ||
      'An unexpected error occurred';

    const status = axiosError.response?.status;
    const code = axiosError.code;
    const details = axiosError.response?.data;

    return {
      message,
      code,
      status,
      details,
    };
  }

  // Handle non-Axios errors
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  // Handle unknown errors
  return {
    message: 'An unknown error occurred',
    details: error,
  };
};

/**
 * Get user-friendly error message based on HTTP status code
 */
export const getErrorMessage = (error: ApiError): string => {
  const { message, status } = error;

  // Check status code for common HTTP errors
  if (status) {
    switch (status) {
      case 400:
        return `Bad Request: ${message}`;
      case 401:
        return 'Unauthorized. Please login again.';
      case 403:
        return 'Forbidden. You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 409:
        return 'Conflict. The resource already exists.';
      case 422:
        return `Validation Error: ${message}`;
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Internal server error. Please try again later.';
      case 502:
        return 'Bad Gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. The request took too long.';
      default:
        return message;
    }
  }

  // Check error code for network errors
  if (error.code) {
    switch (error.code) {
      case 'ECONNABORTED':
        return 'Request timeout. Please check your connection and try again.';
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
        return 'Network error. Please check your connection.';
      case 'ERR_NETWORK':
        return 'Network error. Please check your internet connection.';
      case 'ERR_CANCELED':
        return 'Request was canceled.';
      default:
        return message;
    }
  }

  return message;
};

/**
 * Log error for debugging (can be extended to send to error tracking service)
 */
export const logError = (error: ApiError, context?: string): void => {
  const timestamp = new Date().toISOString();
  const contextMsg = context ? ` [${context}]` : '';

  console.error(
    `[${timestamp}]${contextMsg} Error:`,
    {
      message: error.message,
      status: error.status,
      code: error.code,
      details: error.details,
    }
  );
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: ApiError): boolean => {
  return (
    error.code === 'ENOTFOUND' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED'
  );
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: ApiError): boolean => {
  return error.status === 401 || error.status === 403;
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: ApiError): boolean => {
  return error.status === 400 || error.status === 422;
};

/**
 * Check if error is a server error
 */
export const isServerError = (error: ApiError): boolean => {
  return !!error.status && error.status >= 500;
};
