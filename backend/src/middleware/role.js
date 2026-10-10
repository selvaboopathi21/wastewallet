// Role-based Access Control Middleware
const ApiError = require('../utils/ApiError');

/**
 * Restricts access to specified roles.
 * Example usage: restrictTo('admin', 'store_staff')
 */
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user must be populated by auth middleware first
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

module.exports = {
  restrictTo,
};
