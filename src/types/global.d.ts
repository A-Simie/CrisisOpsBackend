export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      DATABASE_URL: string;
      REDIS_URL: string;
      JWT_ACCESS_PRIVATE_KEY: string;
      JWT_ACCESS_PUBLIC_KEY: string;
      JWT_REFRESH_PRIVATE_KEY: string;
      JWT_REFRESH_PUBLIC_KEY: string;
      JWT_ACCESS_EXPIRY: string;
      JWT_REFRESH_EXPIRY: string;
      BCRYPT_ROUNDS: string;
      RATE_LIMIT_WINDOW_MS: string;
      RATE_LIMIT_MAX_REQUESTS: string;
      RATE_LIMIT_AUTH_MAX: string;
      ALLOWED_ORIGINS: string;
    }
  }
}
