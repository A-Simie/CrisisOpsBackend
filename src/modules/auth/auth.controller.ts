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
  SetPasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schema.js';



/**
 * Utility for standardizing cookie security attributes
 */
const getAppSource = (req: ExRequest): 'admin' | 'user' => {
  const source = req.headers['x-app-source'] || req.cookies?.oauth_from;
  return source === 'admin' ? 'admin' : 'user';
};

const setAuthCookies = (res: ExResponse, accessToken: string, refreshToken: string, appSource: 'admin' | 'user' = 'user') => {
  const cookieOptions: any = {
    httpOnly: true,
    secure: isProduction, // Must be true for SameSite: 'none'
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-site (Vercel -> Render)
    path: '/',
  };

  const prefix = appSource === 'admin' ? 'admin_' : 'user_';

  // Access Token Cookie
  res.cookie(`${prefix}accessToken`, accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes (match JWT expiry)
  });

  // Refresh Token Cookie
  res.cookie(`${prefix}refreshToken`, refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/api/v1/auth',
  });
};

const clearAuthCookies = (res: ExResponse, appSource: 'admin' | 'user' = 'user') => {
  const prefix = appSource === 'admin' ? 'admin_' : 'user_';
  res.clearCookie(`${prefix}accessToken`, { path: '/' });
  res.clearCookie(`${prefix}refreshToken`, { path: '/api/v1/auth' });
};

export const register = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as RegisterInput;
  const result = await authService.register(input);
  const appSource = getAppSource(req);

  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken, appSource);

  sendCreated(res, {
    user: result.user,
  }, 'Registration successful');
});

export const login = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as LoginInput;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  const result = await authService.login(input, ipAddress, userAgent);
  const appSource = getAppSource(req);

  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken, appSource);

  sendSuccess(res, {
    user: result.user,
  }, 'Login successful');
});

export const verifyEmail = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const input = req.body as VerifyEmailInput;
  const userId = req.user?.id;

  const result = await authService.verifyEmail(input, userId);
  const appSource = getAppSource(req);

  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken, appSource);

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
  const appSourceHeader = req.headers['x-app-source'];
  let appSource = getAppSource(req);
  const prefix = appSource === 'admin' ? 'admin_' : 'user_';
  
  let cookieToken = req.cookies?.[`${prefix}refreshToken`] as string | undefined;
  const bodyToken = (req.body as RefreshTokenInput).refreshToken;

  // Fallback if header is missing and preferred cookie not found
  if (!appSourceHeader && !cookieToken && !bodyToken) {
    if (req.cookies?.admin_refreshToken) {
      cookieToken = req.cookies.admin_refreshToken;
      appSource = 'admin';
    } else if (req.cookies?.user_refreshToken) {
      cookieToken = req.cookies.user_refreshToken;
      appSource = 'user';
    }
  }

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

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken, appSource);

  sendSuccess(res, null, 'Token refreshed');
});

export const logout = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user?.id;
  const tokenId = req.user?.tokenId;

  if (userId && tokenId) {
    await authService.logout(userId, tokenId);
  }

  const appSource = getAppSource(req);
  clearAuthCookies(res, appSource);

  sendNoContent(res);
});

export const logoutAllDevices = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user?.id;
  const tokenId = req.user?.tokenId;

  if (userId && tokenId) {
    await authService.logoutAllDevices(userId, tokenId);
  }

  const appSource = getAppSource(req);
  clearAuthCookies(res, appSource);

  sendSuccess(res, null, 'Logged out from all devices');
});

export const changePassword = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user!.id;
  const tokenId = req.user!.tokenId;
  const input = req.body as ChangePasswordInput;

  await authService.changePassword(userId, input, tokenId);

  const appSource = getAppSource(req);
  clearAuthCookies(res, appSource);

  sendSuccess(res, null, 'Password changed successfully. Please login again.');
});

export const setPassword = asyncHandler(async (req: ExRequest, res: ExResponse) => {
  const userId = req.user!.id;
  const tokenId = req.user!.tokenId;
  const input = req.body as SetPasswordInput;

  await authService.linkPassword(userId, input, tokenId);

  const appSource = getAppSource(req);
  clearAuthCookies(res, appSource);

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
        return res.redirect(`${fallbackUrl}/auth/error?message=${encodeURIComponent('Access denied')}`);
      }

      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];
      const result = await authService.googleLogin(googleUser, ipAddress, userAgent);

      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken, from);

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

