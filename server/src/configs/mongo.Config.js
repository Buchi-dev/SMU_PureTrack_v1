const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { MONGO_POOL } = require('../utils/constants');
const gridFSService = require('../utils/gridfs.service');

/**
 * Connect to MongoDB database with optimized connection pooling
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const options = {
      // Connection pool configuration
      minPoolSize: MONGO_POOL.MIN_POOL_SIZE,
      maxPoolSize: MONGO_POOL.MAX_POOL_SIZE,
      serverSelectionTimeoutMS: MONGO_POOL.SERVER_SELECTION_TIMEOUT,
      socketTimeoutMS: MONGO_POOL.SOCKET_TIMEOUT,
      
      // Recommended options for MongoDB Atlas
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      
      // Auto-reconnection (important for production stability)
      autoIndex: false, // Don't build indexes in production
      maxIdleTimeMS: 300000, // Close idle connections after 5 minutes
      
      // Additional stability options for cloud MongoDB
      connectTimeoutMS: 30000, // 30 seconds to establish initial connection
      heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
      maxConnecting: 2, // Limit concurrent connection attempts
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      logger.info(`[OK] MongoDB Connected: ${conn.connection.name}`);
    } else {
      logger.info(`[OK] MongoDB Connected: ${conn.connection.host}`);
      logger.info(`   Database: ${conn.connection.name}`);
      logger.info(`   Pool Size: ${MONGO_POOL.MIN_POOL_SIZE}-${MONGO_POOL.MAX_POOL_SIZE}`);
    }

    // Connection event handlers with auto-reconnect
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Auto-reconnection will be attempted...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });
    
    mongoose.connection.on('reconnectFailed', () => {
      logger.error('MongoDB reconnection failed after all attempts');
    });

    // Initialize GridFS service after connection
    gridFSService.initialize();

  } catch (error) {
    logger.error(`[ERROR] MongoDB Connection Error: ${error.message}`);
    // Don't exit process in production - allow retry
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

/**
 * Close MongoDB connection gracefully
 * @returns {Promise<void>}
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', { error: error.message });
  }
};

/**
 * Check MongoDB connection health
 * @returns {Promise<boolean>}
 */
const checkDBHealth = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    logger.error('MongoDB health check failed:', { error: error.message });
    return false;
  }
};

module.exports = { connectDB, closeDB };
