import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { prisma } from '../../config/database.js';
import { redis, REDIS_KEYS, REDIS_TTL } from '../../config/redis.js';
import { env } from '../../config/env.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpiry,
} from '../../utils/jwt.util.js';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors.js';
import { logger } from '../../utils/logger.util.js';
import { generateOTP, storeVerificationOTP, verifyVerificationOTP, storeResetOTP, verifyResetOTP } from '../../utils/otp.util.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/email.util.js';
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  SetPasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schema.js';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profilePicture: string | null;
  role: string;
  orgId: string | null;
  isEmailVerified: boolean;
  authMethods: string[];
  createdAt: Date;
}

interface AuthResult {
  user: UserResponse;
  tokens: AuthTokens;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: 'CITIZEN',
        permissions: [],
      },
    });

    // Generate and send verification OTP
    const otp = generateOTP();
    await storeVerificationOTP(user.email, otp);
    sendVerificationEmail(user.email, otp).catch((err) => {
      logger.error('Failed to send registration verification email', { error: err, email: user.email });
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, null, []);

    logger.info('User registered and verification OTP sent', { userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profilePicture: user.profilePicture,
        role: user.role,
        orgId: user.orgId,
        isEmailVerified: user.isEmailVerified,
        authMethods: ['password'],
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError('This account was created using Google. Please log in with Google.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.orgId,
      user.permissions,
      ipAddress,
      userAgent
    );

    logger.info('User logged in', { userId: user.id });

    return {
      user: {
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
      },
      tokens,
    };
  }

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      await this.revokeTokenFamily(payload.familyId);
      throw new UnauthorizedError('Refresh token not found - possible token reuse detected');
    }

    if (storedToken.isRevoked) {
      await this.revokeTokenFamily(payload.familyId);
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
      storedToken.user.orgId,
      storedToken.user.permissions,
      ipAddress,
      userAgent,
      payload.familyId
    );

    return tokens;
  }

  async logout(userId: string, tokenId: string): Promise<void> {
    await redis.set(
      REDIS_KEYS.accessTokenBlacklist(tokenId),
      '1',
      'EX',
      REDIS_TTL.accessToken
    );

    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    logger.info('User logged out', { userId });
  }

  async logoutAllDevices(userId: string, tokenId: string): Promise<void> {
    await redis.set(
      REDIS_KEYS.accessTokenBlacklist(tokenId),
      '1',
      'EX',
      REDIS_TTL.accessToken
    );

    const tokens = await prisma.refreshToken.findMany({
      where: { userId, isRevoked: false },
      select: { familyId: true },
    });

    const familyIds = [...new Set(tokens.map((t) => t.familyId))];

    for (const familyId of familyIds) {
      await this.revokeTokenFamily(familyId);
    }

    logger.info('User logged out from all devices', { userId });
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    tokenId: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.passwordHash) {
      throw new BadRequestError('No password set for this account. Please use set-password instead.');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      input.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    await this.logoutAllDevices(userId, tokenId);

    logger.info('User changed password', { userId });
  }

  async linkPassword(
    userId: string,
    input: SetPasswordInput,
    tokenId: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.passwordHash) {
      throw new BadRequestError('Password already set. Please use change password instead.');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    await this.logoutAllDevices(userId, tokenId);

    logger.info('User linked local password to social account', { userId });
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    orgId: string | null,
    permissions: string[],
    ipAddress?: string,
    userAgent?: string,
    familyId?: string
  ): Promise<AuthTokens> {
    const accessToken = generateAccessToken({
      sub: userId,
      email,
      role,
      orgId,
      permissions,
    });

    const { token: refreshToken, payload } = generateRefreshToken(userId, familyId);

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = getTokenExpiry(refreshToken);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        familyId: payload.familyId,
        deviceInfo: userAgent,
        ipAddress,
        expiresAt: expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async revokeTokenFamily(familyId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { familyId },
      data: { isRevoked: true },
    });

    logger.warn('Token family revoked due to potential theft', { familyId });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async googleLogin(
    googleUser: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      profilePicture: string | null;
      role: string;
      orgId: string | null;
      permissions: string[];
      createdAt: Date;
    },
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const tokens = await this.generateTokens(
      googleUser.id,
      googleUser.email,
      googleUser.role,
      googleUser.orgId,
      googleUser.permissions,
      ipAddress,
      userAgent
    );

    return {
      user: {
        id: googleUser.id,
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        phone: googleUser.phone,
        profilePicture: googleUser.profilePicture,
        role: googleUser.role,
        orgId: googleUser.orgId,
        isEmailVerified: (googleUser as any).isEmailVerified,
        authMethods: [
          ...((googleUser as any).passwordHash ? ['password'] : []),
          'google',
        ],
        createdAt: googleUser.createdAt,
      },
      tokens,
    };
  }

  async verifyEmail(input: VerifyEmailInput, userId?: string): Promise<AuthResult> {
    let email = input.email?.toLowerCase();

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundError('User not found');
      email = user.email;
    }

    if (!email) throw new BadRequestError('Email is required');

    const isValid = await verifyVerificationOTP(email, input.otp);
    if (!isValid) throw new BadRequestError('Invalid or expired verification code');

    const user = await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.orgId, user.permissions);

    logger.info('User email verified and new session generated', { email });

    return {
      user: {
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
      },
      tokens,
    };
  }

  async resendVerification(input: ResendVerificationInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      // Return success even if user doesn't exist for security
      return;
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('Email is already verified');
    }

    const otp = generateOTP();
    await storeVerificationOTP(user.email, otp);
    await sendVerificationEmail(user.email, otp);

    logger.info('Verification OTP resent', { email: user.email });
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      // Silent return for security
      return;
    }

    if (!user.isActive) {
      throw new BadRequestError('Account is deactivated');
    }

    const otp = generateOTP();
    await storeResetOTP(user.email, otp);
    await sendPasswordResetEmail(user.email, otp);

    logger.info('Password reset OTP sent', { email: user.email });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) throw new NotFoundError('User not found');

    const isValid = await verifyResetOTP(user.email, input.otp);
    if (!isValid) throw new BadRequestError('Invalid or expired reset code');

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Revoke all tokens on password reset
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    logger.info('User password reset successful', { userId: user.id });
  }
}

export const authService = new AuthService();
