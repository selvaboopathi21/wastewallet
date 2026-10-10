// Role-based Access Control Middleware in TypeScript
import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import { UserRole } from '../types';

export const restrictTo = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Please sign in to access this resource.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Access denied: role '${req.user.role}' is not authorized for this action.`)
      );
    }

    next();
  };
};

export default {
  restrictTo,
};
