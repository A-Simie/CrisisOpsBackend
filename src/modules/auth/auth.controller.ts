import { Request as ExRequest, Response as ExResponse } from 'express';
import passport from 'passport';
import { env, isProduction } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { uploadImageFromBuffer } from '../../utils/cloudinary.util.js';
import { logger } from '../../utils/logger.util.js';
import { authService } from './auth.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response.util.js';
import { asyncHandler } from '../../utils/async-handler.util.js';
import { NotFoundError, TooManyRequestsError } from '../../utils/errors.js';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
  SetPasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  CheckEmailInput,
} from './auth.schema.js';

export const checkEmail = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const { email } = req.body as CheckEmailInput;
  const emailKey = email.toLowerCase();

  // Check for account lockout
  const isLocked = await redis.get(REDIS_KEYS.authLockout(emailKey));
  if (isLocked) {
    throw new TooManyRequestsError('Too many failed login attempts for this account. It has been locked for 1 hour for your security.');
  }

  const exists = await authService.checkUserExists(emailKey);

  if (!exists) {
    throw new NotFoundError('Account not found. Please register first.');
  }

  sendSuccess(res, { exists: true }, 'Account found');
});

/**
 * Utility for standardizing cookie security attributes
 */
const setAuthCookies = (res: ExResponse, accessToken: string, refreshToken: string) => {
  // Access Token Cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax', // Lax provides a good balance of security and UX
    maxAge: 15 * 60 * 1000, // 15 minutes (match JWT expiry)
    path: '/api', // Restrict scope to API routes
  });

  // Refresh Token Cookie (Scoping this to the auth path is safer)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (match JWT expiry)
    path: '/api/v1/auth',
  });
};

const clearAuthCookies = (res: ExResponse) => {
  res.clearCookie('accessToken', { path: '/api' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
};

export const register = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as RegisterInput;
  const result = await authService.register(input);
  
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  
  sendCreated(res, {
    user: result.user,
  }, 'Registration successful');
});

export const login = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as LoginInput;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  const result = await authService.login(input, ipAddress, userAgent);

  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

  sendSuccess(res, {
    user: result.user,
  }, 'Login successful');
});

export const verifyEmail = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as VerifyEmailInput;
  const userId = req.user?.id;

  const result = await authService.verifyEmail(input, userId);

  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

  sendSuccess(res, {
    user: result.user,
  }, 'Email verified successfully');
});

export const resendVerification = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as ResendVerificationInput;
  await authService.resendVerification(input);
  sendSuccess(res, null, 'Verification code sent. Please check your inbox.');
});

export const forgotPassword = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as ForgotPasswordInput;
  await authService.forgotPassword(input);
  sendSuccess(res, null, 'Password reset instructions sent. Please check your email.');
});

export const resetPassword = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as ResetPasswordInput;
  await authService.resetPassword(input);
  sendSuccess(res, null, 'Password reset successful');
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

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  sendSuccess(res, null, 'Token refreshed');
});

export const logout = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user?.id;
  const tokenId = req.user?.tokenId;

  if (userId && tokenId) {
    await authService.logout(userId, tokenId);
  }

  clearAuthCookies(res);

  sendNoContent(res);
});

export const logoutAllDevices = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user?.id;
  const tokenId = req.user?.tokenId;

  if (userId && tokenId) {
    await authService.logoutAllDevices(userId, tokenId);
  }

  clearAuthCookies(res);

  sendSuccess(res, null, 'Logged out from all devices');
});

export const changePassword = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user!.id;
  const tokenId = req.user!.tokenId;
  const input = req.body as ChangePasswordInput;

  await authService.changePassword(userId, input, tokenId);

  clearAuthCookies(res);

  sendSuccess(res, null, 'Password changed successfully. Please login again.');
});

export const setPassword = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user!.id;
  const tokenId = req.user!.tokenId;
  const input = req.body as SetPasswordInput;

  await authService.linkPassword(userId, input, tokenId);

  clearAuthCookies(res);

  sendSuccess(res, null, 'Password set successfully. You can now login with your email and password.');
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
    isEmailVerified: user.isEmailVerified,
    authMethods: user.authMethods,
    createdAt: user.createdAt,
  },);
});

export const googleAuth = asyncHandler(async (req: ExRequest, res: ExResponse, next: Function) => {
  const from = req.query.from === 'admin' ? 'admin' : 'user';
  const action = req.query.action === 'signup' ? 'signup' : 'login';

  res.cookie('oauth_from', from, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
    path: '/',
  });

  res.cookie('oauth_action', action, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
    path: '/',
  });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
});

export const googleCallback = asyncHandler(async (req: ExRequest, res: ExResponse, next: Function) => {
  passport.authenticate('google', { session: false }, async (err: Error | null, googleUser: any, info: any) => {
    const from = req.cookies?.oauth_from === 'admin' ? 'admin' : 'user';
    res.clearCookie('oauth_from', { path: '/' });
    res.clearCookie('oauth_action', { path: '/' });

    const targetUrl = from === 'admin' ? env.ADMIN_FRONTEND_URL : env.USER_FRONTEND_URL;
    const fallbackUrl = targetUrl || env.FRONTEND_URL;

    if (err || !googleUser) {
      const errorMessage = err?.message || info?.message || 'Google authentication failed';
      logger.error('Google Auth Failed', { error: errorMessage });
      return res.redirect(`${fallbackUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`);
    }

    try {
      if (from === 'admin' && googleUser.role === 'CITIZEN') {
        return res.redirect(`${fallbackUrl}/auth/error?message=${encodeURIComponent('Access denied: Insufficient permissions for admin portal')}`);
      }

      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];
      const result = await authService.googleLogin(googleUser, ipAddress, userAgent);

      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

      const redirectUrl = new URL('/auth/callback', fallbackUrl);
      redirectUrl.searchParams.set('accessToken', result.tokens.accessToken);
      redirectUrl.searchParams.set('isNewUser', googleUser.isNewUser ? 'true' : 'false');

      logger.info(`[OAuth Redirect] Role: ${googleUser.role}, From: ${from} -> ${redirectUrl.toString()}`);
      return res.redirect(redirectUrl.toString());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      logger.error('Google Auth Processing Error', { error: errorMessage });
      return res.redirect(`${fallbackUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`);
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
      isEmailVerified: true,
      passwordHash: true,
      googleId: true,
      createdAt: true,
    },
  });

  const userResponse = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    profilePicture: user.profilePicture,
    role: user.role,
    orgId: user.orgId,
    isEmailVerified: user.isEmailVerified,
    authMethods: [
      ...(user.passwordHash ? ['password'] : []),
      ...(user.googleId ? ['google'] : []),
    ],
    createdAt: user.createdAt,
  };

  sendSuccess(res, userResponse, 'Profile updated successfully');
});

