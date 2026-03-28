import { randomInt } from 'crypto';
import { redis, REDIS_KEYS, REDIS_TTL } from '../config/redis.js';
import { logger } from './logger.util.js';

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = (): string => {
  return randomInt(100000, 999999).toString();
};

/**
 * Store verification OTP in Redis
 */
export const storeVerificationOTP = async (email: string, otp: string): Promise<void> => {
  const key = REDIS_KEYS.otpVerify(email);
  await redis.set(key, otp, 'EX', REDIS_TTL.otp);
};

/**
 * Verify verification OTP from Redis
 */
export const verifyVerificationOTP = async (email: string, otp: string): Promise<boolean> => {
  const key = REDIS_KEYS.otpVerify(email);
  const storedOtp = await redis.get(key);
  
  if (storedOtp === otp) {
    await redis.del(key);
    return true;
  }
  
  return false;
};

/**
 * Store reset password OTP in Redis
 */
export const storeResetOTP = async (email: string, otp: string): Promise<void> => {
  const key = REDIS_KEYS.otpReset(email);
  await redis.set(key, otp, 'EX', REDIS_TTL.otp);
};

/**
 * Verify reset password OTP from Redis
 */
export const verifyResetOTP = async (email: string, otp: string): Promise<boolean> => {
  const key = REDIS_KEYS.otpReset(email);
  const storedOtp = await redis.get(key);
  
  if (storedOtp === otp) {
    await redis.del(key);
    return true;
  }
  
  return false;
};
