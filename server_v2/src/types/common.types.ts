/**
 * Common TypeScript types used throughout the application
 */

import { Request } from 'express';

/**
 * API Response structure
 */
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Query parameters for pagination
 */
export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Extended Express Request with user authentication
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Standard date range filter
 */
export interface DateRangeFilter {
  startDate?: Date | string;
  endDate?: Date | string;
}

/**
 * Generic database document
 */
export interface BaseDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Environment variables type
 */
export interface EnvironmentVariables {
  PORT: string;
  NODE_ENV: 'development' | 'production' | 'test';
  MONGODB_URI: string;
  CORS_ORIGIN: string;
}
