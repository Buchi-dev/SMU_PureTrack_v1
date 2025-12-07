import { Response } from 'express';

interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Request successful',
    statusCode: number = 200,
    meta?: ApiResponse['meta']
  ): void {
    const response: ApiResponse<T> = {
      status: 'success',
      message,
      data,
      ...(meta && { meta }),
    };
    res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'Request failed',
    statusCode: number = 500
  ): void {
    const response: ApiResponse = {
      status: 'error',
      message,
    };
    res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message: string = 'Resource created'): void {
    this.success(res, data, message, 201);
  }

  static noContent(res: Response): void {
    res.status(204).send();
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    },
    message: string = 'Data retrieved successfully',
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T[]> = {
      status: 'success',
      message,
      data,
      pagination,
    };
    res.status(statusCode).json(response);
  }
}

export default ResponseHandler;
