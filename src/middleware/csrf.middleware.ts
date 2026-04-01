import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util.js';

/**
 * CSRF Protection Middleware
 * 
 * Enforces the "Frontend-Backend Handshake" by verifying the presence of 
 * the X-Requested-With: XMLHttpRequest header for state-changing requests.
 * Since common browsers and clients cannot set custom headers for standard 
 * HTML forms without JS, this effectively neutralizes non-AJAX cross-site requests.
 */
export const csrfProtectionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (stateChangingMethods.includes(req.method)) {
    const requestedWith = req.get('X-Requested-With');
    
    if (requestedWith !== 'XMLHttpRequest') {
      logger.warn('CSRF Protection: Missing or invalid X-Requested-With header', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        origin: req.get('Origin'),
        requestedWith
      });
      
      res.status(403).json({
        success: false,
        message: 'Security Protection: Forbidden request. Missing custom validation header.',
        error: { code: 'CSRF_PROTECTION_FAILED' }
      });
      return;
    }
  }
  
  next();
};
