/**
 * Sensor Reading Controller
 * 
 * Handles HTTP requests for sensor readings:
 * - Query with filters and pagination
 * - Bulk insert operations
 * - Statistical queries
 * - Time-series aggregation
 * 
 * @module feature/sensorReadings/sensorReading.controller
 */

import { Request, Response } from 'express';
import sensorReadingService from './sensorReading.service';
import { asyncHandler } from '@utils/asyncHandler.util';
import { ResponseHandler } from '@utils/response.util';
import { BadRequestError } from '@utils/errors.util';
import {
  ISensorReadingFilters,
  AggregationGranularity,
  IBulkSensorReadingData,
} from './sensorReading.types';

/**
 * Get all sensor readings with filters
 */
export const getAllReadings = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 100 } = req.query;

  const filters: ISensorReadingFilters = {
    deviceId: req.query.deviceId as string,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    minPH: req.query.minPH ? Number(req.query.minPH) : undefined,
    maxPH: req.query.maxPH ? Number(req.query.maxPH) : undefined,
    minTurbidity: req.query.minTurbidity ? Number(req.query.minTurbidity) : undefined,
    maxTurbidity: req.query.maxTurbidity ? Number(req.query.maxTurbidity) : undefined,
    minTDS: req.query.minTDS ? Number(req.query.minTDS) : undefined,
    maxTDS: req.query.maxTDS ? Number(req.query.maxTDS) : undefined,
  };

  const result = await sensorReadingService.getReadings(
    filters,
    Number(page),
    Number(limit)
  );

  ResponseHandler.paginated(
    res,
    result.data,
    result.pagination,
    'Sensor readings retrieved successfully'
  );
});

/**
 * Create single sensor reading
 */
export const createReading = asyncHandler(async (req: Request, res: Response) => {
  const reading = await sensorReadingService.createReading(req.body);
  ResponseHandler.created(res, reading, 'Sensor reading created successfully');
});

/**
 * Bulk insert sensor readings
 */
export const bulkInsertReadings = asyncHandler(async (req: Request, res: Response) => {
  const { readings } = req.body;

  if (!Array.isArray(readings) || readings.length === 0) {
    throw new BadRequestError('Readings array is required and must not be empty');
  }

  const count = await sensorReadingService.bulkInsertReadings(readings as IBulkSensorReadingData[]);

  ResponseHandler.created(
    res,
    { insertedCount: count },
    `${count} sensor readings inserted successfully`
  );
});

/**
 * Get latest reading for device
 */
export const getLatestReading = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    throw new BadRequestError('Device ID is required');
  }

  const reading = await sensorReadingService.getLatestReading(deviceId);

  if (!reading) {
    ResponseHandler.success(res, null, 'No readings found for this device');
    return;
  }

  ResponseHandler.success(res, reading, 'Latest reading retrieved successfully');
});

/**
 * Get statistics for sensor readings
 */
export const getStatistics = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId, startDate, endDate } = req.query;

  const stats = await sensorReadingService.getStatistics(
    deviceId as string,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  if (!stats) {
    ResponseHandler.success(res, null, 'No readings found for the specified criteria');
    return;
  }

  ResponseHandler.success(res, stats, 'Statistics retrieved successfully');
});

/**
 * Get aggregated time-series data
 */
export const getAggregatedData = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId, startDate, endDate, granularity = AggregationGranularity.HOUR } = req.query;

  // Validation
  if (!deviceId) {
    throw new BadRequestError('deviceId is required');
  }

  if (!startDate || !endDate) {
    throw new BadRequestError('startDate and endDate are required');
  }

  // Validate granularity
  const validGranularities = Object.values(AggregationGranularity);
  if (!validGranularities.includes(granularity as AggregationGranularity)) {
    throw new BadRequestError(
      `Invalid granularity. Must be one of: ${validGranularities.join(', ')}`
    );
  }

  const data = await sensorReadingService.getAggregatedData(
    deviceId as string,
    new Date(startDate as string),
    new Date(endDate as string),
    granularity as AggregationGranularity
  );

  ResponseHandler.success(res, data, 'Aggregated data retrieved successfully');
});

/**
 * Delete old readings
 */
export const deleteOldReadings = asyncHandler(async (req: Request, res: Response) => {
  const { beforeDate } = req.body;

  if (!beforeDate) {
    throw new BadRequestError('beforeDate is required');
  }

  const count = await sensorReadingService.deleteOldReadings(new Date(beforeDate));

  ResponseHandler.success(
    res,
    { deletedCount: count },
    `${count} old readings deleted successfully`
  );
});

/**
 * Get reading count
 */
export const getReadingCount = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.query;

  const count = await sensorReadingService.getReadingCount(deviceId as string);

  ResponseHandler.success(res, { count }, 'Reading count retrieved successfully');
});
