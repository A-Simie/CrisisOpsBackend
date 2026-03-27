import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, StrategyOptions } from 'passport-google-oauth20';
import { UserRole } from '@prisma/client';
import { env } from './env.js';
import { prisma } from './database.js';
import { logger } from '../utils/logger.util.js';

export interface GoogleUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profilePicture: string | null;
  googleId: string;
  role: UserRole;
  orgId: string | null;
  permissions: string[];
  tokenId: string;
  createdAt: Date;
  isNewUser: boolean;
}

export const configureGoogleAuth = (): void => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    logger.warn('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        passReqToCallback: false,
      } as StrategyOptions,
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: GoogleUser | false) => void
      ) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error('No email provided by Google'));
          }

          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { googleId: profile.id },
                { email: email.toLowerCase() },
              ],
            },
          });

          let isNewUser = false;

          const photoUrl = profile.photos?.[0]?.value;

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: email.toLowerCase(),
                googleId: profile.id,
                firstName: profile.name?.givenName || 'User',
                lastName: profile.name?.familyName || '',
                profilePicture: photoUrl,
                role: 'CITIZEN',
                permissions: [],
                isEmailVerified: true,
              },
            });
            isNewUser = true;
            logger.info('New user created via Google OAuth', { userId: user.id, email: user.email });
          } else {
            // Update Google ID if missing, and optionally update profile picture if missing
            const updateData: any = {};
            if (!user.googleId) {
              updateData.googleId = profile.id;
              updateData.isEmailVerified = true;
            }
            if (!user.profilePicture && photoUrl) {
              updateData.profilePicture = photoUrl;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.user.update({
                where: { id: user.id },
                data: updateData,
              });
              logger.info('Updated existing user with Google info', { userId: user.id });
            }
          }

          if (!user.isActive) {
            return done(new Error('Account is deactivated'));
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          const googleUser: GoogleUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            profilePicture: user.profilePicture,
            googleId: profile.id,
            role: user.role,
            orgId: user.orgId,
            permissions: user.permissions,
            tokenId: '',
            createdAt: user.createdAt,
            isNewUser,
          };

          return done(null, googleUser);
        } catch (error) {
          logger.error('Google OAuth error', { error });
          return done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: GoogleUser, done) => {
    done(null, user);
  });

  logger.info('Google OAuth strategy configured');
};

export { passport };
