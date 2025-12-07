import './moduleAlias';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { appConfig, dbConnection, initializeFirebase } from '@core/configs';
import { errorHandler, requestLogger } from '@core/middlewares';
import { NotFoundError } from '@utils/errors.util';
import { mqttService, emailService, gridfsService, initializeLogger, logInfo, logError, websocketService } from '@utils';
import { startPresenceChecker, startReportCleanupJob, stopReportCleanupJob, startPermanentDeletionJob, stopPermanentDeletionJob, startBackupJobs, stopBackupJobs } from '@feature/jobs';

// Import entity routes
import { authRoutes } from '@feature/auth';
import { alertRoutes } from '@feature/alerts';
import { userRoutes } from '@feature/users';
import { deviceRoutes } from '@feature/devices';
import { sensorReadingRoutes } from '@feature/sensorReadings';
import { reportRoutes } from '@feature/reports';
import { analyticsRoutes } from '@feature/analytics';
import { healthRoutes } from '@feature/health';
import { backupRoutes } from '@feature/backups';

// Initialize Express app
const app: Application = express();

// Security middleware
app.use(helmet());

// Middleware
app.use(cors(appConfig.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: dbConnection.getConnectionStatus() ? 'connected' : 'disconnected',
  });
});

// API info route
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Water Quality Monitoring API v2',
    version: '2.0.0',
    environment: appConfig.server.nodeEnv,
  });
});

// API v1 routes
const API_V1 = '/api/v1';

// Auth routes (no /api/v1 prefix)
app.use('/auth', authRoutes);

// API routes
app.use(`${API_V1}/alerts`, alertRoutes);
app.use(`${API_V1}/users`, userRoutes);
app.use(`${API_V1}/devices`, deviceRoutes);
app.use(`${API_V1}/sensor-readings`, sensorReadingRoutes);
app.use(`${API_V1}/reports`, reportRoutes);
app.use(`${API_V1}/analytics`, analyticsRoutes);
app.use(`${API_V1}/health`, healthRoutes);
app.use(`${API_V1}/backups`, backupRoutes);

// 404 handler - Must be after all routes
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError('The requested resource does not exist'));
});

// Global error handler - Must be last
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Initialize Winston logger
    initializeLogger();

    // Initialize Firebase Admin SDK
    initializeFirebase();

    // Connect to database
    await dbConnection.connect();

    // Initialize GridFS
    await gridfsService.initialize();

    // Initialize Email Service
    await emailService.initialize();

    // Connect to MQTT broker
    await mqttService.connect();

    // Start background jobs
    startPresenceChecker(); // Send "who_is_online" query every minute (ping-pong) - ONLY status detection method
    startReportCleanupJob();
    startPermanentDeletionJob();
    startBackupJobs(); // Start all backup jobs (daily, weekly, monthly)

    // Start listening
    const server = app.listen(appConfig.server.port, () => {
      logInfo('='.repeat(50));
      logInfo(`🚀 Server is running on port ${appConfig.server.port}`);
      logInfo(`📊 Environment: ${appConfig.server.nodeEnv}`);
      logInfo(`🔗 API Version: ${appConfig.server.apiVersion}`);
      logInfo(`🌐 CORS Origin: ${appConfig.cors.origin}`);
      logInfo('='.repeat(50));
    });

    // Initialize WebSocket server
    websocketService.initialize(server);
    logInfo('✅ WebSocket server initialized');
  } catch (error) {
    logError('❌ Failed to start server', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('⚠️  SIGTERM received, shutting down gracefully...');
  
  // Stop background jobs
  stopReportCleanupJob();
  stopPermanentDeletionJob();
  stopBackupJobs();
  
  // Disconnect services
  await websocketService.shutdown();
  await mqttService.disconnect();
  await emailService.close();
  await dbConnection.disconnect();
  
  logInfo('✅ Graceful shutdown complete');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logInfo('⚠️  SIGINT received, shutting down gracefully...');
  
  // Stop background jobs
  stopReportCleanupJob();
  stopPermanentDeletionJob();
  stopBackupJobs();
  
  // Disconnect services
  await websocketService.shutdown();
  await mqttService.disconnect();
  await emailService.close();
  await dbConnection.disconnect();
  
  logInfo('✅ Graceful shutdown complete');
  process.exit(0);
});

// Start the application
startServer();

export default app;
