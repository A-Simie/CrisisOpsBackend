import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Idempotency-Key'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
});

export const hppMiddleware = hpp();

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) ?? uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

export const sanitizeMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const sanitize = (obj: Record<string, unknown>): void => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = (obj[key] as string)
          .replace(/\$|\{|\}|\[|\]/g, '')
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key] as Record<string, unknown>);
      }
    }
  };

  if (req.body && typeof req.body === 'object') {
    sanitize(req.body as Record<string, unknown>);
  }

  if (req.query && typeof req.query === 'object') {
    sanitize(req.query as Record<string, unknown>);
  }

  next();
};
