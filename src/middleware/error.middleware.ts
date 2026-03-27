import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.util.js';
import { logger } from '../utils/logger.util.js';
import { env } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.requestId ?? 'unknown';

  if (error instanceof AppError) {
    logger.warn(`Operational error: ${error.message}`, {
      requestId,
      errorCode: error.errorCode,
      statusCode: error.statusCode,
      path: req.path,
    });

    sendError(res, error.message, error.statusCode, error.errorCode, error.details);
    return;
  }

  if (error instanceof ZodError) {
    const details = error.errors.reduce(
      (acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      },
      {} as Record<string, string>
    );

    logger.warn('Validation error', { requestId, details, path: req.path });

    sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', details);
    return;
  }

  if (error instanceof TokenExpiredError) {
    sendError(res, 'Token has expired', 401, 'TOKEN_EXPIRED');
    return;
  }

  if (error instanceof JsonWebTokenError) {
    sendError(res, 'Invalid token', 401, 'INVALID_TOKEN');
    return;
  }

  logger.error('Unhandled error', {
    requestId,
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : error.message;

  sendError(res, message, 500, 'INTERNAL_ERROR');
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404, 'ROUTE_NOT_FOUND');
};
