/**
 * Firebase Retry Utility
 * 
 * Implements exponential backoff retry logic for Firebase operations
 * Handles transient network failures and rate limiting
 * 
 * @module utils/firebaseRetry
 */

import type { HttpsCallable, HttpsCallableResult } from 'firebase/functions';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000,    // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
    'internal',
    'network-request-failed',
    'timeout',
  ],
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;
  
  const errorCode = error.code?.toLowerCase() || '';
  const errorMessage = error.message?.toLowerCase() || '';
  
  return retryableErrors.some(
    (retryableCode) =>
      errorCode.includes(retryableCode) || errorMessage.includes(retryableCode)
  );
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  // Exponential backoff: delay = initialDelay * (multiplier ^ attempt)
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt);
  
  // Add jitter (randomness) to prevent thundering herd
  const jitter = Math.random() * 0.3 * exponentialDelay;
  
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a Firebase Callable Function with exponential backoff
 * 
 * @template TRequest - Request data type
 * @template TResponse - Response data type
 * @param callable - Firebase callable function reference
 * @param data - Request data
 * @param options - Retry configuration options
 * @returns Promise resolving to function response data
 * 
 * @example
 * ```typescript
 * const listDevices = httpsCallable(functions, 'deviceManagement');
 * const devices = await callFunctionWithRetry(listDevices, { action: 'list' }, {
 *   maxRetries: 3,
 *   initialDelay: 1000,
 * });
 * ```
 */
export async function callFunctionWithRetry<TRequest = any, TResponse = any>(
  callable: HttpsCallable<TRequest, TResponse>,
  data: TRequest,
  options: RetryOptions = {}
): Promise<TResponse> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      const result: HttpsCallableResult<TResponse> = await callable(data);
      return result.data;
    } catch (error: any) {
      lastError = error;

      // Log retry attempt
      console.warn(
        `Firebase function call failed (attempt ${attempt + 1}/${config.maxRetries}):`,
        error.message
      );

      // Check if error is retryable
      if (!isRetryableError(error, config.retryableErrors)) {
        console.error('Non-retryable error:', error);
        throw error;
      }

      // Don't sleep on last attempt
      if (attempt < config.maxRetries - 1) {
        const delay = calculateDelay(
          attempt,
          config.initialDelay,
          config.maxDelay,
          config.backoffMultiplier
        );
        
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  console.error(`Firebase function call failed after ${config.maxRetries} attempts`);
  throw new Error(
    `Max retries (${config.maxRetries}) exceeded. Last error: ${lastError!.message}`
  );
}

/**
 * Retry a Firestore operation with exponential backoff
 * 
 * @template T - Operation return type
 * @param operation - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to operation result
 * 
 * @example
 * ```typescript
 * const user = await retryOperation(
 *   async () => {
 *     const docRef = doc(db, 'users', userId);
 *     const docSnap = await getDoc(docRef);
 *     return docSnap.data();
 *   },
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      console.warn(
        `Operation failed (attempt ${attempt + 1}/${config.maxRetries}):`,
        error.message
      );

      if (!isRetryableError(error, config.retryableErrors)) {
        console.error('Non-retryable error:', error);
        throw error;
      }

      if (attempt < config.maxRetries - 1) {
        const delay = calculateDelay(
          attempt,
          config.initialDelay,
          config.maxDelay,
          config.backoffMultiplier
        );
        
        console.log(`Retrying operation in ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Max retries (${config.maxRetries}) exceeded. Last error: ${lastError!.message}`
  );
}

/**
 * Create a retry wrapper for a Firebase Callable Function
 * Returns a new function with built-in retry logic
 * 
 * @template TRequest - Request data type
 * @template TResponse - Response data type
 * @param callable - Firebase callable function reference
 * @param options - Retry configuration options
 * @returns Wrapped function with retry logic
 * 
 * @example
 * ```typescript
 * const listDevicesWithRetry = withRetry(
 *   httpsCallable(functions, 'deviceManagement'),
 *   { maxRetries: 3 }
 * );
 * 
 * const devices = await listDevicesWithRetry({ action: 'list' });
 * ```
 */
export function withRetry<TRequest = any, TResponse = any>(
  callable: HttpsCallable<TRequest, TResponse>,
  options: RetryOptions = {}
): (data: TRequest) => Promise<TResponse> {
  return async (data: TRequest): Promise<TResponse> => {
    return callFunctionWithRetry(callable, data, options);
  };
}

/**
 * Batch retry utility for multiple operations
 * Retries failed operations while preserving successful ones
 * 
 * @template T - Operation result type
 * @param operations - Array of async operations
 * @param options - Retry configuration options
 * @returns Promise resolving to array of results (or errors)
 * 
 * @example
 * ```typescript
 * const results = await batchRetryOperations([
 *   () => getDoc(doc(db, 'devices', 'device1')),
 *   () => getDoc(doc(db, 'devices', 'device2')),
 *   () => getDoc(doc(db, 'devices', 'device3')),
 * ], { maxRetries: 2 });
 * ```
 */
export async function batchRetryOperations<T>(
  operations: (() => Promise<T>)[],
  options: RetryOptions = {}
): Promise<Array<T | Error>> {
  const results = await Promise.allSettled(
    operations.map((op) => retryOperation(op, options))
  );

  return results.map((result) =>
    result.status === 'fulfilled' ? result.value : result.reason
  );
}

export default {
  callFunctionWithRetry,
  retryOperation,
  withRetry,
  batchRetryOperations,
};
