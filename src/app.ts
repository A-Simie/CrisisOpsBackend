/// <reference path="./global.d.ts" />
import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import passport from 'passport';

import { swaggerSpec } from './config/swagger.js';
import { configureGoogleAuth } from './config/google.strategy.js';
import { logger } from './utils/logger.util.js';
import { sendSuccess } from './utils/response.util.js';

import {
  helmetMiddleware,
  corsMiddleware,
  hppMiddleware,
  requestIdMiddleware,
  sanitizeMiddleware,
} from './middleware/security.middleware.js';
import { globalRateLimiter } from './middleware/rate-limit.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { authenticate, isVerified } from './middleware/auth.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import organizationsRoutes from './modules/organizations/organizations.routes.js';
import incidentsRoutes from './modules/incidents/incidents.routes.js';

const createApp = (): Application => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(hppMiddleware);
  app.use(requestIdMiddleware);

  app.use(compression());
  app.use(
    express.json({
      limit: '10mb',
      type: (req) => {
        const contentType = req.headers['content-type'] || '';
        // Skip JSON parsing for multipart requests (handled by multer)
        if (contentType.includes('multipart/form-data')) {
          return false;
        }
        return contentType.includes('application/json');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  app.use(passport.initialize());
  configureGoogleAuth();

  app.use(sanitizeMiddleware);

  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
      skip: (req) => req.path === '/health' || req.path === '/ready',
    })
  );

  app.use(globalRateLimiter);

  app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'healthy' }, 'Service is healthy');
  });

  app.get('/ready', (_req, res) => {
    sendSuccess(res, { status: 'ready' }, 'Service is ready');
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'CrisisOps API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );

  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  const apiRouter = express.Router();

  apiRouter.use('/auth', authRoutes);
  
  // High-security routes require email verification
  apiRouter.use('/users', authenticate, isVerified, usersRoutes);
  apiRouter.use('/organizations', authenticate, isVerified, organizationsRoutes);
  apiRouter.use('/incidents', authenticate, isVerified, incidentsRoutes);

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
