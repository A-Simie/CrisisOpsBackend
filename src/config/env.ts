import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  JWT_ACCESS_PRIVATE_KEY: z.string().min(1),
  JWT_ACCESS_PUBLIC_KEY: z.string().min(1),
  JWT_REFRESH_PRIVATE_KEY: z.string().min(1),
  JWT_REFRESH_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  BCRYPT_ROUNDS: z.coerce.number().min(10).max(14).default(12),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(50),

  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  OSM_USER_AGENT: z.string().default('CrisisOps/1.0 (ichbineinsimie@gmail.com)'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3000/api/v1/auth/google/callback'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  ADMIN_FRONTEND_URL: z.string().default('http://localhost:5173'),
  USER_FRONTEND_URL: z.string().default('http://localhost:5173'),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('CrisisOps <onboarding@resend.dev>'),

  FCM_SERVER_KEY: z.string().optional(),

  GEO_BOUNDS_MIN_LAT: z.coerce.number().default(4.0),
  GEO_BOUNDS_MAX_LAT: z.coerce.number().default(14.0),
  GEO_BOUNDS_MIN_LNG: z.coerce.number().default(2.5),
  GEO_BOUNDS_MAX_LNG: z.coerce.number().default(15.0),

  CRYPTIC_APP_SECRET: z.string().min(1),
  CRYPTIC_SALT_KEY: z.string().min(1),

  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().default(2555),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parseEnv = (): z.infer<typeof envSchema> => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.format();
    const errors = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => {
        const errorValue = value as { _errors?: string[] };
        return `  ${key}: ${errorValue._errors?.join(', ') ?? 'Invalid'}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return parsed.data;
};

export const env = parseEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
