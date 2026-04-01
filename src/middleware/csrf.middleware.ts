import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util.js';

export const csrfProtectionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (stateChangingMethods.includes(req.method)) {
    const requestedWith = req.get('X-Requested-With');

    if (requestedWith !== 'XMLHttpRequest') {
      logger.warn('CSRF: Missing X-Requested-With', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

      if (process.env.CSRF_ENFORCE === 'true') {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Missing security header.',
          error: { code: 'CSRF_PROTECTION_FAILED' },
        });
        return;
      }
    }
  }

  next();
};
