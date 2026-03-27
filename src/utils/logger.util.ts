import winston from 'winston';
import { env } from '../config/env.js';

const PII_PATTERNS = [
  { pattern: /password["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, replacement: 'password: [REDACTED]' },
  { pattern: /token["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, replacement: 'token: [REDACTED]' },
  { pattern: /authorization["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, replacement: 'authorization: [REDACTED]' },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{10,11}\b/g, replacement: '[PHONE]' },
];

const redactPII = (message: string): string => {
  let redacted = message;
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
};

const redactFormat = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = redactPII(info.message);
  }
  return info;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  redactFormat(),
  winston.format.errors({ stack: true }),
  env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp as string} [${level}]: ${message as string}${metaStr}`;
        })
      )
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(env.NODE_ENV === 'production'
      ? [new winston.transports.File({ filename: 'logs/exceptions.log' })]
      : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(env.NODE_ENV === 'production'
      ? [new winston.transports.File({ filename: 'logs/rejections.log' })]
      : []),
  ],
});
