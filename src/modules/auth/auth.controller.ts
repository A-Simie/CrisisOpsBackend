import { Request as ExRequest, Response as ExResponse } from 'express';
import passport from 'passport';
import { env, isProduction } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { uploadImageFromBuffer } from '../../utils/cloudinary.util.js';
import { logger } from '../../utils/logger.util.js';
import { authService } from './auth.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.util.js';
import { asyncHandler } from '../../utils/async-handler.util.js';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
} from './auth.schema.js';

export const register = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as RegisterInput;
  const result = await authService.register(input);
  sendCreated(res, result, 'Registration successful');
});

export const login = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as LoginInput;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  const result = await authService.login(input, ipAddress, userAgent);

  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  sendSuccess(res, {
    user: result.user,
    accessToken: result.tokens.accessToken,
  }, 'Login successful');
});

export const refreshToken = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const cookieToken = req.cookies?.refreshToken as string | undefined;
  const bodyToken = (req.body as RefreshTokenInput).refreshToken;

  const token = cookieToken ?? bodyToken;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Refresh token required',
      error: { code: 'REFRESH_TOKEN_REQUIRED' },
    });
    return;
  }

  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  const tokens = await authService.refreshTokens(token, ipAddress, userAgent);

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
});

export const logout = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user?.id;
  const tokenId = req.user?.tokenId;

  if (userId && tokenId) {
    await authService.logout(userId, tokenId);
  }

  res.clearCookie('refreshToken', { path: '/api/v1/auth' });

  sendNoContent(res);
});

export const logoutAllDevices = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user?.id;
  const tokenId = req.user?.tokenId;

  if (userId && tokenId) {
    await authService.logoutAllDevices(userId, tokenId);
  }

  res.clearCookie('refreshToken', { path: '/api/v1/auth' });

  sendSuccess(res, null, 'Logged out from all devices');
});

export const changePassword = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user!.id;
  const tokenId = req.user!.tokenId;
  const input = req.body as ChangePasswordInput;

  await authService.changePassword(userId, input, tokenId);

  res.clearCookie('refreshToken', { path: '/api/v1/auth' });

  sendSuccess(res, null, 'Password changed successfully. Please login again.');
});

export const me = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const user = req.user!;
  sendSuccess(res, {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    profilePicture: user.profilePicture,
    role: user.role,
    orgId: user.orgId,
    permissions: user.permissions,
    createdAt: user.createdAt,
  }, 'User profile retrieved');
});

export const googleAuth = asyncHandler(async (req: ExRequest, res: ExResponse, next: Function) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
});

export const googleCallback = asyncHandler(async (req: ExRequest, res: ExResponse, next: Function) => {
  passport.authenticate('google', { session: false }, async (err: Error | null, googleUser: any) => {
    if (err || !googleUser) {
      const errorMessage = err?.message || 'Google authentication failed';
      logger.error('Google Auth Failed', { error: errorMessage });
      return res.redirect(`${env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(errorMessage)}`);
    }

    try {
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const result = await authService.googleLogin(googleUser, ipAddress, userAgent);

      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
      redirectUrl.searchParams.set('accessToken', result.tokens.accessToken);
      redirectUrl.searchParams.set('isNewUser', googleUser.isNewUser ? 'true' : 'false');

      logger.info(`Google Login Successful. Redirecting to: ${redirectUrl.toString()}`);
      return res.redirect(redirectUrl.toString());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      logger.error('Google Auth Processing Error', { error: errorMessage });
      return res.redirect(`${env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(errorMessage)}`);
    }
  })(req, res, next);
});

export const updateProfile = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user!.id;
  const input = req.body as { firstName?: string; lastName?: string; phone?: string };
  
  let profilePictureUrl: string | undefined;
  
  // Handle file upload via multer
  const file = req.file;
  if (file) {
    const result = await uploadImageFromBuffer(file.buffer, file.mimetype, 'profile-pictures');
    profilePictureUrl = result.url;
  }
  
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.firstName && { firstName: input.firstName }),
      ...(input.lastName && { lastName: input.lastName }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(profilePictureUrl && { profilePicture: profilePictureUrl }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      profilePicture: true,
      role: true,
      orgId: true,
      createdAt: true,
    },
  });
  
  sendSuccess(res, user, 'Profile updated successfully');
});

