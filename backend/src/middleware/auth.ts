// JWT Authentication Middleware in TypeScript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import env from '../config/env';
import { IAuthTokenPayload, IUser } from '../types';

// Extend Express Request interface to include typed user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Authentication token missing. Please sign in.');
    }

    let decoded: IAuthTokenPayload;
    try {
      decoded = jwt.verify(token, env.jwtSecret) as IAuthTokenPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Session expired. Please sign in again.');
      }
      throw new ApiError(401, 'Invalid authentication token.');
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      throw new ApiError(401, 'The account belonging to this token no longer exists.');
    }

    if (currentUser.isBlocked) {
      throw new ApiError(403, 'Your account has been suspended. Please contact support.');
    }

    req.user = currentUser;
    next();
  }
);

export default authenticate;
