import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { UserRole } from '../models/User';

interface TokenPayload {
  _id: string;
  role: UserRole;
  name: string;
  email: string;
  sessionVersion?: number;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    jwtid: crypto.randomUUID(),
  });
};

export const hashRefreshToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
};

export const generateResetToken = (): string => {
  const { randomBytes } = require('crypto');
  return randomBytes(32).toString('hex');
};
