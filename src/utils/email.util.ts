import { getMailer } from './mailer.js';
import { logger } from './logger.util.js';
import { env } from '../config/env.js';

/**
 * Send verification OTP email
 */

/**
 * Send verification OTP email
 */
export const sendVerificationEmail = async (email: string, otp: string): Promise<void> => {
  const subject = 'Verify your CrisisOps account';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <h1 style="margin: 0; color: #6366F1; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">
                      Crisis<span style="color: #1f2937;">Ops</span>
                    </h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; text-align: center;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 22px; font-weight: 700;">Verify your identity</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                      Thank you for joining CrisisOps. To secure your account and access all features, please use the following verification code:
                    </p>
                    <div style="background-color: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                      <span style="display: block; font-size: 36px; font-weight: 800; color: #6366F1; letter-spacing: 8px; margin-left: 8px;">${otp}</span>
                    </div>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      This code will expire in <strong>10 minutes</strong>.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 32px 40px; background-color: #f9fafb; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      Mission-Critical Response Platform
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} CrisisOps. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const mailer = getMailer();

  if (!mailer) {
    logger.warn('SMTP Mailer not initialized. OTP logged to console instead.', { email, otp });
    console.log(`\n[EMAIL FALLBACK] To: ${email}\n[OTP] ${otp}\n`);
    return;
  }

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to: email,
      subject,
      html,
    });

    logger.info('Verification email sent', { email });
  } catch (error) {
    logger.error('Failed to send verification email (Exception)', { error, email });
  }
};

/**
 * Send password reset OTP email
 */
export const sendPasswordResetEmail = async (email: string, otp: string): Promise<void> => {
  const subject = 'Reset your CrisisOps password';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <h1 style="margin: 0; color: #d32f2f; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">
                      Crisis<span style="color: #1f2937;">Ops</span>
                    </h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; text-align: center;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                      We received a request to reset your password. Use the code below to complete the process:
                    </p>
                    <div style="background-color: #fef2f2; border: 2px solid #fee2e2; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                      <span style="display: block; font-size: 36px; font-weight: 800; color: #d32f2f; letter-spacing: 8px; margin-left: 8px;">${otp}</span>
                    </div>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      If you did not request this, you can safely ignore this email. This code will expire in 10 minutes.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 32px 40px; background-color: #f9fafb; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      Mission-Critical Response Platform
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} CrisisOps. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const mailer = getMailer();

  if (!mailer) {
    logger.warn('SMTP Mailer not initialized. Reset OTP logged to console instead.', { email, otp });
    console.log(`\n[EMAIL FALLBACK - RESET] To: ${email}\n[OTP] ${otp}\n`);
    return;
  }

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to: email,
      subject,
      html,
    });

    logger.info('Password reset email sent', { email });
  } catch (error) {
    logger.error('Failed to send password reset email (Exception)', { error, email });
  }
};

/**
 * Send user invitation email
 */
export const sendInviteEmail = async (email: string, password: string, otp: string): Promise<void> => {
  const subject = 'Welcome to CrisisOps - Your Account is Ready';
  const verifyLink = `${env.ADMIN_FRONTEND_URL}/verify-email?otp=${otp}&email=${encodeURIComponent(email)}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CrisisOps</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <h1 style="margin: 0; color: #6366F1; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">
                      Crisis<span style="color: #1f2937;">Ops</span>
                    </h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; text-align: center;">
                    <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 22px; font-weight: 700;">You've been invited!</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                      An administrator has created a CrisisOps account for you. Use the temporary password below to sign in:
                    </p>
                    
                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 0 40px 24px 40px; text-align: center;">
                      <code style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 18px; color: #111827; font-weight: 600;">${password}</code>
                    </div>

                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                      To get started, please click the button below to verify your email and activate your access:
                    </p>

                    <a href="${verifyLink}" style="display: inline-block; background-color: #6366F1; color: #ffffff; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; text-decoration: none; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.2);">
                      Verify My Account
                    </a>

                    <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${verifyLink}" style="color: #6366F1; word-break: break-all;">${verifyLink}</a>
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 32px 40px; background-color: #f9fafb; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      Mission-Critical Response Platform
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} CrisisOps. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const mailer = getMailer();
  if (!mailer) {
    logger.warn('SMTP Mailer not initialized. Invitation details logged instead.', { email, password, otp });
    console.log(`\n[INVITATION FALLBACK] To: ${email}\n[PASSWORD] ${password}\n[OTP] ${otp}\n[LINK] ${verifyLink}\n`);
    return;
  }

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to: email,
      subject,
      html,
    });
    logger.info('Invitation email sent', { email });
  } catch (error) {
    logger.error('Failed to send invitation email', { error, email });
  }
};
