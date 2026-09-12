const express = require('express');
const cors = require('cors');
const config = require('./config/environment');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const {
  securityHeaders,
  apiLimiter,
  requestIdMiddleware,
  sanitizeInputMiddleware
} = require('./middleware/security');
const { requestLogger } = require('./utils/logger');

const app = express();

// Trust reverse proxy (for rate limiting behind proxies/load balancers)
app.set('trust proxy', 1);

// 1. Security Headers (Helmet)
app.use(securityHeaders);

// 2. Request Correlation ID
app.use(requestIdMiddleware);

// 3. Structured Request Logger
app.use(requestLogger);

// 4. Secure CORS Configuration
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || config.clientUrl === '*') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy violation: Origin not allowed.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
  })
);

// 5. Request Payload Size Limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// 6. NoSQL Injection Defense & Sanitization
app.use(sanitizeInputMiddleware);

// 7. Rate Limiting (applied to /api, disabled in automated test runs)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', apiLimiter);
}

// 8. API Routes
app.use('/api', routes);

// 9. 404 handler
app.use(notFound);

// 10. Centralized error handler
app.use(errorHandler);

module.exports = app;
