/**
 * Sensor Reading Validation Schemas
 * 
 * Zod schemas for validating sensor reading requests
 * 
 * @module feature/sensorReadings/sensorReading.schema
 */

import { z } from 'zod';
import { AggregationGranularity } from './sensorReading.types';

/**
 * Sensor reading filters schema
 */
export const sensorReadingFiltersSchema = z.object({
  query: z.object({
    deviceId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    minPH: z.string().transform(Number).pipe(z.number().min(0).max(14)).optional(),
    maxPH: z.string().transform(Number).pipe(z.number().min(0).max(14)).optional(),
    minTurbidity: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    maxTurbidity: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    minTDS: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    maxTDS: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(1000)).optional(),
  }),
});

/**
 * Create sensor reading schema
 */
export const createSensorReadingSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
    pH: z.number().min(0).max(14, 'pH must be between 0 and 14'),
    turbidity: z.number().min(0, 'Turbidity must be non-negative'),
    tds: z.number().min(0, 'TDS must be non-negative'),
    timestamp: z.union([z.string().datetime(), z.date()]).optional(),
  }),
});

/**
 * Bulk insert schema
 */
export const bulkInsertSchema = z.object({
  body: z.object({
    readings: z
      .array(
        z.object({
          deviceId: z.string().min(1, 'Device ID is required'),
          pH: z.number().min(0).max(14, 'pH must be between 0 and 14'),
          turbidity: z.number().min(0, 'Turbidity must be non-negative'),
          tds: z.number().min(0, 'TDS must be non-negative'),
          timestamp: z.union([z.string().datetime(), z.date()]).optional(),
        })
      )
      .min(1, 'At least one reading is required')
      .max(1000, 'Cannot insert more than 1000 readings at once'),
  }),
});

/**
 * Get latest reading schema
 */
export const getLatestReadingSchema = z.object({
  params: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
  }),
});

/**
 * Statistics query schema
 */
export const statisticsQuerySchema = z.object({
  query: z.object({
    deviceId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

/**
 * Aggregated data query schema
 */
export const aggregatedDataQuerySchema = z.object({
  query: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
    startDate: z.string().datetime({ message: 'Start date is required' }),
    endDate: z.string().datetime({ message: 'End date is required' }),
    granularity: z.nativeEnum(AggregationGranularity).optional().default(AggregationGranularity.HOUR),
  }),
});

/**
 * Delete old readings schema
 */
export const deleteOldReadingsSchema = z.object({
  body: z.object({
    beforeDate: z.union([z.string().datetime(), z.date()]),
  }),
});

// Export inferred types
export type SensorReadingFilters = z.infer<typeof sensorReadingFiltersSchema>['query'];
export type CreateSensorReadingInput = z.infer<typeof createSensorReadingSchema>['body'];
export type BulkInsertInput = z.infer<typeof bulkInsertSchema>['body'];
export type GetLatestReadingParams = z.infer<typeof getLatestReadingSchema>['params'];
export type StatisticsQuery = z.infer<typeof statisticsQuerySchema>['query'];
export type AggregatedDataQuery = z.infer<typeof aggregatedDataQuerySchema>['query'];
export type DeleteOldReadingsInput = z.infer<typeof deleteOldReadingsSchema>['body'];
