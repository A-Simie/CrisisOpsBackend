import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CrisisOps API',
      version: '1.0.0',
      description: 'Mission-critical disaster response and emergency management API',
      contact: {
        name: 'CrisisOps Support',
        email: 'support@crisisops.ng',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Development server',
      },
      {
        url: 'https://api.crisisops.ng/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            requestId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                details: { type: 'object' },
              },
            },
            requestId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            nextCursor: { type: 'string', nullable: true },
            hasMore: { type: 'boolean' },
            total: { type: 'integer' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Organizations', description: 'Organization management' },
      { name: 'Incidents', description: 'Incident management' },
      { name: 'Reports', description: 'Citizen reports' },
      { name: 'Responders', description: 'Responder management' },
      { name: 'Resources', description: 'Resource management' },
      { name: 'Alerts', description: 'Public alerts' },
      { name: 'Analytics', description: 'Analytics and reporting' },
      { name: 'Audit', description: 'Audit logs' },
      { name: 'Webhooks', description: 'Webhook management' },
      { name: 'Hazards', description: 'Hazard information packs' },
      { name: 'Admin', description: 'Administrative endpoints' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.schema.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
