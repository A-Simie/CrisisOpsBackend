import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { v4 as uuidv4 } from 'uuid';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  orgId: string | null;
  permissions: string[];
  tokenId: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  familyId: string;
}

const decodeBase64Key = (base64Key: string): string => {
  try {
    return Buffer.from(base64Key, 'base64').toString('utf-8');
  } catch {
    return base64Key;
  }
};

const getAccessPrivateKey = (): string => decodeBase64Key(env.JWT_ACCESS_PRIVATE_KEY);
const getAccessPublicKey = (): string => decodeBase64Key(env.JWT_ACCESS_PUBLIC_KEY);
const getRefreshPrivateKey = (): string => decodeBase64Key(env.JWT_REFRESH_PRIVATE_KEY);
const getRefreshPublicKey = (): string => decodeBase64Key(env.JWT_REFRESH_PUBLIC_KEY);

const parseExpiry = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 900;

  const value = parseInt(match[1] ?? '0', 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
};

export const generateAccessToken = (payload: Omit<AccessTokenPayload, 'tokenId'>): string => {
  const tokenId = uuidv4();
  const fullPayload: AccessTokenPayload = { ...payload, tokenId };

  const options: SignOptions = {
    algorithm: 'RS256',
    expiresIn: parseExpiry(env.JWT_ACCESS_EXPIRY),
    issuer: 'crisisops',
    audience: 'crisisops-api',
  };

  return jwt.sign(fullPayload, getAccessPrivateKey(), options);
};

export const generateRefreshToken = (userId: string, familyId?: string): { token: string; payload: RefreshTokenPayload } => {
  const tokenId = uuidv4();
  const family = familyId ?? uuidv4();

  const payload: RefreshTokenPayload = {
    sub: userId,
    tokenId,
    familyId: family,
  };

  const options: SignOptions = {
    algorithm: 'RS256',
    expiresIn: parseExpiry(env.JWT_REFRESH_EXPIRY),
    issuer: 'crisisops',
    audience: 'crisisops-refresh',
  };

  const token = jwt.sign(payload, getRefreshPrivateKey(), options);
  return { token, payload };
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, getAccessPublicKey(), {
    algorithms: ['RS256'],
    issuer: 'crisisops',
    audience: 'crisisops-api',
  }) as JwtPayload & AccessTokenPayload;

  return {
    sub: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    orgId: decoded.orgId,
    permissions: decoded.permissions,
    tokenId: decoded.tokenId,
  };
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, getRefreshPublicKey(), {
    algorithms: ['RS256'],
    issuer: 'crisisops',
    audience: 'crisisops-refresh',
  }) as JwtPayload & RefreshTokenPayload;

  return {
    sub: decoded.sub,
    tokenId: decoded.tokenId,
    familyId: decoded.familyId,
  };
};

export const decodeToken = <T>(token: string): T | null => {
  try {
    return jwt.decode(token) as T;
  } catch {
    return null;
  }
};

export const getTokenExpiry = (token: string): Date | null => {
  const decoded = jwt.decode(token) as JwtPayload | null;
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000);
};
