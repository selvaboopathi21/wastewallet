// Centralized Error Handling Middleware
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { nodeEnv } = require('../config/env');

// Catch 404 for undefined routes
const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Global error handler
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let { statusCode = 500, message = 'Internal Server Error' } = err;

  // Log error details
  if (statusCode >= 500) {
    logger.error(`[Server Error] ${err.message} \nStack: ${err.stack}`);
  } else {
    logger.warn(`[Client Error] ${statusCode} - ${err.message}`);
  }

  // Consistent response structure
  res.status(statusCode).json({
    success: false,
    message,
    ...(nodeEnv !== 'production' && { stack: err.stack }),
  });
};

module.exports = {
  notFound,
  errorHandler,
};
