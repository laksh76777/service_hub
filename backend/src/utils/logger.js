/**
 * Structured Logger for ServiceHub
 * Outputs standardized JSON logs for production observability and security auditing.
 */

const formatLog = (level, message, meta = {}, req = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    requestId: req?.id || meta.requestId || undefined,
    ...meta
  };

  if (process.env.NODE_ENV === 'test') {
    // Keep test logs clean
    return;
  }

  const output = JSON.stringify(logEntry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
};

const logger = {
  info: (message, meta = {}, req = null) => formatLog('info', message, meta, req),
  warn: (message, meta = {}, req = null) => formatLog('warn', message, meta, req),
  error: (message, meta = {}, req = null) => formatLog('error', message, meta, req),
  securityAudit: (action, meta = {}, req = null) => {
    formatLog('security_audit', `[SECURITY AUDIT] ${action}`, {
      action,
      ip: req?.ip || req?.socket?.remoteAddress,
      userId: req?.user?._id || meta.userId,
      role: req?.user?.role || meta.role,
      ...meta
    }, req);
  }
};

/**
 * Express middleware to log requests with correlation IDs and execution time
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Don't log static health checks in production spam
    if (req.originalUrl === '/api/health') return;

    logger.info('HTTP Request Handled', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      userAgent: req.headers['user-agent']
    }, req);
  });

  next();
};

module.exports = {
  logger,
  requestLogger
};
