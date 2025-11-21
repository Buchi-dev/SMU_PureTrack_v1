require('dotenv').config();

// Validate environment variables FIRST
const { validateEnv, validateEnvironmentSettings, getEnvironmentSummary } = require('./utils/env.validator');
validateEnv();
validateEnvironmentSettings();

const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import configurations
const { connectDB, closeDB } = require('./configs/mongo.Config');
const { connectRedis, getRedisClient, closeRedis } = require('./configs/redis.Config');
const configurePassport = require('./configs/passport.Config');
const { setupSwagger } = require('./configs/swagger.config');

// Import utilities
const logger = require('./utils/logger');
const { initializeEmailQueue, closeEmailQueue } = require('./utils/email.queue');
const { API_VERSION, SESSION } = require('./utils/constants');

// Import middleware
const { addCorrelationId, addUserContext } = require('./middleware/correlation.middleware');
const { apiLimiter } = require('./middleware/rate-limit.middleware');

// Import background jobs
const { startBackgroundJobs, stopBackgroundJobs } = require('./jobs/backgroundJobs');

// Import routes
const healthRoutes = require('./health/health.Routes');
const authRoutes = require('./auth/auth.Routes');
const userRoutes = require('./users/user.Routes');
const alertRoutes = require('./alerts/alert.Routes');
const deviceRoutes = require('./devices/device.Routes');
const reportRoutes = require('./reports/report.Routes');
const analyticsRoutes = require('./analytics/analytics.Routes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Configure Passport
configurePassport();

// Store Redis client at module level
let redisClient;

// ============================================
// SECURITY & PERFORMANCE MIDDLEWARE
// ============================================

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Swagger UI
  crossOriginEmbedderPolicy: false,
}));

// Response compression
app.use(compression());

// Correlation ID tracking
app.use(addCorrelationId);

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // Allow cookies to be sent
  })
);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ============================================
// ASYNC INITIALIZATION FUNCTION
// ============================================

async function initializeApp() {
  // Connect to Redis (optional but recommended for production)
  redisClient = await connectRedis();
  
  // Initialize email queue if Redis is available
  if (redisClient) {
    initializeEmailQueue(process.env.REDIS_URL);
  }

  // ============================================
  // SESSION CONFIGURATION
  // ============================================

  const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: SESSION.MAX_AGE,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  };

  // Use Redis session store if available
  if (redisClient) {
    sessionConfig.store = new RedisStore({
      client: redisClient,
      prefix: 'sess:',
    });
    logger.info('[OK] Using Redis session store');
  } else {
    logger.warn('[WARNING] Using memory session store (not recommended for production)');
  }

  app.use(session(sessionConfig));

  // Initialize Passport and session handling
  app.use(passport.initialize());
  app.use(passport.session());

  // Add user context for logging
  app.use(addUserContext);

  // ============================================
  // API DOCUMENTATION
  // ============================================

  setupSwagger(app);

  // ============================================
  // ROUTES
  // ============================================

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Water Quality Monitoring API Server',
      version: '1.0.0',
      apiVersion: API_VERSION.CURRENT,
      documentation: '/api-docs',
      health: '/health',
      authenticated: req.isAuthenticated(),
    });
  });

  // Health check routes (no rate limiting)
  app.use('/health', healthRoutes);

  // Apply rate limiting to all API routes
  app.use('/api', apiLimiter);
  app.use('/auth', apiLimiter);

  // API Routes with versioning
  app.use('/auth', authRoutes);
  app.use(`${API_VERSION.PREFIX}/users`, userRoutes);
  app.use(`${API_VERSION.PREFIX}/alerts`, alertRoutes);
  app.use(`${API_VERSION.PREFIX}/devices`, deviceRoutes);
  app.use(`${API_VERSION.PREFIX}/reports`, reportRoutes);
  app.use(`${API_VERSION.PREFIX}/analytics`, analyticsRoutes);

  // ============================================
  // ERROR HANDLING
  // ============================================

  // 404 Handler
  app.use((req, res) => {
    logger.warn('Route not found', {
      method: req.method,
      path: req.path,
      correlationId: req.correlationId,
    });
    
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.path,
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    logger.error('Server error:', {
      error: err.message,
      stack: err.stack,
      correlationId: req.correlationId,
      path: req.path,
      method: req.method,
    });
    
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
      correlationId: req.correlationId,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  return redisClient;
}

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 5000;
let server;

// Initialize app asynchronously then start server
initializeApp().then(() => {
  server = app.listen(PORT, () => {
    const envSummary = getEnvironmentSummary();
    
    logger.info('\n[STARTUP] ========================================');
    logger.info(`   Water Quality Monitoring API Server`);
    logger.info('========================================\n');
    logger.info(`   Port:        ${PORT}`);
    logger.info(`   Environment: ${envSummary.nodeEnv}`);
    logger.info(`   API Version: ${API_VERSION.CURRENT}`);
    logger.info(`   Client URL:  ${process.env.CLIENT_URL}`);
    logger.info('');
    logger.info('[SERVICES] Status:');
    logger.info(`   MongoDB:     ${envSummary.mongoConfigured ? '[OK]' : '[FAIL]'}`);
    logger.info(`   Redis:       ${envSummary.redisConfigured ? '[OK]' : '[WARN] Not configured'}`);
    logger.info(`   SMTP:        ${envSummary.smtpConfigured ? '[OK]' : '[WARN] Not configured'}`);
    logger.info(`   OAuth:       ${envSummary.oauthConfigured ? '[OK]' : '[FAIL]'}`);
    logger.info(`   API Key:     ${envSummary.apiKeyConfigured ? '[OK]' : '[FAIL]'}`);
    logger.info('');
    logger.info('[DOCS] Documentation: http://localhost:' + PORT + '/api-docs');
    logger.info('[HEALTH] Health Check:  http://localhost:' + PORT + '/health');
    logger.info('========================================\n');
    
    // Start background jobs
    startBackgroundJobs();
  });
}).catch((error) => {
  logger.error('Failed to initialize application:', { error: error.message });
  process.exit(1);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: starting graceful shutdown`);
  
  try {
    // Stop accepting new requests
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Stop background jobs
    stopBackgroundJobs();

    // Close email queue
    await closeEmailQueue();

    // Close Redis connection
    await closeRedis();

    // Close MongoDB connection
    await closeDB();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', { error: error.message });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason,
    promise,
  });
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;
