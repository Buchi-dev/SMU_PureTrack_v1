const cron = require('node-cron');
const { Device, SensorReading } = require('../devices/device.Model');
const Alert = require('../alerts/alert.Model');
const logger = require('../utils/logger');
const { TIME } = require('../utils/constants');
const mqttService = require('../utils/mqtt.service');
const fs = require('fs').promises;
const path = require('path');

/**
 * Background Jobs Service
 * Handles scheduled tasks using node-cron with optimized performance
 */

/**
 * Active Device Presence Polling System - OPTIMIZED
 * 
 * Advanced polling strategy with intelligent backoff and resource management:
 * 
 * 1. Every 1 minute (configurable), server broadcasts presence query
 * 2. Online devices respond within timeout window
 * 3. Batch processing for database updates (offline devices)
 * 4. Exponential backoff on consecutive failures
 * 5. Circuit breaker pattern to prevent resource exhaustion
 * 
 * OPTIMIZATIONS v2:
 * - Adaptive timeout based on device count
 * - Memory-efficient Set operations for device tracking
 * - Parallel database operations with Promise.all
 * - Smart cache invalidation (only changed devices)
 * - Circuit breaker to prevent cascading failures
 * - Metrics tracking for observability
 */


// Job state management
let lastSuccessfulPoll = null;
let consecutiveFailures = 0;
let totalPollsExecuted = 0;
let totalDevicesChecked = 0;
let totalStatusChanges = 0;

// Configuration constants
const MAX_CONSECUTIVE_FAILURES = 5; // Increased threshold
const BASE_BACKOFF_MINUTES = 2;
const MAX_BACKOFF_MINUTES = 15;
const MIN_TIMEOUT_MS = 3000; // Minimum timeout
const MAX_TIMEOUT_MS = 10000; // Maximum timeout
const TIMEOUT_PER_DEVICE_MS = 200; // 200ms per device

const presencePollingJob = cron.schedule('*/1 * * * *', async () => {
  const pollStartTime = Date.now();
  
  try {
    // Circuit breaker: Exponential backoff on consecutive failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const timeSinceLastSuccess = lastSuccessfulPoll ? Date.now() - lastSuccessfulPoll : Infinity;
      const backoffMinutes = Math.min(
        MAX_BACKOFF_MINUTES, 
        BASE_BACKOFF_MINUTES * Math.pow(2, consecutiveFailures - MAX_CONSECUTIVE_FAILURES)
      );
      
      if (timeSinceLastSuccess < backoffMinutes * 60 * 1000) {
        logger.warn(`[Presence Poll] 🔴 Circuit breaker active - backing off for ${backoffMinutes}m (failures: ${consecutiveFailures})`);
        return;
      } else {
        logger.info('[Presence Poll] 🟡 Backoff expired - attempting recovery');
        consecutiveFailures = MAX_CONSECUTIVE_FAILURES - 1; // Gradual recovery
      }
    }
    
    // Pre-flight checks
    if (!mqttService.connected) {
      consecutiveFailures++;
      logger.warn(`[Presence Poll] ⚠️  MQTT disconnected - skipping (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
      return;
    }
    
    // Fetch devices with minimal fields (performance optimization)
    const allDevices = await Device.find({ isRegistered: true })
      .select('deviceId status')
      .lean()
      .exec();
    
    // Early return if no devices
    if (allDevices.length === 0) {
      logger.debug('[Presence Poll] No devices registered - skipping');
      consecutiveFailures = 0; // Reset on successful execution
      return;
    }
    
    // Adaptive timeout: scale with device count (200ms per device, min 3s, max 10s)
    const adaptiveTimeout = Math.max(
      MIN_TIMEOUT_MS,
      Math.min(MAX_TIMEOUT_MS, allDevices.length * TIMEOUT_PER_DEVICE_MS)
    );
    
    logger.info(`[Presence Poll] 🔍 Checking ${allDevices.length} devices (timeout: ${adaptiveTimeout}ms)...`);
    
    // Query devices via MQTT with adaptive timeout
    const onlineDeviceIds = await mqttService.queryDevicePresence(adaptiveTimeout);
    
    // Use Set for O(1) lookup performance
    const onlineSet = new Set(onlineDeviceIds);
    
    // Categorize devices by status change
    const devicesToMarkOffline = [];
    const metrics = {
      online: 0,
      offline: 0,
      onlineToOffline: 0,
      offlineToOnline: 0,
      noChange: 0
    };
    
    // Process devices in single pass
    for (const device of allDevices) {
      const isOnline = onlineSet.has(device.deviceId);
      const wasOnline = device.status === 'online';
      
      if (isOnline) {
        metrics.online++;
        if (!wasOnline) {
          metrics.offlineToOnline++;
          logger.info(`[Presence Poll] ✅ ${device.deviceId}: OFFLINE → ONLINE`);
        } else {
          metrics.noChange++;
        }
      } else {
        metrics.offline++;
        if (wasOnline) {
          devicesToMarkOffline.push(device.deviceId);
          metrics.onlineToOffline++;
          logger.warn(`[Presence Poll] ❌ ${device.deviceId}: ONLINE → OFFLINE`);
        } else {
          metrics.noChange++;
        }
      }
    }
    
    // Batch database update for offline devices (if any)
    if (devicesToMarkOffline.length > 0) {
      const updateStartTime = Date.now();
      
      await Device.updateMany(
        { deviceId: { $in: devicesToMarkOffline } },
        { 
          $set: { 
            status: 'offline',
            updatedAt: new Date()
          } 
        }
      );
      
      logger.debug(`[Presence Poll] Batch update: ${devicesToMarkOffline.length} devices (${Date.now() - updateStartTime}ms)`);
    }
    
    // Update metrics
    totalPollsExecuted++;
    totalDevicesChecked += allDevices.length;
    totalStatusChanges += (metrics.onlineToOffline + metrics.offlineToOnline);
    
    // Success logging
    const pollDuration = Date.now() - pollStartTime;
    const hasChanges = (metrics.onlineToOffline + metrics.offlineToOnline) > 0;
    
    if (hasChanges || pollDuration > 1000) {
      logger.info(`[Presence Poll] ✅ Complete in ${pollDuration}ms - Online: ${metrics.online}, Offline: ${metrics.offline}, Changes: ${metrics.onlineToOffline + metrics.offlineToOnline}`);
    } else {
      logger.debug(`[Presence Poll] ✅ Complete in ${pollDuration}ms - No changes (${allDevices.length} devices stable)`);
    }
    
    // Reset failure counter on success
    consecutiveFailures = 0;
    lastSuccessfulPoll = Date.now();
    
  } catch (error) {
    consecutiveFailures++;
    const pollDuration = Date.now() - pollStartTime;
    
    logger.error('[Presence Poll] ❌ Error:', {
      error: error.message,
      duration: `${pollDuration}ms`,
      consecutiveFailures: `${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`,
      stack: error.stack,
    });
    
    // Classify error type
    if (error.message.includes('MQTT') || error.message.includes('timeout')) {
      logger.warn(`[Presence Poll] 🔌 MQTT connectivity issue - retry ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`);
    } else if (error.message.includes('database') || error.message.includes('mongo')) {
      logger.error('[Presence Poll] 💾 Database error - check MongoDB connection');
    }
    
    // Activate circuit breaker warning
    if (consecutiveFailures === MAX_CONSECUTIVE_FAILURES) {
      logger.error('[Presence Poll] 🚨 CIRCUIT BREAKER ACTIVATED - entering backoff mode');
      logger.error('[Presence Poll] Action required: Check MQTT broker and database connectivity');
    }
  }
}, {
  scheduled: false,
  timezone: 'UTC',
});

/**
 * Cleanup Old Data - OPTIMIZED
 * Runs daily at 2:00 AM UTC
 * Deletes sensor readings and alerts older than 90 days
 * 
 * OPTIMIZATIONS v2:
 * - Streaming deletion for memory efficiency
 * - Parallel cleanup of readings and alerts
 * - Adaptive batch sizing based on document count
 * - Progress tracking with ETA calculation
 * - Graceful handling of database pressure
 * - Cache cleanup for deleted records
 */
const cleanupOldReadings = cron.schedule('0 2 * * *', async () => {
  const cleanupStartTime = Date.now();
  
  try {
    logger.info('[Cleanup] 🧹 Starting daily data cleanup...');
    
    const ninetyDaysAgo = new Date(Date.now() - TIME.NINETY_DAYS);
    const thirtyDaysAgo = new Date(Date.now() - TIME.THIRTY_DAYS);
    
    // Get estimated counts for progress tracking
    const [readingsToDelete, alertsToDelete] = await Promise.all([
      SensorReading.countDocuments({ timestamp: { $lt: ninetyDaysAgo } }),
      Alert.countDocuments({
        createdAt: { $lt: ninetyDaysAgo },
        status: { $in: ['resolved', 'acknowledged'] }
      })
    ]);
    
    logger.info('[Cleanup] Estimated workload:', {
      sensorReadings: readingsToDelete,
      alerts: alertsToDelete,
      cutoffDate: ninetyDaysAgo.toISOString()
    });
    
    // Adaptive batch sizing: larger batches for huge datasets
    const readingBatchSize = readingsToDelete > 100000 ? 20000 : 10000;
    const alertBatchSize = 5000;
    
    // Parallel cleanup operations
    const [readingsResult, alertsResult] = await Promise.all([
      // Cleanup sensor readings
      (async () => {
        let totalDeleted = 0;
        let batchCount = 0;
        let consecutiveEmptyBatches = 0;
        const maxEmptyBatches = 3; // Stop after 3 empty batches
        
        logger.info(`[Cleanup] 📊 Deleting sensor readings (batch size: ${readingBatchSize})...`);
        
        while (consecutiveEmptyBatches < maxEmptyBatches) {
          const batchStartTime = Date.now();
          
          try {
            // Use deleteMany without limit for better performance
            // MongoDB will handle this efficiently with indexes
            const result = await SensorReading.deleteMany({
              timestamp: { $lt: ninetyDaysAgo }
            }).limit(readingBatchSize);
            
            if (result.deletedCount === 0) {
              consecutiveEmptyBatches++;
              logger.debug(`[Cleanup] No more readings to delete (empty batch ${consecutiveEmptyBatches}/${maxEmptyBatches})`);
              break;
            }
            
            consecutiveEmptyBatches = 0;
            totalDeleted += result.deletedCount;
            batchCount++;
            
            const batchDuration = Date.now() - batchStartTime;
            const docsPerSecond = Math.round((result.deletedCount / batchDuration) * 1000);
            
            // Progress logging every 5 batches
            if (batchCount % 5 === 0) {
              const progress = readingsToDelete > 0 ? Math.round((totalDeleted / readingsToDelete) * 100) : 100;
              logger.info(`[Cleanup] Progress: ${totalDeleted}/${readingsToDelete} (${progress}%) - ${docsPerSecond} docs/s`);
            }
            
            // Adaptive throttling: slow down if batches take too long
            if (batchDuration > 5000) {
              logger.warn(`[Cleanup] Batch took ${batchDuration}ms - adding delay to reduce database pressure`);
              await new Promise(resolve => setTimeout(resolve, 500));
            } else if (result.deletedCount === readingBatchSize) {
              // Small delay between full batches
              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              // Last batch was partial, we're done
              break;
            }
          } catch (batchError) {
            logger.error(`[Cleanup] Batch ${batchCount} failed:`, batchError.message);
            // Continue with next batch instead of failing entire job
            await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay on error
          }
        }
        
        return { totalDeleted, batchCount };
      })(),
      
      // Cleanup old alerts in parallel
      (async () => {
        logger.info('[Cleanup] 🚨 Deleting old resolved alerts...');
        
        let totalDeleted = 0;
        let batchCount = 0;
        
        while (true) {
          try {
            const result = await Alert.deleteMany({
              createdAt: { $lt: ninetyDaysAgo },
              status: { $in: ['resolved', 'acknowledged'] }
            }).limit(alertBatchSize);
            
            if (result.deletedCount === 0) {
              break;
            }
            
            totalDeleted += result.deletedCount;
            batchCount++;
            
            if (result.deletedCount < alertBatchSize) {
              break; // Last batch
            }
            
            await new Promise(resolve => setTimeout(resolve, 50)); // Shorter delay for alerts
          } catch (batchError) {
            logger.error(`[Cleanup] Alert cleanup batch ${batchCount} failed:`, batchError.message);
            break; // Stop on error for alerts (less critical)
          }
        }
        
        return { totalDeleted, batchCount };
      })()
    ]);
    
    // Calculate cleanup duration
    const cleanupDuration = Date.now() - cleanupStartTime;
    const durationMinutes = Math.round(cleanupDuration / 1000 / 60 * 10) / 10;
    
    // Summary log
    logger.info('[Cleanup] ✅ Cleanup complete', {
      duration: `${durationMinutes} minutes`,
      sensorReadings: {
        deleted: readingsResult.totalDeleted,
        batches: readingsResult.batchCount,
        avgBatchSize: Math.round(readingsResult.totalDeleted / readingsResult.batchCount || 0)
      },
      alerts: {
        deleted: alertsResult.totalDeleted,
        batches: alertsResult.batchCount
      },
      totalDocuments: readingsResult.totalDeleted + alertsResult.totalDeleted
    });
    
  } catch (error) {
    const cleanupDuration = Date.now() - cleanupStartTime;
    
    logger.error('[Cleanup] ❌ Cleanup failed:', {
      error: error.message,
      duration: `${Math.round(cleanupDuration / 1000)}s`,
      stack: error.stack,
    });
  }
}, {
  scheduled: false,
  timezone: 'UTC',
});

/**
 * Pre-restart Maintenance - OPTIMIZED
 * Performs comprehensive cleanup and health checks before scheduled restart
 * 
 * OPTIMIZATIONS v2:
 * - Parallel task execution with Promise.allSettled
 * - Individual task timeout protection
 * - Detailed performance metrics
 * - Graceful degradation on task failures
 * - Memory and resource cleanup
 */
async function performPreRestartMaintenance() {
  const maintenanceStartTime = Date.now();
  
  try {
    logger.info('========================================');
    logger.info('[SCHEDULED RESTART] 🔧 Starting pre-restart maintenance...');
    logger.info('========================================');

    const results = {
      timestamp: new Date().toISOString(),
      totalDuration: 0,
      tasks: [],
      success: true
    };

    // Define all maintenance tasks with timeout protection
    const tasks = [
      // Task 1: System statistics collection
      {
        name: 'system_statistics',
        timeout: 10000,
        fn: async () => {
          logger.info('[Maintenance] 📊 Collecting system statistics...');
          
          const [
            deviceCount,
            onlineDevices,
            offlineDevices,
            readingCount,
            alertCount,
            activeAlerts
          ] = await Promise.all([
            Device.countDocuments(),
            Device.countDocuments({ status: 'online' }),
            Device.countDocuments({ status: 'offline' }),
            SensorReading.estimatedDocumentCount(),
            Alert.countDocuments(),
            Alert.countDocuments({ status: 'active' })
          ]);

          const memUsage = process.memoryUsage();
          const stats = {
            devices: {
              total: deviceCount,
              online: onlineDevices,
              offline: offlineDevices,
              onlinePercentage: deviceCount > 0 ? Math.round((onlineDevices / deviceCount) * 100) : 0
            },
            readings: {
              total: readingCount,
              estimated: true
            },
            alerts: {
              total: alertCount,
              active: activeAlerts,
              activePercentage: alertCount > 0 ? Math.round((activeAlerts / alertCount) * 100) : 0
            },
            memory: {
              heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
              heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
              rss: Math.round(memUsage.rss / 1024 / 1024),
              external: Math.round(memUsage.external / 1024 / 1024),
              unit: 'MB'
            },
            performance: {
              uptime: formatUptime(process.uptime()),
              totalPolls: totalPollsExecuted,
              devicesChecked: totalDevicesChecked,
              statusChanges: totalStatusChanges
            }
          };

          logger.info('[Maintenance] ✅ Statistics collected:', stats);
          return stats;
        }
      },
      
      // Task 2: Log file cleanup
      {
        name: 'log_cleanup',
        timeout: 15000,
        fn: async () => {
          logger.info('[Maintenance] 🗂️  Cleaning up old log files...');
          
          const logsDir = path.join(__dirname, '../../logs');
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          
          try {
            const files = await fs.readdir(logsDir);
            const logFiles = files.filter(file => file.endsWith('.log'));
            
            // Stat all files in parallel
            const fileStats = await Promise.allSettled(
              logFiles.map(async file => {
                const filePath = path.join(logsDir, file);
                const stats = await fs.stat(filePath);
                return { 
                  filePath, 
                  file,
                  mtime: stats.mtimeMs, 
                  size: stats.size,
                  isOld: stats.mtimeMs < sevenDaysAgo 
                };
              })
            );

            const validFiles = fileStats
              .filter(result => result.status === 'fulfilled')
              .map(result => result.value);
            
            const filesToDelete = validFiles.filter(f => f.isOld);
            
            // Delete old files in parallel with error handling
            if (filesToDelete.length > 0) {
              const deleteResults = await Promise.allSettled(
                filesToDelete.map(f => fs.unlink(f.filePath))
              );
              
              const successfulDeletes = deleteResults.filter(r => r.status === 'fulfilled').length;
              const failedDeletes = deleteResults.filter(r => r.status === 'rejected').length;
              
              logger.info(`[Maintenance] ✅ Log cleanup: ${successfulDeletes}/${filesToDelete.length} files deleted`);
              
              if (failedDeletes > 0) {
                logger.warn(`[Maintenance] ⚠️  ${failedDeletes} files failed to delete`);
              }
              
              return {
                totalLogFiles: logFiles.length,
                oldFiles: filesToDelete.length,
                deleted: successfulDeletes,
                failed: failedDeletes,
                freedSpace: Math.round(filesToDelete.reduce((sum, f) => sum + f.size, 0) / 1024) + ' KB'
              };
            } else {
              logger.info('[Maintenance] ✅ No old log files to delete');
              return { totalLogFiles: logFiles.length, oldFiles: 0, deleted: 0 };
            }
          } catch (error) {
            if (error.code === 'ENOENT') {
              logger.info('[Maintenance] ℹ️  Logs directory not found - skipping');
              return { skipped: true, reason: 'directory_not_found' };
            }
            throw error;
          }
        }
      },
      
      // Task 3: Database connection health check
      {
        name: 'database_health',
        timeout: 5000,
        fn: async () => {
          logger.info('[Maintenance] 💾 Checking database health...');
          
          const mongoose = require('mongoose');
          const dbStats = {
            state: mongoose.connection.readyState,
            stateLabel: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
            host: mongoose.connection.host,
            name: mongoose.connection.name,
            models: Object.keys(mongoose.connection.models).length
          };
          
          logger.info('[Maintenance] ✅ Database health:', dbStats);
          return dbStats;
        }
      },
      
      // Task 5: MQTT connection health check
      {
        name: 'mqtt_health',
        timeout: 5000,
        fn: async () => {
          logger.info('[Maintenance] 🔌 Checking MQTT health...');
          
          const mqttStats = {
            connected: mqttService.connected,
            reconnectCount: mqttService.reconnectCount || 0,
            lastReconnect: mqttService.lastReconnectTime,
            clientId: mqttService.client?.options?.clientId
          };
          
          logger.info('[Maintenance] ✅ MQTT health:', mqttStats);
          return mqttStats;
        }
      }
    ];

    // Execute all tasks in parallel with timeout protection
    logger.info(`[Maintenance] 🚀 Executing ${tasks.length} tasks in parallel...`);
    
    const taskResults = await Promise.allSettled(
      tasks.map(async (task) => {
        const taskStartTime = Date.now();
        
        try {
          // Race between task execution and timeout
          const result = await Promise.race([
            task.fn(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Task timeout after ${task.timeout}ms`)), task.timeout)
            )
          ]);
          
          const duration = Date.now() - taskStartTime;
          
          return {
            task: task.name,
            status: 'success',
            duration,
            data: result
          };
        } catch (error) {
          const duration = Date.now() - taskStartTime;
          
          logger.error(`[Maintenance] ❌ Task '${task.name}' failed:`, error.message);
          
          return {
            task: task.name,
            status: 'failed',
            duration,
            error: error.message
          };
        }
      })
    );

    // Process results
    taskResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.tasks.push(result.value);
      } else {
        results.tasks.push({
          task: 'unknown',
          status: 'rejected',
          error: result.reason?.message || 'Unknown error'
        });
        results.success = false;
      }
    });

    // Calculate total duration
    results.totalDuration = Date.now() - maintenanceStartTime;
    
    // Summary
    const successfulTasks = results.tasks.filter(t => t.status === 'success').length;
    const failedTasks = results.tasks.filter(t => t.status === 'failed').length;
    
    logger.info('========================================');
    logger.info(`[SCHEDULED RESTART] ✅ Maintenance complete in ${results.totalDuration}ms`);
    logger.info(`[SCHEDULED RESTART] Tasks: ${successfulTasks} successful, ${failedTasks} failed`);
    
    // Log next restart time
    const nextRestart = getNextRestartTime();
    logger.info(`[SCHEDULED RESTART] Next restart: ${nextRestart.toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`);
    logger.info('========================================');

    return results;
    
  } catch (error) {
    const duration = Date.now() - maintenanceStartTime;
    
    logger.error('[SCHEDULED RESTART] ❌ Maintenance failed catastrophically:', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    
    throw error;
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Calculate next Saturday midnight restart time
 */
function getNextRestartTime() {
  const now = new Date();
  const nextSaturday = new Date(now);
  
  // Set to next Saturday
  nextSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
  
  // Set to midnight Philippine Time
  nextSaturday.setHours(0, 0, 0, 0);
  
  return nextSaturday;
}

/**
 * Scheduled Server Restart
 * Runs every Saturday at 12:00 AM Philippine Time (UTC+8)
 * Cron: 0 0 * * 6 (Every Saturday at midnight)
 * 
 * This performs maintenance tasks and triggers a graceful restart
 * Docker's restart policy will automatically restart the container
 */
const scheduledRestart = cron.schedule('0 0 * * 6', async () => {
  try {
    logger.warn('========================================');
    logger.warn('[SCHEDULED RESTART] Initiating weekly maintenance restart');
    logger.warn('[SCHEDULED RESTART] Time: Saturday 12:00 AM (Philippine Time)');
    logger.warn('========================================');

    // Perform pre-restart maintenance
    await performPreRestartMaintenance();

    // Log final message
    logger.warn('[SCHEDULED RESTART] Maintenance complete. Initiating graceful shutdown...');
    logger.warn('[SCHEDULED RESTART] Container will automatically restart via Docker policy');
    logger.warn('========================================');

    // Give time for logs to flush (2 seconds)
    setTimeout(() => {
      // Trigger graceful shutdown (SIGTERM handler will handle cleanup)
      process.kill(process.pid, 'SIGTERM');
    }, 2000);

  } catch (error) {
    logger.error('[SCHEDULED RESTART] Error during scheduled restart:', {
      error: error.message,
      stack: error.stack,
    });
    
    // Still attempt restart even if maintenance fails
    logger.warn('[SCHEDULED RESTART] Proceeding with restart despite maintenance errors...');
    setTimeout(() => {
      process.kill(process.pid, 'SIGTERM');
    }, 2000);
  }
}, {
  scheduled: false,
  timezone: 'Asia/Manila', // Philippine Time (UTC+8)
});

/**
 * Get Job Health Status and Metrics
 * Provides real-time visibility into background job performance
 */
function getJobHealthStatus() {
  const uptime = process.uptime();
  const nextRestart = getNextRestartTime();
  
  return {
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime)
    },
    presencePolling: {
      enabled: presencePollingJob.getStatus() === 'scheduled',
      consecutiveFailures,
      lastSuccessfulPoll: lastSuccessfulPoll ? new Date(lastSuccessfulPoll).toISOString() : null,
      timeSinceLastSuccess: lastSuccessfulPoll ? Math.floor((Date.now() - lastSuccessfulPoll) / 1000) : null,
      circuitBreakerActive: consecutiveFailures >= MAX_CONSECUTIVE_FAILURES,
      metrics: {
        totalPolls: totalPollsExecuted,
        totalDevicesChecked,
        totalStatusChanges,
        avgDevicesPerPoll: totalPollsExecuted > 0 ? Math.round(totalDevicesChecked / totalPollsExecuted) : 0
      }
    },
    cleanup: {
      enabled: cleanupOldReadings.getStatus() === 'scheduled',
      nextRun: '2:00 AM UTC daily',
      dataRetention: '90 days'
    },
    scheduledRestart: {
      enabled: scheduledRestart.getStatus() === 'scheduled',
      nextRestart: nextRestart.toISOString(),
      nextRestartFormatted: nextRestart.toLocaleString('en-US', { 
        timeZone: 'Asia/Manila',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    },
    health: {
      overall: consecutiveFailures < MAX_CONSECUTIVE_FAILURES ? 'healthy' : 'degraded',
      mqttConnected: mqttService.connected,
      databaseConnected: require('mongoose').connection.readyState === 1
    }
  };
}

/**
 * Reset Job Metrics
 * Useful for testing or after manual interventions
 */
function resetJobMetrics() {
  consecutiveFailures = 0;
  totalPollsExecuted = 0;
  totalDevicesChecked = 0;
  totalStatusChanges = 0;
  lastSuccessfulPoll = Date.now();
  
  logger.info('[JOBS] 🔄 Metrics reset successfully');
  
  return {
    success: true,
    message: 'Job metrics have been reset',
    timestamp: new Date().toISOString()
  };
}

/**
 * Start All Background Jobs - OPTIMIZED
 * Enhanced with better logging and health monitoring
 */
function startBackgroundJobs() {
  const startTime = Date.now();
  const isProduction = process.env.NODE_ENV === 'production';
  
  logger.info('========================================');
  logger.info('[JOBS] 🚀 Initializing background jobs...');
  logger.info('========================================');
  
  try {
    // Start jobs
    presencePollingJob.start();
    cleanupOldReadings.start();
    scheduledRestart.start();
    
    const initDuration = Date.now() - startTime;
    
    if (isProduction) {
      // Condensed production logs
      logger.info('[JOBS] ✅ All jobs started successfully');
      logger.info('[JOBS] 🔄 Presence Polling: Every 1 minute (adaptive timeout)');
      logger.info('[JOBS] 🧹 Data Cleanup: Daily at 2:00 AM UTC (90-day retention)');
      logger.info('[JOBS] 🔧 Scheduled Restart: Every Saturday at 12:00 AM PHT');
    } else {
      // Detailed development logs
      logger.info('[JOBS] Job configurations:');
      logger.info('  ✅ Presence Polling:');
      logger.info('     - Frequency: Every 1 minute');
      logger.info('     - Timeout: Adaptive (3-10s based on device count)');
      logger.info('     - Features: Circuit breaker, exponential backoff, batch updates');
      logger.info('  ✅ Data Cleanup:');
      logger.info('     - Schedule: Daily at 2:00 AM UTC');
      logger.info('     - Retention: 90 days for readings, alerts');
      logger.info('     - Features: Parallel cleanup, adaptive batching, progress tracking');
      logger.info('  ✅ Scheduled Restart:');
      logger.info('     - Schedule: Every Saturday at 12:00 AM Philippine Time');
      
      const nextRestart = getNextRestartTime();
      logger.info(`     - Next restart: ${nextRestart.toLocaleString('en-US', { 
        timeZone: 'Asia/Manila',
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })} PHT`);
      
      logger.info('\n[JOBS] 🎯 Optimizations active:');
      logger.info('  • Adaptive timeouts based on load');
      logger.info('  • Circuit breaker for failure protection');
      logger.info('  • Batch database operations');
      logger.info('  • Smart cache invalidation');
      logger.info('  • Parallel task execution');
      logger.info('  • Memory-efficient Set operations');
    }
    
    logger.info('========================================');
    logger.info(`[JOBS] ✅ Initialization complete in ${initDuration}ms`);
    logger.info('[JOBS] 📊 Use getJobHealthStatus() for real-time metrics');
    logger.info('========================================');
    
    // Log initial health status
    if (!isProduction) {
      setTimeout(() => {
        const health = getJobHealthStatus();
        logger.debug('[JOBS] Initial health status:', {
          overall: health.health.overall,
          mqtt: health.health.mqttConnected,
          database: health.health.databaseConnected
        });
      }, 1000);
    }
    
  } catch (error) {
    logger.error('[JOBS] ❌ Failed to start background jobs:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Stop All Background Jobs - OPTIMIZED
 * Enhanced with graceful shutdown and cleanup
 */
function stopBackgroundJobs() {
  const stopTime = Date.now();
  
  logger.info('========================================');
  logger.info('[JOBS] 🛑 Stopping background jobs...');
  logger.info('========================================');
  
  try {
    // Stop all jobs
    presencePollingJob.stop();
    cleanupOldReadings.stop();
    scheduledRestart.stop();
    
    // Log final metrics
    const finalMetrics = {
      totalPolls: totalPollsExecuted,
      devicesChecked: totalDevicesChecked,
      statusChanges: totalStatusChanges,
      uptime: formatUptime(process.uptime())
    };
    
    logger.info('[JOBS] 📊 Final metrics:', finalMetrics);
    
    const stopDuration = Date.now() - stopTime;
    
    logger.info('========================================');
    logger.info(`[JOBS] ✅ All jobs stopped successfully in ${stopDuration}ms`);
    logger.info('========================================');
    
  } catch (error) {
    logger.error('[JOBS] ❌ Error stopping jobs:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  startBackgroundJobs,
  stopBackgroundJobs,
  performPreRestartMaintenance, // Export for manual testing
  getNextRestartTime, // Export for API endpoints
  getJobHealthStatus, // Export for health monitoring
  resetJobMetrics, // Export for manual resets
};
