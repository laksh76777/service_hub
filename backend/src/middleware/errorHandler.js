const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  // Log error with request ID correlation
  logger.error('Unhandled Server Error', {
    message: err.message,
    status: statusCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  }, req);

  // Prevent internal error message leakage in production
  const isProd = process.env.NODE_ENV === 'production';
  const userMessage = isProd && statusCode === 500
    ? 'An unexpected error occurred on the server. Please try again later.'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: userMessage,
    requestId: req.id || undefined,
    ...(!isProd && { stack: err.stack })
  });
};

module.exports = errorHandler;
