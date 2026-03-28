import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.util.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: env.REDIS_URL.startsWith('rediss') ? {} : undefined,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    // Exponential backoff with a cap at 2 seconds
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'ECONNRESET'];
    if (targetErrors.some(target => err.message.includes(target))) {
      return true;
    }
    return false;
  }
});

redis.on('error', (error) => {
  logger.error('Redis connection error', { error: error.message });
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

export const disconnectRedis = async (): Promise<void> => {
  await redis.quit();
};

export const REDIS_KEYS = {
  accessTokenBlacklist: (tokenId: string) => `blacklist:access:${tokenId}`,
  refreshTokenFamily: (familyId: string) => `token_family:${familyId}`,
  rateLimitKey: (identifier: string) => `ratelimit:${identifier}`,
  idempotencyKey: (key: string) => `idempotency:${key}`,
  userSession: (userId: string) => `session:${userId}`,
  incidentCache: (incidentId: string) => `incident:${incidentId}`,
} as const;

export const REDIS_TTL = {
  accessToken: 900,
  refreshToken: 604800,
  idempotency: 86400,
  incidentCache: 300,
} as const;
