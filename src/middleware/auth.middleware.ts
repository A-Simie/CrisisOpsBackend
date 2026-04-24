import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { redis, REDIS_KEYS } from '../config/redis.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { prisma } from '../config/database.js';
import { UserRole } from '@prisma/client';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appSource = req.headers['x-app-source'] === 'admin' ? 'admin' : 'user';
    const prefix = appSource === 'admin' ? 'admin_' : 'user_';
    const cookieToken = req.cookies?.[`${prefix}accessToken`] as string | undefined;
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (cookieToken) {
      token = cookieToken;
    } else if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      // Fallback: check both cookies if no header is present
      token = req.cookies?.admin_accessToken || req.cookies?.user_accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Missing or invalid authentication');
    }

    const payload = verifyAccessToken(token);

    const isBlacklisted = await redis.exists(REDIS_KEYS.accessTokenBlacklist(payload.tokenId));

    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        role: true,
        orgId: true,
        permissions: true,
        isActive: true,
        isEmailVerified: true,
        passwordHash: true,
        googleId: true,
        passwordChangedAt: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profilePicture: user.profilePicture,
      role: user.role as UserRole,
      orgId: user.orgId,
      permissions: user.permissions,
      isEmailVerified: user.isEmailVerified,
      authMethods: [
        ...(user.passwordHash ? ['password'] : []),
        ...(user.googleId ? ['google'] : []),
      ],
      tokenId: payload.tokenId,
      createdAt: user.createdAt,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const appSource = req.headers['x-app-source'] === 'admin' ? 'admin' : 'user';
    const prefix = appSource === 'admin' ? 'admin_' : 'user_';
    const cookieToken = req.cookies?.[`${prefix}accessToken`] as string | undefined;
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (cookieToken) {
      token = cookieToken;
    } else if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      // Fallback: check both cookies
      token = req.cookies?.admin_accessToken || req.cookies?.user_accessToken;
    }

    if (!token) {
      next();
      return;
    }

    const payload = verifyAccessToken(token);

    const isBlacklisted = await redis.exists(REDIS_KEYS.accessTokenBlacklist(payload.tokenId));

    if (isBlacklisted) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profilePicture: true,
        role: true,
        orgId: true,
        permissions: true,
        isActive: true,
        isEmailVerified: true,
        passwordHash: true,
        googleId: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      next();
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      profilePicture: user.profilePicture,
      role: user.role as UserRole,
      orgId: user.orgId,
      permissions: user.permissions,
      isEmailVerified: user.isEmailVerified,
      authMethods: [
        ...(user.passwordHash ? ['password'] : []),
        ...(user.googleId ? ['google'] : []),
      ],
      tokenId: payload.tokenId,
      createdAt: user.createdAt,
    };

    next();
  } catch {
    next();
  }
};

/**
 * Middleware to check if user's email is verified
 */
export const isVerified = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user?.isEmailVerified) {
    next(new ForbiddenError('Email verification required to access this feature'));
    return;
  }
  next();
};
