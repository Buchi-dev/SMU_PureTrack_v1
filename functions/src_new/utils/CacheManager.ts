/**
 * Cache Manager Utility
 * Implements size-limited TTL cache for serverless environments
 *
 * @module utils/CacheManager
 *
 * Purpose: Prevent memory leaks in Cloud Functions by implementing
 * automatic cache cleanup and size limits
 */

/**
 * Cache entry with timestamp for TTL tracking
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * Size-limited TTL cache safe for serverless environments
 *
 * Features:
 * - Automatic TTL-based expiration
 * - Size-limited to prevent memory leaks
 * - LRU-style cleanup when size limit reached
 * - Thread-safe operations
 */
export class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  /**
   * Create a new cache manager
   *
   * @param {number} ttlMs - Time to live in milliseconds
   * @param {number} maxSize - Maximum number of entries
   */
  constructor(ttlMs: number, maxSize: number = 10000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  /**
   * Set a value in the cache
   *
   * @param {string} key - Cache key
   * @param {T} value - Value to store
   */
  set(key: string, value: T): void {
    // Clean expired entries before adding new one
    this.cleanExpired();

    // If at max size, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      this.removeOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Get a value from the cache
   *
   * @param {string} key - Cache key
   * @return {T | undefined} Cached value or undefined if expired/not found
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   *
   * @param {string} key - Cache key
   * @return {boolean} True if key exists and not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a specific key
   *
   * @param {string} key - Cache key to delete
   * @return {boolean} True if key was deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   *
   * @return {number} Number of entries in cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries from cache
   * Called automatically before insertions
   *
   * @return {number} Number of entries removed
   */
  private cleanExpired(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Remove oldest entry (LRU-style eviction)
   * Called when cache reaches max size
   */
  private removeOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics for monitoring
   *
   * @return {object} Cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    } {
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const entry of this.cache.values()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      oldestEntry: oldestTimestamp === Infinity ? null : oldestTimestamp,
      newestEntry: newestTimestamp === 0 ? null : newestTimestamp,
    };
  }
}
