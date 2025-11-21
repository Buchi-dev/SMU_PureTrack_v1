const redis = require('redis');
const logger = require('../utils/logger');

/**
 * Redis Configuration and Client Setup
 * Provides caching and session storage capabilities
 */

let redisClient = null;

/**
 * Connect to Redis server
 * @returns {Promise<RedisClient>}
 */
const connectRedis = async () => {
  // Check if Redis is configured
  if (!process.env.REDIS_URL) {
    logger.warn('Redis URL not configured. Caching and Redis sessions disabled.');
    return null;
  }

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection limit reached');
          }
          // Exponential backoff: 50ms * 2^retries
          return Math.min(retries * 50, 3000);
        },
      },
    });

    // Error handling
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', { error: err.message });
    });

    const isProduction = process.env.NODE_ENV === 'production';

    redisClient.on('connect', () => {
      if (!isProduction) {
        logger.info('Redis client connecting...');
      }
    });

    redisClient.on('ready', () => {
      if (isProduction) {
        logger.info('[OK] Redis connected');
      } else {
        logger.info('[OK] Redis client ready');
      }
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection closed');
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', { error: error.message });
    redisClient = null;
    return null;
  }
};

/**
 * Get Redis client instance
 * @returns {RedisClient|null}
 */
const getRedisClient = () => {
  return redisClient;
};

/**
 * Check if Redis is available
 * @returns {boolean}
 */
const isRedisAvailable = () => {
  return redisClient !== null && redisClient.isReady;
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', { error: error.message });
    }
  }
};

/**
 * Ping Redis to check connection
 * @returns {Promise<boolean>}
 */
const pingRedis = async () => {
  if (!isRedisAvailable()) {
    return false;
  }

  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Redis ping failed:', { error: error.message });
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisAvailable,
  closeRedis,
  pingRedis,
};
