import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

export const passwordResetEmailHtml = (name: string, resetUrl: string): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Inter, sans-serif; background: #f8fafc; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 40px;">
    <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">Reset Your Password</h1>
    <p style="color: #475569;">Hi ${name},</p>
    <p style="color: #475569;">You requested a password reset for your School LMS account.</p>
    <a href="${resetUrl}"
       style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px;
              border-radius: 8px; text-decoration: none; margin: 24px 0; font-weight: 600;">
      Reset Password
    </a>
    <p style="color: #94a3b8; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  </div>
</body>
</html>
`;
