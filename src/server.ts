import 'dotenv/config';
import { createServer } from 'http';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { disconnectRedis } from './config/redis.js';
import { logger } from './utils/logger.util.js';

const server = createServer(app);

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, starting graceful shutdown`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await disconnectDatabase();
      logger.info('Database connection closed');

      await disconnectRedis();
      logger.info('Redis connection closed');

      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
};

const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting CrisisOps API server...');

    await connectDatabase();
    logger.info('Database connected');

    logger.info('Redis connecting...');

    server.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`);
      logger.info(`API Documentation: http://localhost:${env.PORT}/api/docs`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Failed to start server', { error: errorMessage, stack: errorStack });
    process.exit(1);
  }
};

startServer();
