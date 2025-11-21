const { getRedisClient, isRedisAvailable } = require('../configs/redis.Config');
const logger = require('./logger');
const { CACHE_TTL } = require('./constants');

/**
 * Cache Service
 * Provides caching functionality with Redis
 * Falls back to no-cache if Redis is unavailable
 */

class CacheService {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>}
   */
  static async get(key) {
    if (!isRedisAvailable()) {
      return null;
    }

    try {
      const client = getRedisClient();
      const value = await client.get(key);
      
      if (value) {
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(value);
      }
      
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default from constants)
   * @returns {Promise<boolean>}
   */
  static async set(key, value, ttl = CACHE_TTL.DEVICES) {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await client.setEx(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }
      
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  static async del(key) {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      await client.del(key);
      logger.debug(`Cache DELETE: ${key}`);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'devices:*')
   * @returns {Promise<number>} Number of keys deleted
   */
  static async delPattern(pattern) {
    if (!isRedisAvailable()) {
      return 0;
    }

    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      await client.del(keys);
      logger.debug(`Cache DELETE PATTERN: ${pattern} (${keys.length} keys)`);
      return keys.length;
    } catch (error) {
      logger.error('Cache delete pattern error:', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  static async exists(key) {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Extend TTL of existing key
   * @param {string} key - Cache key
   * @param {number} ttl - New TTL in seconds
   * @returns {Promise<boolean>}
   */
  static async expire(key, ttl) {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      await client.expire(key, ttl);
      logger.debug(`Cache EXPIRE: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error('Cache expire error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Increment a counter
   * @param {string} key - Cache key
   * @returns {Promise<number>} New value
   */
  static async incr(key) {
    if (!isRedisAvailable()) {
      return 0;
    }

    try {
      const client = getRedisClient();
      const value = await client.incr(key);
      logger.debug(`Cache INCR: ${key} = ${value}`);
      return value;
    } catch (error) {
      logger.error('Cache incr error:', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>}
   */
  static async flushAll() {
    if (!isRedisAvailable()) {
      return false;
    }

    try {
      const client = getRedisClient();
      await client.flushAll();
      logger.warn('Cache FLUSH ALL');
      return true;
    } catch (error) {
      logger.error('Cache flush all error:', { error: error.message });
      return false;
    }
  }

  /**
   * Cache decorator for functions
   * @param {string} keyPrefix - Prefix for cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Function} Decorator function
   */
  static cacheable(keyPrefix, ttl = CACHE_TTL.DEVICES) {
    return function (target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args) {
        // Generate cache key from function arguments
        const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;

        // Try to get from cache
        const cached = await CacheService.get(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Store in cache
        await CacheService.set(cacheKey, result, ttl);

        return result;
      };

      return descriptor;
    };
  }
}

module.exports = CacheService;
