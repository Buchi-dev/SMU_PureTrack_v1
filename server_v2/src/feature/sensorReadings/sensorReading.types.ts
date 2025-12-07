/**
 * Sensor Reading Types
 * TypeScript interfaces and types for high-volume sensor data
 */

import { Types, Document } from 'mongoose';

/**
 * Base sensor reading interface
 * BUG FIX #2: Added validity flags for graceful sensor degradation
 */
export interface ISensorReading {
  _id: Types.ObjectId;
  deviceId: string;
  pH: number | null;
  turbidity: number | null;
  tds: number | null;
  pH_valid: boolean;
  tds_valid: boolean;
  turbidity_valid: boolean;
  timestamp: Date;
  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  scheduledPermanentDeletionAt?: Date;
  createdAt: Date;
}

/**
 * Sensor reading document interface
 */
export interface ISensorReadingDocument extends ISensorReading, Document {}

/**
 * Sensor reading creation data
 * BUG FIX #2: Added validity flags for graceful sensor degradation
 */
export interface ICreateSensorReadingData {
  deviceId: string;
  pH: number | null;
  turbidity: number | null;
  tds: number | null;
  pH_valid?: boolean;
  tds_valid?: boolean;
  turbidity_valid?: boolean;
  timestamp: Date;
}

/**
 * Bulk sensor reading data for batch inserts
 */
export interface IBulkSensorReadingData extends ICreateSensorReadingData {}

/**
 * Sensor reading query filters
 */
export interface ISensorReadingFilters {
  deviceId?: string;
  startDate?: Date;
  endDate?: Date;
  minPH?: number;
  maxPH?: number;
  minTurbidity?: number;
  maxTurbidity?: number;
  minTDS?: number;
  maxTDS?: number;
}

/**
 * Sensor reading statistics
 */
export interface ISensorReadingStats {
  count: number;
  pH: {
    min: number;
    max: number;
    avg: number;
  };
  turbidity: {
    min: number;
    max: number;
    avg: number;
  };
  tds: {
    min: number;
    max: number;
    avg: number;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Aggregated sensor data for time series
 */
export interface IAggregatedSensorData {
  _id: string; // Time bucket identifier
  timestamp: Date;
  count: number;
  pH: {
    min: number;
    max: number;
    avg: number;
  };
  turbidity: {
    min: number;
    max: number;
    avg: number;
  };
  tds: {
    min: number;
    max: number;
    avg: number;
  };
}

/**
 * Time series granularity for aggregation
 */
export enum AggregationGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}
