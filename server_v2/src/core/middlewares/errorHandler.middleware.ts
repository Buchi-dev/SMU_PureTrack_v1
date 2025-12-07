import { Request, Response, NextFunction } from 'express';
import { logError } from '@utils/logger.util';

interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational !== undefined ? err.isOperational : false;

  logError('API Error', err, {
    statusCode,
    isOperational,
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: isOperational ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
