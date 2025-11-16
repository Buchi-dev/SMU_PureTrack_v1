/**
 * Error Classification Utility
 * Classify errors for consistent retry/handling behavior
 *
 * @module utils/errorClassification
 *
 * Purpose: Provide consistent error handling across all Cloud Functions
 */

import {logger} from "firebase-functions/v2";

/**
 * Error action types
 */
export enum ErrorAction {
  /** Transient error - retry recommended */
  RETRY = "RETRY",

  /** Permanent error - don't retry, skip processing */
  SKIP = "SKIP",

  /** Non-critical error - log and continue */
  CONTINUE = "CONTINUE",
}

/**
 * Firestore error codes that are retriable
 */
const RETRIABLE_FIRESTORE_CODES = [
  "unavailable",
  "deadline-exceeded",
  "resource-exhausted",
  "aborted",
  "internal",
];

/**
 * Firestore error codes that are permanent (don't retry)
 */
const PERMANENT_FIRESTORE_CODES = [
  "not-found",
  "already-exists",
  "permission-denied",
  "invalid-argument",
  "failed-precondition",
  "out-of-range",
  "unauthenticated",
];

/**
 * Classify an error to determine appropriate action
 *
 * @param {unknown} error - Error to classify
 * @param {string} context - Context for logging
 * @return {ErrorAction} Action to take
 */
export function classifyError(error: unknown, context: string = "Unknown"): ErrorAction {
  // Handle null/undefined
  if (!error) {
    logger.warn(`Null error in ${context}`);
    return ErrorAction.CONTINUE;
  }

  // Extract error information
  const errorObj = error as Record<string, unknown>;
  const code = (typeof errorObj.code === "string" ? errorObj.code.toLowerCase() : "") || "";
  const message = (typeof errorObj.message === "string" ? errorObj.message : String(error)) || "";

  // Check for retriable Firestore errors
  if (RETRIABLE_FIRESTORE_CODES.includes(code)) {
    logger.warn(`Retriable error in ${context}`, {
      code,
      message: message.substring(0, 200),
    });
    return ErrorAction.RETRY;
  }

  // Check for permanent Firestore errors
  if (PERMANENT_FIRESTORE_CODES.includes(code)) {
    logger.warn(`Permanent error in ${context}`, {
      code,
      message: message.substring(0, 200),
    });
    return ErrorAction.SKIP;
  }

  // Check for timeout errors
  if (
    code === "deadline-exceeded" ||
    message.toLowerCase().includes("timeout") ||
    message.toLowerCase().includes("timed out")
  ) {
    logger.warn(`Timeout error in ${context}`, {
      message: message.substring(0, 200),
    });
    return ErrorAction.RETRY;
  }

  // Check for network errors
  if (
    code === "unavailable" ||
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("connection") ||
    message.toLowerCase().includes("econnrefused")
  ) {
    logger.warn(`Network error in ${context}`, {
      message: message.substring(0, 200),
    });
    return ErrorAction.RETRY;
  }

  // Default to CONTINUE for unknown errors (non-critical)
  logger.warn(`Unknown error in ${context} - continuing`, {
    code,
    message: message.substring(0, 200),
  });
  return ErrorAction.CONTINUE;
}

/**
 * Handle error based on classification
 *
 * @param {unknown} error - Error to handle
 * @param {string} context - Context for logging
 * @throws {Error} If error should be retried
 */
export function handleClassifiedError(error: unknown, context: string): void {
  const action = classifyError(error, context);

  switch (action) {
  case ErrorAction.RETRY:
    // Re-throw to trigger Pub/Sub retry
    throw error;

  case ErrorAction.SKIP:
    // Log and return (don't retry)
    logger.warn(`Skipping due to permanent error in ${context}`, {error});
    return;

  case ErrorAction.CONTINUE:
    // Log and continue (non-critical)
    logger.warn(`Continuing despite error in ${context}`, {error});
    return;
  }
}

/**
 * Execute operation with error classification
 *
 * @param {Function} operation - Async operation to execute
 * @param {string} context - Context for error logging
 * @param {ErrorAction} defaultAction - Default action if operation fails
 * @return {Promise<T | null>} Operation result or null on error
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  defaultAction: ErrorAction = ErrorAction.CONTINUE
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const action = classifyError(error, context);

    // Override with default action if specified
    const finalAction = action === ErrorAction.CONTINUE ? defaultAction : action;

    if (finalAction === ErrorAction.RETRY) {
      throw error;
    }

    logger.warn(`Operation failed in ${context}`, {
      error,
      action: finalAction,
    });

    return null;
  }
}
