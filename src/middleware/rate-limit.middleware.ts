import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.util.js';

const createRedisStore = (prefix: string): RedisStore => {
  return new RedisStore({
    sendCommand: async (...args: string[]): Promise<number> => {
      const [command, ...rest] = args;
      return (await redis.call(command!, ...rest)) as number;
    },
    prefix: `ratelimit:${prefix}:`,
  });
};

export const globalRateLimiter = rateLimit({
  store: createRedisStore('global'),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
  handler: (_req, res) => {
    sendError(res, 'Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED');
  },
  keyGenerator: (req) => {
    return req.user?.id ?? req.ip ?? 'unknown';
  },
});

export const authRateLimiter = rateLimit({
  store: createRedisStore('auth'),
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    sendError(
      res,
      'Too many authentication attempts, please try again later',
      429,
      'AUTH_RATE_LIMIT_EXCEEDED'
    );
  },
  keyGenerator: (req) => {
    return req.ip ?? 'unknown';
  },
});

export const incidentCreationLimiter = rateLimit({
  store: createRedisStore('incidents'),
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'Too many incident reports, please wait before submitting more',
      429,
      'INCIDENT_RATE_LIMIT_EXCEEDED'
    );
  },
  keyGenerator: (req) => {
    return req.user?.id ?? req.ip ?? 'unknown';
  },
});

export const locationUpdateLimiter = rateLimit({
  store: createRedisStore('location'),
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many location updates', 429, 'LOCATION_RATE_LIMIT_EXCEEDED');
  },
  keyGenerator: (req) => {
    return req.user?.id ?? req.ip ?? 'unknown';
  },
});

export const mediaUploadLimiter = rateLimit({
  store: createRedisStore('media'),
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 'Too many file uploads', 429, 'UPLOAD_RATE_LIMIT_EXCEEDED');
  },
  keyGenerator: (req) => {
    return req.user?.id ?? req.ip ?? 'unknown';
  },
});
