import nodemailer from "nodemailer";
import { env } from '../config/env.js';

let mailer: { transporter: nodemailer.Transporter; from: string } | null = null;

/**
 * Initialize the mailer transporter
 */
export async function initMailer() {
  const host = env.SMTP_HOST;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    console.log("Mailer NOT configured properly");
    return null;
  }

  const port = env.SMTP_PORT;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporter.verify(); 
    console.log(`Mailer ready on ${host}:${port}`);
    mailer = { transporter, from };
  } catch (err) {
    console.log("Mailer connection failed:", err);
  }

  return mailer;
}

/**
 * Get the initialized mailer instance
 */
export function getMailer() {
  return mailer;
}
