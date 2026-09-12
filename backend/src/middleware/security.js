const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

/**
 * Helmet configuration for security headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: false, // Allows cross-origin media and fonts
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  ieNoOpen: true,
  noSniff: true,
  xssFilter: true
});

/**
 * Rate Limiter for general API traffic
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

/**
 * Stricter Rate Limiter for sensitive / auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

/**
 * Request correlation ID middleware
 */
const requestIdMiddleware = (req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
};

/**
 * NoSQL Injection Sanitizer
 * Recursively strips MongoDB query operators (starting with '$' or containing '.')
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    // Discard any key starting with '$' or containing '.'
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeData(value);
  }
  return clean;
};

const sanitizeInputMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeData(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeData(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeData(req.params);
  }
  next();
};

module.exports = {
  securityHeaders,
  apiLimiter,
  authLimiter,
  requestIdMiddleware,
  sanitizeInputMiddleware,
  sanitizeData
};
