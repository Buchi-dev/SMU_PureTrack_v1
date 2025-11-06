/**
 * Error Handling Utilities
 * Standardized error handling patterns for Firebase Functions
 *
 * @module utils/ErrorHandlers
 */

import { HttpsError } from "firebase-functions/v2/https";

/**
 * Handles operation errors with consistent logging and error transformation
 *
 * This utility provides a standardized way to handle errors in Firebase Callable Functions.
 * It logs the error with context, re-throws HttpsErrors as-is, and wraps other errors
 * in appropriate HttpsError instances.
 *
 * @param {unknown} error - The error that was caught
 * @param {string} context - Description of what operation failed (e.g., "updating user status")
 * @param {string} fallbackError - Error message to use if not an HttpsError
 * @throws {HttpsError} Always throws an HttpsError
 *
 * @example
 * try {
 *   await db.collection('users').doc(userId).update(data);
 * } catch (error) {
 *   handleOperationError(error, "updating user", USER_MANAGEMENT_ERRORS.UPDATE_FAILED);
 * }
 */
export function handleOperationError(
  error: unknown,
  context: string,
  fallbackError: string
): never {
  console.error(`Error ${context}:`, error);

  // Re-throw HttpsErrors as-is (already properly formatted)
  if (error instanceof HttpsError) {
    throw error;
  }

  // Wrap other errors in internal HttpsError
  throw new HttpsError("internal", fallbackError);
}

/**
 * Handles async operation errors with automatic error handling
 *
 * This is a higher-order function that wraps async operations with
 * automatic error handling using handleOperationError.
 *
 * @template T - Return type of the async operation
 * @param {() => Promise<T>} operation - The async operation to execute
 * @param {string} context - Description of the operation
 * @param {string} fallbackError - Error message for non-HttpsErrors
 * @return {Promise<T>} Result of the operation
 *
 * @example
 * const result = await withErrorHandling(
 *   async () => db.collection('users').doc(userId).get(),
 *   "fetching user",
 *   USER_MANAGEMENT_ERRORS.USER_NOT_FOUND
 * );
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackError: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleOperationError(error, context, fallbackError);
  }
}
