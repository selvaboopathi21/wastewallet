// JWT Authentication Middleware: Validates Bearer token & attaches user to request
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { jwtSecret } = require('../config/env');

const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Read token from Authorization header (Format: Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication token missing. Please sign in.');
  }

  // 2. Verify token validity and expiration
  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }
    throw new ApiError(401, 'Invalid authentication token.');
  }

  // 3. Find the user in MongoDB
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    throw new ApiError(401, 'The account belonging to this token no longer exists.');
  }

  // 4. Blocked account check
  if (currentUser.isBlocked) {
    throw new ApiError(403, 'Your account has been suspended. Please contact support.');
  }

  // 5. Attach user object to request
  req.user = currentUser;
  next();
});

module.exports = authenticate;
