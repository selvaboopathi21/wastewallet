// Error handling middleware in TypeScript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import ApiError from '../utils/ApiError';
import env from '../config/env';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    logger.error(`[Server Error] ${err.message} \nStack: ${err.stack}`);
  } else {
    logger.warn(`[Client Error] ${statusCode} - ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv !== 'production' && { stack: err.stack }),
  });
};

export default {
  notFound,
  errorHandler,
};
