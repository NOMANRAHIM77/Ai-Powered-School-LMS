import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/apiHelpers';
import { User, UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: UserRole;
    name: string;
    email: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      _id: string;
      role: UserRole;
      name: string;
      email: string;
      sessionVersion?: number;
    };

    const user = await User.findById(decoded._id).select('isActive role name email sessionVersion');
    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or inactive');
    }
    if ((decoded.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) throw new ApiError(401, 'Session has expired');

    req.user = { _id: user._id.toString(), role: user.role, name: user.name, email: user.email };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Not authenticated'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
};
