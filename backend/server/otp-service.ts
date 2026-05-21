import { randomInt } from "crypto";
import nodemailer from "nodemailer";

interface OtpEntry {
  code: string;
  expiresAt: number;
  credential: string;
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

const MAX_OTP_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 3;

function generateOtp(): string {
  return randomInt(100000, 999999).toString();
}

function normalizeCredential(credential: string): string {
  return credential.toLowerCase().trim();
}

function isRateLimited(key: string): boolean {
  const entry = rateLimitStore.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.delete(key);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX;
}

function recordRateLimit(key: string): void {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(key, { count: 1, windowStart: Date.now() });
  } else {
    entry.count++;
  }
}

export function createOtp(credential: string): { code: string; rateLimited: boolean } {
  const key = normalizeCredential(credential);
  if (isRateLimited(key)) {
    return { code: "", rateLimited: true };
  }
  recordRateLimit(key);
  const code = generateOtp();
  otpStore.set(key, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    credential: key,
    attempts: 0,
  });
  return { code, rateLimited: false };
}

export function verifyOtp(credential: string, code: string): { valid: boolean; expired: boolean; tooManyAttempts: boolean } {
  const key = normalizeCredential(credential);
  const entry = otpStore.get(key);
  if (!entry) return { valid: false, expired: true, tooManyAttempts: false };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return { valid: false, expired: true, tooManyAttempts: false };
  }
  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(key);
    return { valid: false, expired: false, tooManyAttempts: true };
  }
  entry.attempts++;
  if (entry.code !== code.trim()) {
    return { valid: false, expired: false, tooManyAttempts: false };
  }
  otpStore.delete(key);
  return { valid: true, expired: false, tooManyAttempts: false };
}

function createEmailTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendOtpByEmail(email: string, code: string): Promise<boolean> {
  const transporter = createEmailTransport();
  if (!transporter) {
    // Always log when SMTP is not configured — check server logs to retrieve code
    console.log(`[OTP] No SMTP configured. Code for ${email}: ${code}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your PokeScan Verification Code",
      text: `Your PokeScan verification code is: ${code}\n\nThis code expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #CC0000;">PokeScan Verification</h2>
          <p>Your one-time verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #CC0000; padding: 16px; background: #FFF0F0; border-radius: 8px; text-align: center;">${code}</div>
          <p style="color: #666; font-size: 13px; margin-top: 16px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    // Log the code so logins aren't completely blocked on email failure
    console.log(`[OTP] Email failed. Code for ${email}: ${code}`);
    return true;
  }
}

export async function sendOtpBySms(mobile: string, code: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    // Always log when SMS is not configured — check server logs to retrieve code
    console.log(`[OTP] No SMS configured. Code for ${mobile}: ${code}`);
    return true;
  }

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: `Your PokeScan verification code is: ${code}. Expires in 10 minutes.`,
      from: fromNumber,
      to: mobile,
    });
    return true;
  } catch (err) {
    console.error("Failed to send OTP SMS:", err);
    // Log the code so logins aren't completely blocked on SMS failure
    console.log(`[OTP] SMS failed. Code for ${mobile}: ${code}`);
    return true;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (now > entry.expiresAt) otpStore.delete(key);
  }
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);
