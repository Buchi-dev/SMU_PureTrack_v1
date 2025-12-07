import { Request, Response, NextFunction } from 'express';
import { logHttp } from '@utils/logger.util';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logHttp(`${req.method} ${req.path} - ${res.statusCode} [${duration}ms]`);
  });

  next();
};

export default requestLogger;
