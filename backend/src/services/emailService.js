const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

let transporter;

function isMailConfigured() {
  return Boolean(env.mail.host && env.mail.user && env.mail.pass);
}

function saveDevelopmentResetLink({ to, resetLink }) {
  const logDirectory = path.join(__dirname, '../../tmp');
  const logFilePath = path.join(logDirectory, 'password-reset-links.log');
  const logLine = `[${new Date().toISOString()}] ${to} -> ${resetLink}${'\n'}`;

  fs.mkdirSync(logDirectory, { recursive: true });
  fs.appendFileSync(logFilePath, logLine, 'utf8');
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!isMailConfigured()) {
    throw new ApiError(
      500,
      'Email service is not configured. Add SMTP settings in backend/.env.',
    );
  }

  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: {
      user: env.mail.user,
      pass: env.mail.pass,
    },
  });

  return transporter;
}

function buildResetPasswordTemplate({ name, resetLink }) {
  return `
    <div style="margin:0;padding:32px;background:#f6f2ff;font-family:Segoe UI,Arial,sans-serif;color:#2b2440;">
      <div style="max-width:620px;margin:0 auto;background:rgba(255,255,255,0.92);border:1px solid rgba(147,128,200,0.18);border-radius:24px;padding:36px;box-shadow:0 20px 40px rgba(167,137,229,0.14);">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#7d69c9;letter-spacing:0.08em;text-transform:uppercase;">TaskFlow Security</p>
        <h1 style="margin:0 0 18px;font-size:28px;color:#241d39;">Reset Your TaskFlow Password</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi ${name || 'there'},</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
          We received a request to reset your TaskFlow password. Click the button below to choose a new password.
        </p>
        <div style="margin:28px 0;">
          <a href="${resetLink}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(90deg,#76d7ff,#b26bff);color:#ffffff;text-decoration:none;font-weight:700;">
            Reset Password
          </a>
        </div>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#5b5470;">
          This link expires in 15 minutes for your security.
        </p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#5b5470;">
          If you did not request this, you can safely ignore this email. Your existing password will remain unchanged.
        </p>
        <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#7a738d;">
          If the button does not work, copy and paste this link into your browser:<br />
          <a href="${resetLink}" style="color:#6c63ff;text-decoration:none;">${resetLink}</a>
        </p>
      </div>
    </div>
  `;
}

async function sendPasswordResetEmail({ to, name, resetLink }) {
  if (!isMailConfigured()) {
    if (env.nodeEnv === 'production') {
      throw new ApiError(
        500,
        'Email service is not configured. Add SMTP settings in backend/.env.',
      );
    }

    saveDevelopmentResetLink({ to, resetLink });
    return {
      delivery: 'development',
      previewUrl: resetLink,
    };
  }

  try {
    await getTransporter().sendMail({
      from: env.mail.from,
      to,
      subject: 'Reset Your TaskFlow Password',
      html: buildResetPasswordTemplate({ name, resetLink }),
    });

    return {
      delivery: 'smtp',
      previewUrl: null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(500, 'Unable to send reset email right now');
  }
}

module.exports = {
  isMailConfigured,
  sendPasswordResetEmail,
};
