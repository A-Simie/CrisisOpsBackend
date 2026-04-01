import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from './logger.util.js';

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Decrypts data encrypted by the CrisisOps frontend (AES-256-GCM + PBKDF2).
 * 
 * Frontend format: Base64([IV (12 bytes) | Ciphertext (...) | AuthTag (16 bytes)])
 * Node.js crypto requires the auth tag to be set separately via setAuthTag().
 */
export function decryptFrontendData(encryptedBase64: string): string {
  const secret = env.CRYPTIC_APP_SECRET;
  const salt = Buffer.from(env.CRYPTIC_SALT_KEY, 'base64');

  const combined = Buffer.from(encryptedBase64, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('Encrypted payload too short');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const key = crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Checks if a string looks like a Base64-encoded encrypted payload.
 * Encrypted payloads are at minimum IV(12) + Tag(16) + 1 byte = 29 bytes,
 * which encodes to ~40+ Base64 characters.
 */
export function isEncryptedPayload(value: string): boolean {
  if (!value || value.length < 40) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(value);
}

/**
 * Attempts to decrypt a field value. Returns the original value if
 * it doesn't appear encrypted or if decryption fails.
 */
export function tryDecrypt(value: string | null | undefined): string | null {
  if (!value) return value ?? null;

  if (!isEncryptedPayload(value)) return value;

  try {
    return decryptFrontendData(value);
  } catch {
    logger.debug('Field is not encrypted or uses a different key, storing as-is');
    return value;
  }
}
