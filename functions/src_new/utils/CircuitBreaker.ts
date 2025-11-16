/**
 * Circuit Breaker Utility
 * Implements circuit breaker pattern for fault tolerance
 *
 * @module utils/CircuitBreaker
 *
 * Purpose: Prevent cascading failures by failing fast when
 * downstream services are unavailable
 */

import {logger} from "firebase-functions/v2";

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Failing fast, not attempting calls
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Timeout for operations in milliseconds */
  timeout: number;

  /** Failure threshold percentage to open circuit (0-100) */
  failureThreshold: number;

  /** Minimum number of calls before opening circuit */
  minimumCalls: number;

  /** Time to wait before attempting recovery (milliseconds) */
  resetTimeout: number;

  /** Number of test calls in half-open state */
  halfOpenCalls: number;
}

/**
 * Circuit breaker statistics
 */
interface CircuitStats {
  successCount: number;
  failureCount: number;
  lastFailureTime: number | null;
  stateChangedAt: number;
}

/**
 * Circuit Breaker implementation
 *
 * Protects against cascading failures by:
 * 1. Monitoring failure rate
 * 2. Opening circuit when threshold exceeded
 * 3. Attempting recovery after timeout
 * 4. Failing fast when circuit is open
 */
export class CircuitBreaker<TArgs extends unknown[], TResult> {
  private state: CircuitState = CircuitState.CLOSED;
  private stats: CircuitStats = {
    successCount: 0,
    failureCount: 0,
    lastFailureTime: null,
    stateChangedAt: Date.now(),
  };
  private halfOpenTestCount = 0;

  /**
   * Create a circuit breaker
   *
   * @param {Function} fn - Function to protect with circuit breaker
   * @param {CircuitBreakerConfig} config - Circuit breaker configuration
   * @param {string} name - Name for logging
   */
  constructor(
    private readonly fn: (...args: TArgs) => Promise<TResult>,
    private readonly config: CircuitBreakerConfig,
    private readonly name: string = "CircuitBreaker"
  ) {}

  /**
   * Execute function with circuit breaker protection
   *
   * @param {TArgs} args - Function arguments
   * @return {Promise<TResult>} Function result
   * @throws {Error} If circuit is open or operation times out
   */
  async execute(...args: TArgs): Promise<TResult> {
    // Check if circuit should transition to half-open
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.transitionToHalfOpen();
    }

    // Fail fast if circuit is open
    if (this.state === CircuitState.OPEN) {
      throw new Error(`${this.name}: Circuit is OPEN - failing fast`);
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(args);

      // Record success
      this.onSuccess();

      return result;
    } catch (error) {
      // Record failure
      this.onFailure();

      throw error;
    }
  }

  /**
   * Execute function with timeout
   *
   * @param {TArgs} args - Function arguments
   * @return {Promise<TResult>} Function result
   * @throws {Error} If operation times out
   */
  private async executeWithTimeout(args: TArgs): Promise<TResult> {
    return Promise.race([
      this.fn(...args),
      new Promise<TResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${this.name}: Operation timeout (${this.config.timeout}ms)`)),
          this.config.timeout
        )
      ),
    ]);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.stats.successCount++;

    // If in half-open state, transition to closed after successful test calls
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenTestCount++;

      if (this.halfOpenTestCount >= this.config.halfOpenCalls) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.stats.failureCount++;
    this.stats.lastFailureTime = Date.now();

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.transitionToOpen();
    }
  }

  /**
   * Check if circuit should open based on failure rate
   *
   * @return {boolean} True if circuit should open
   */
  private shouldOpenCircuit(): boolean {
    const totalCalls = this.stats.successCount + this.stats.failureCount;

    // Need minimum calls before opening
    if (totalCalls < this.config.minimumCalls) {
      return false;
    }

    const failureRate = (this.stats.failureCount / totalCalls) * 100;

    return failureRate >= this.config.failureThreshold;
  }

  /**
   * Check if circuit should attempt reset to half-open
   *
   * @return {boolean} True if reset should be attempted
   */
  private shouldAttemptReset(): boolean {
    if (!this.stats.lastFailureTime) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.stats.lastFailureTime;

    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    logger.info(`${this.name}: Circuit transitioning to CLOSED`);

    this.state = CircuitState.CLOSED;
    this.stats = {
      successCount: 0,
      failureCount: 0,
      lastFailureTime: null,
      stateChangedAt: Date.now(),
    };
    this.halfOpenTestCount = 0;
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    logger.warn(`${this.name}: Circuit transitioning to OPEN`, {
      successCount: this.stats.successCount,
      failureCount: this.stats.failureCount,
      failureRate: this.getFailureRate(),
    });

    this.state = CircuitState.OPEN;
    this.stats.stateChangedAt = Date.now();
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    logger.info(`${this.name}: Circuit transitioning to HALF_OPEN (testing recovery)`);

    this.state = CircuitState.HALF_OPEN;
    this.halfOpenTestCount = 0;
    this.stats = {
      successCount: 0,
      failureCount: 0,
      lastFailureTime: null,
      stateChangedAt: Date.now(),
    };
  }

  /**
   * Get current failure rate
   *
   * @return {number} Failure rate percentage (0-100)
   */
  private getFailureRate(): number {
    const totalCalls = this.stats.successCount + this.stats.failureCount;

    if (totalCalls === 0) {
      return 0;
    }

    return (this.stats.failureCount / totalCalls) * 100;
  }

  /**
   * Get circuit breaker state
   *
   * @return {CircuitState} Current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   *
   * @return {object} Statistics object
   */
  getStats(): {
    state: CircuitState;
    successCount: number;
    failureCount: number;
    failureRate: number;
    lastFailureTime: number | null;
    stateChangedAt: number;
    halfOpenTestCount: number;
    } {
    return {
      state: this.state,
      successCount: this.stats.successCount,
      failureCount: this.stats.failureCount,
      failureRate: this.getFailureRate(),
      lastFailureTime: this.stats.lastFailureTime,
      stateChangedAt: this.stats.stateChangedAt,
      halfOpenTestCount: this.halfOpenTestCount,
    };
  }

  /**
   * Force circuit to open (for testing/manual intervention)
   */
  forceOpen(): void {
    this.transitionToOpen();
  }

  /**
   * Force circuit to close (for testing/manual intervention)
   */
  forceClose(): void {
    this.transitionToClosed();
  }
}

/**
 * Create a circuit breaker with default configuration
 *
 * @param {Function} fn - Function to protect
 * @param {string} name - Circuit breaker name for logging
 * @return {CircuitBreaker} Circuit breaker instance
 */
export function createCircuitBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  name: string = "Default"
): CircuitBreaker<TArgs, TResult> {
  return new CircuitBreaker(fn, {
    timeout: 5000, // 5 second timeout
    failureThreshold: 50, // Open at 50% failure rate
    minimumCalls: 5, // Need 5 calls before opening
    resetTimeout: 30000, // Try recovery after 30 seconds
    halfOpenCalls: 3, // 3 successful test calls to close
  }, name);
}
