/**
 * Sensor Reading Service
 * 
 * Business logic for high-volume sensor data:
 * - Bulk insert operations for batch data
 * - Time-series aggregation pipelines
 * - Statistical queries (min/max/avg)
 * - Optimized for heavy loads
 * 
 * @module feature/sensorReadings/sensorReading.service
 */

import SensorReading from './sensorReading.model';
import {
  ISensorReadingDocument,
  ICreateSensorReadingData,
  IBulkSensorReadingData,
  ISensorReadingFilters,
  ISensorReadingStats,
  IAggregatedSensorData,
  AggregationGranularity,
} from './sensorReading.types';
import { CRUDOperations } from '@utils/queryBuilder.util';
import { Document } from 'mongoose';

/**
 * Sensor Reading Service Class
 * Handles high-volume sensor data operations
 */
export class SensorReadingService {
  private crud: CRUDOperations<ISensorReadingDocument & Document>;

  constructor() {
    this.crud = new CRUDOperations<ISensorReadingDocument & Document>(SensorReading as any);
  }

  /**
   * Create single sensor reading
   * Use bulkInsert for batch operations instead
   */
  async createReading(readingData: ICreateSensorReadingData): Promise<ISensorReadingDocument> {
    return this.crud.create(readingData as any);
  }

  /**
   * Bulk insert sensor readings
   * Optimized for high-volume batch inserts from devices
   */
  async bulkInsertReadings(readings: IBulkSensorReadingData[]): Promise<number> {
    if (readings.length === 0) {
      return 0;
    }

    // Use insertMany for bulk operations - much faster than individual inserts
    const result = await SensorReading.insertMany(readings, { ordered: false });
    return result.length;
  }

  /**
   * Get readings with filters and pagination
   * Excludes soft-deleted readings by default
   */
  async getReadings(filters: ISensorReadingFilters, page = 1, limit = 100) {
    const query = this.crud.query();

    // Exclude soft-deleted readings
    query.filter({ isDeleted: { $ne: true } });

    // Apply filters
    if (filters.deviceId) query.filter({ deviceId: filters.deviceId });

    // Date range
    if (filters.startDate || filters.endDate) {
      query.dateRange('timestamp', filters.startDate, filters.endDate);
    }

    // Numeric ranges
    if (filters.minPH !== undefined || filters.maxPH !== undefined) {
      query.numericRange('pH', filters.minPH, filters.maxPH);
    }

    if (filters.minTurbidity !== undefined || filters.maxTurbidity !== undefined) {
      query.numericRange('turbidity', filters.minTurbidity, filters.maxTurbidity);
    }

    if (filters.minTDS !== undefined || filters.maxTDS !== undefined) {
      query.numericRange('tds', filters.minTDS, filters.maxTDS);
    }

    // Pagination and sorting
    query.paginate(page, limit).sortBy('-timestamp');

    return query.execute();
  }

  /**
   * Get latest reading for device
   * Excludes soft-deleted readings
   */
  async getLatestReading(deviceId: string): Promise<ISensorReadingDocument | null> {
    return SensorReading.findOne({ deviceId, isDeleted: { $ne: true } }).sort({ timestamp: -1 }).lean() as any;
  }

  /**
   * Get reading statistics for device
   * Uses aggregation pipeline for efficient calculation
   * Excludes soft-deleted readings
   */
  async getStatistics(
    deviceId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ISensorReadingStats | null> {
    const matchStage: any = { isDeleted: { $ne: true } };
    if (deviceId) matchStage.deviceId = deviceId;
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = startDate;
      if (endDate) matchStage.timestamp.$lte = endDate;
    }

    const stats = await SensorReading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          minPH: { $min: '$pH' },
          maxPH: { $max: '$pH' },
          avgPH: { $avg: '$pH' },
          minTurbidity: { $min: '$turbidity' },
          maxTurbidity: { $max: '$turbidity' },
          avgTurbidity: { $avg: '$turbidity' },
          minTDS: { $min: '$tds' },
          maxTDS: { $max: '$tds' },
          avgTDS: { $avg: '$tds' },
          minTimestamp: { $min: '$timestamp' },
          maxTimestamp: { $max: '$timestamp' },
        },
      },
    ]);

    if (stats.length === 0) {
      return null;
    }

    const result = stats[0];

    return {
      count: result.count,
      pH: {
        min: result.minPH,
        max: result.maxPH,
        avg: result.avgPH,
      },
      turbidity: {
        min: result.minTurbidity,
        max: result.maxTurbidity,
        avg: result.avgTurbidity,
      },
      tds: {
        min: result.minTDS,
        max: result.maxTDS,
        avg: result.avgTDS,
      },
      timeRange: {
        start: result.minTimestamp,
        end: result.maxTimestamp,
      },
    };
  }

  /**
   * Get aggregated time-series data
   * Groups readings by time buckets for charting
   */
  async getAggregatedData(
    deviceId: string,
    startDate: Date,
    endDate: Date,
    granularity: AggregationGranularity
  ): Promise<IAggregatedSensorData[]> {
    // Define date format based on granularity
    const dateFormat: any = {
      minute: {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' },
        minute: { $minute: '$timestamp' },
      },
      hour: {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' },
      },
      day: {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
      },
      week: {
        year: { $year: '$timestamp' },
        week: { $week: '$timestamp' },
      },
      month: {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
      },
    };

    const format = dateFormat[granularity];

    const results = await SensorReading.aggregate([
      {
        $match: {
          deviceId,
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: format,
          timestamp: { $first: '$timestamp' },
          count: { $sum: 1 },
          minPH: { $min: '$pH' },
          maxPH: { $max: '$pH' },
          avgPH: { $avg: '$pH' },
          minTurbidity: { $min: '$turbidity' },
          maxTurbidity: { $max: '$turbidity' },
          avgTurbidity: { $avg: '$turbidity' },
          minTDS: { $min: '$tds' },
          maxTDS: { $max: '$tds' },
          avgTDS: { $avg: '$tds' },
        },
      },
      {
        $sort: { timestamp: 1 },
      },
    ]);

    return results.map((r) => ({
      _id: JSON.stringify(r._id),
      timestamp: r.timestamp,
      count: r.count,
      pH: {
        min: r.minPH,
        max: r.maxPH,
        avg: r.avgPH,
      },
      turbidity: {
        min: r.minTurbidity,
        max: r.maxTurbidity,
        avg: r.avgTurbidity,
      },
      tds: {
        min: r.minTDS,
        max: r.maxTDS,
        avg: r.avgTDS,
      },
    }));
  }

  /**
   * Delete old readings
   * For manual cleanup if TTL index not used
   */
  async deleteOldReadings(beforeDate: Date): Promise<number> {
    const result = await SensorReading.deleteMany({
      timestamp: { $lt: beforeDate },
    });

    return result.deletedCount || 0;
  }

  /**
   * Get reading count for device
   */
  async getReadingCount(deviceId?: string): Promise<number> {
    const filter = deviceId ? { deviceId } : {};
    return SensorReading.countDocuments(filter);
  }

  /**
   * Process MQTT sensor data
   * Main entry point for incoming sensor readings via MQTT
   * BUG FIX #2: Support validity flags for graceful sensor degradation
   */
  async processSensorData(deviceId: string, sensorData: {
    pH: number | null;
    turbidity: number | null;
    tds: number | null;
    pH_valid?: boolean;
    tds_valid?: boolean;
    turbidity_valid?: boolean;
    timestamp?: Date;
  }): Promise<ISensorReadingDocument> {
    const reading = await this.createReading({
      deviceId,
      pH: sensorData.pH,
      turbidity: sensorData.turbidity,
      tds: sensorData.tds,
      pH_valid: sensorData.pH_valid !== false,
      tds_valid: sensorData.tds_valid !== false,
      turbidity_valid: sensorData.turbidity_valid !== false,
      timestamp: sensorData.timestamp || new Date(),
    });

    return reading;
  }
}

export default new SensorReadingService();
