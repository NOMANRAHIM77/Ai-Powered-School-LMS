import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { ApiError, ApiResponse, asyncHandler } from '../utils/apiHelpers';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateResetToken, hashRefreshToken } from '../utils/tokens';
import { sendEmail, passwordResetEmailHtml } from '../services/email';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = z.object({ email: z.string().email().max(254), password: z.string().min(1) }).safeParse(req.body);
  if (!input.success) throw new ApiError(400, 'A valid email and password are required');
  const { email, password } = input.data;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +refreshTokens');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const payload = { _id: user._id.toString(), role: user.role, name: user.name, email: user.email, sessionVersion: user.sessionVersion ?? 0 };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshTokens = [...(user.refreshTokens || []).filter(t => /^[a-f0-9]{64}$/.test(t)).slice(-4), hashRefreshToken(refreshToken)];
  user.lastLogin = new Date();
  await user.save();

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json(
    new ApiResponse(200, {
      accessToken,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    }, 'Login successful')
  );
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) throw new ApiError(401, 'No refresh token');

  let decoded;
  try { decoded = verifyRefreshToken(token); } catch { throw new ApiError(401, 'Invalid or expired refresh token'); }
  const user = await User.findById(decoded._id).select('+refreshTokens');

  const tokenHash = hashRefreshToken(token);
  // Previously issued tokens were stored in plaintext; allow one rotation into hashed storage.
  const storedToken = user?.refreshTokens?.includes(tokenHash) ? tokenHash : token;
  if (!user || !user.isActive || !user.refreshTokens?.includes(storedToken)) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const payload = { _id: user._id.toString(), role: user.role, name: user.name, email: user.email, sessionVersion: user.sessionVersion ?? 0 };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  const updated = await User.updateOne(
    { _id: user._id, isActive: true, refreshTokens: storedToken },
    [{ $set: { refreshTokens: { $concatArrays: [{ $filter: { input: '$refreshTokens', as: 'item', cond: { $ne: ['$$item', storedToken] } } }, [hashRefreshToken(newRefreshToken)]] } } }],
  );
  if (!updated.modifiedCount) throw new ApiError(401, 'Refresh token already used');

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json(new ApiResponse(200, { accessToken: newAccessToken }, 'Token refreshed'));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (token) {
    let decoded;
    try { decoded = verifyRefreshToken(token); } catch { /* Invalid or expired tokens are cleared. */ }
    if (decoded) {
      const user = await User.findById(decoded._id).select('+refreshTokens');
      if (user) await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: { $in: [hashRefreshToken(token), token] } } });
    }
  }
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'strict',
  });
  res.json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = z.object({ email: z.string().email().max(254) }).safeParse(req.body);
  if (!input.success) throw new ApiError(400, 'A valid email is required');
  const { email } = input.data;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetToken +passwordResetExpires');
  if (!user) {
    // Don't reveal if email exists
    res.json(new ApiResponse(200, null, 'If an account exists, a reset email has been sent'));
    return;
  }

  const resetToken = generateResetToken();
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset - School LMS',
      html: passwordResetEmailHtml(user.name, resetUrl),
    });
    res.json(new ApiResponse(200, null, 'If an account exists, a reset email has been sent'));
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    console.error('Password reset email could not be sent');
    res.json(new ApiResponse(200, null, 'If an account exists, a reset email has been sent'));
  }
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i), password: z.string().min(1) }).safeParse(req.body);
  if (!input.success) throw new ApiError(400, 'A valid token and a password are required');
  const { token, password } = input.data;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordHash +passwordResetToken +passwordResetExpires +refreshTokens');

  if (!user) throw new ApiError(400, 'Invalid or expired reset token');

  user.passwordHash = password;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [];
  await user.save();

  res.json(new ApiResponse(200, null, 'Password reset successfully'));
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json(new ApiResponse(200, user));
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) throw new ApiError(400, 'Both passwords are required');

  const user = await User.findById(req.user?._id).select('+passwordHash');
  if (!user) throw new ApiError(404, 'User not found');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(400, 'Current password is incorrect');

  user.passwordHash = newPassword;
  user.sessionVersion = (user.sessionVersion ?? 0) + 1;
  user.refreshTokens = [];
  await user.save();

  res.json(new ApiResponse(200, null, 'Password changed successfully'));
});
