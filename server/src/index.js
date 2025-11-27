require('dotenv').config();

// Validate environment variables FIRST
const { validateEnv, validateEnvironmentSettings, getEnvironmentSummary } = require('./utils/env.validator');
validateEnv();
validateEnvironmentSettings();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import configurations
const { connectDB, closeDB } = require('./configs/mongo.Config');
const { connectRedis, closeRedis } = require('./configs/redis.Config');
const { configureFirebase } = require('./configs/firebase.Config');
const { setupSwagger } = require('./configs/swagger.config');

// Import utilities
const logger = require('./utils/logger');
const { initializeEmailQueue, closeEmailQueue } = require('./utils/email.queue');
const { API_VERSION } = require('./utils/constants');
const { setupSocketIO } = require('./utils/socketConfig');
const { initializeChangeStreams, closeChangeStreams } = require('./utils/changeStreams');
const { errorHandler, notFoundHandler } = require('./errors/errorHandler');
const { getSupportedVersions } = require('./middleware/apiVersion.middleware');

// Import middleware
const { addCorrelationId, addUserContext } = require('./middleware/correlation.middleware');

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

// Configure Firebase Admin SDK
configureFirebase();

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
const allowedOrigins = [
  'https://smupuretrack.web.app',
  'https://smupuretrack.firebaseapp.com',
  'http://localhost:5173',
  process.env.CLIENT_URL || 'http://localhost:5173'
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies to be sent
  })
);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (for proper IP detection behind reverse proxy)
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

  // Add user context for logging (Firebase token-based)
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
      authenticated: !!req.user,
    });
  });

  // API versions endpoint
  app.get('/api/versions', (req, res) => {
    res.json({
      success: true,
      versions: getSupportedVersions(),
      current: API_VERSION.CURRENT,
    });
  });

  // Health check routes
  app.use('/health', healthRoutes);

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

  // 404 Handler - Must be after all routes
  app.use(notFoundHandler);

  // Global error handler - Must be last
  app.use(errorHandler);

  return redisClient;
}

// ============================================
// SERVER STARTUP WITH SOCKET.IO
// ============================================

const PORT = process.env.PORT || 5000;
let server;
let io;

// Initialize app asynchronously then start server
initializeApp().then(() => {
  // Create HTTP server
  server = http.createServer(app);
  
  // Setup Socket.IO
  io = setupSocketIO(server);
  
  // Start server
  server.listen(PORT, () => {
    const envSummary = getEnvironmentSummary();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Condensed production startup log
      logger.info('========================================');
      logger.info('Water Quality Monitoring API - PRODUCTION');
      logger.info('========================================');
      logger.info(`Port: ${PORT} | Environment: ${envSummary.nodeEnv} | API: ${API_VERSION.CURRENT}`);
      logger.info(`Services: MongoDB ✓ | Redis ✓ | SMTP ✓ | Firebase ✓ | Socket.IO ✓`);
      logger.info(`Health: http://localhost:${PORT}/health`);
      logger.info('========================================');
    } else {
      // Detailed development startup log
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
      logger.info(`   Firebase:    ${envSummary.firebaseConfigured ? '[OK]' : '[FAIL]'}`);
      logger.info(`   API Key:     ${envSummary.apiKeyConfigured ? '[OK]' : '[FAIL]'}`);
      logger.info(`   Socket.IO:   [OK]`);
      logger.info('');
      logger.info('[DOCS] Documentation: http://localhost:' + PORT + '/api-docs');
      logger.info('[HEALTH] Health Check:  http://localhost:' + PORT + '/health');
      logger.info('========================================\n');
    }
    
    // Start background jobs
    startBackgroundJobs();
    
    // Initialize MongoDB Change Streams
    initializeChangeStreams().catch(err => {
      logger.error('[Startup] Failed to initialize change streams:', { error: err.message });
    });
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

    // Close change streams
    await closeChangeStreams();

    // Disconnect all Socket.IO clients
    if (io) {
      io.close(() => {
        logger.info('Socket.IO server closed');
      });
    }

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

// Handle uncaught exceptions and unhandled rejections
const { uncaughtExceptionHandler, unhandledRejectionHandler } = require('./errors/errorHandler');
process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', unhandledRejectionHandler);

module.exports = app;
