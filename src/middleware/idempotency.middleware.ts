import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { redis, REDIS_KEYS, REDIS_TTL } from '../config/redis.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';
import { logger } from '../utils/logger.util.js';

interface IdempotencyRecord {
  response: unknown;
  statusCode: number;
  createdAt: string;
}

export const requireIdempotencyKey = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  if (!idempotencyKey) {
    req.idempotencyKey = createHash('sha256')
      .update(`${req.user?.id ?? 'anon'}-${Date.now()}-${Math.random()}`)
      .digest('hex');
  } else {
    req.idempotencyKey = idempotencyKey;
  }

  next();
};

export const checkIdempotency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  const idempotencyKey = req.idempotencyKey;

  if (!idempotencyKey) {
    next();
    return;
  }

  const cacheKey = REDIS_KEYS.idempotencyKey(`${req.user.id}:${idempotencyKey}`);

  try {
    const existing = await redis.get(cacheKey);

    if (existing) {
      const record = JSON.parse(existing) as IdempotencyRecord;

      const requestHash = createRequestHash(req);
      const storedHash = await redis.get(`${cacheKey}:hash`);

      if (storedHash && storedHash !== requestHash) {
        next(new ConflictError('Idempotency key already used with different request body'));
        return;
      }

      logger.info('Returning cached idempotent response', {
        requestId: req.requestId,
        idempotencyKey,
      });

      res.status(record.statusCode).json(record.response);
      return;
    }

    const originalJson = res.json.bind(res);

    res.json = (body: unknown): Response => {
      const record: IdempotencyRecord = {
        response: body,
        statusCode: res.statusCode,
        createdAt: new Date().toISOString(),
      };

      const requestHash = createRequestHash(req);

      redis
        .multi()
        .set(cacheKey, JSON.stringify(record), 'EX', REDIS_TTL.idempotency)
        .set(`${cacheKey}:hash`, requestHash, 'EX', REDIS_TTL.idempotency)
        .exec()
        .catch((error) => {
          logger.error('Failed to cache idempotent response', { error });
        });

      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error('Idempotency check failed', { error });
    next();
  }
};

const createRequestHash = (req: Request): string => {
  const content = JSON.stringify({
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params,
  });

  return createHash('sha256').update(content).digest('hex');
};

export const idempotency = [requireIdempotencyKey, checkIdempotency];
