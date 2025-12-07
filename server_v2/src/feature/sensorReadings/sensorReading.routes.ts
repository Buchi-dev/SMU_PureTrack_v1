/**
 * Sensor Reading Routes
 * 
 * ✅ WebSocket Migration Complete:
 * - Real-time sensor data now broadcast via WebSocket 'sensor:data' event
 * - These routes kept for historical data and manual data entry only
 * 
 * @module feature/sensorReadings/sensorReading.routes
 */

import { Router } from 'express';
import {
  getAllReadings,
  createReading,
  bulkInsertReadings,
  getStatistics,
  getAggregatedData,
  deleteOldReadings,
  getReadingCount,
} from './sensorReading.controller';
import { requireStaff, requireAdmin } from '@core/middlewares';
import { validateRequest } from '@core/middlewares/validation.middleware';
import {
  sensorReadingFiltersSchema,
  createSensorReadingSchema,
  bulkInsertSchema,
  statisticsQuerySchema,
  aggregatedDataQuerySchema,
  deleteOldReadingsSchema,
} from './sensorReading.schema';

const router = Router();

/**
 * GET /api/v1/sensor-readings
 * Get sensor readings with filters (historical data)
 */
router.get('/', requireStaff, validateRequest(sensorReadingFiltersSchema), getAllReadings);

/**
 * GET /api/v1/sensor-readings/statistics
 * Get sensor reading statistics (historical)
 */
router.get('/statistics', requireStaff, validateRequest(statisticsQuerySchema), getStatistics);

/**
 * GET /api/v1/sensor-readings/aggregated
 * Get aggregated time-series data (for charts)
 */
router.get('/aggregated', requireStaff, validateRequest(aggregatedDataQuerySchema), getAggregatedData);

/**
 * GET /api/v1/sensor-readings/count
 * Get reading count
 */
router.get('/count', requireStaff, getReadingCount);

/**
 * POST /api/v1/sensor-readings
 * Create single sensor reading (public for devices)
 */
router.post('/', validateRequest(createSensorReadingSchema), createReading);

/**
 * POST /api/v1/sensor-readings/bulk
 * Bulk insert sensor readings (admin only)
 */
router.post('/bulk', requireAdmin, validateRequest(bulkInsertSchema), bulkInsertReadings);

/**
 * DELETE /api/v1/sensor-readings/old
 * Delete old readings (admin only)
 */
router.delete('/old', requireAdmin, validateRequest(deleteOldReadingsSchema), deleteOldReadings);

export default router;
