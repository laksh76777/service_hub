const express = require('express');
const cors = require('cors');
const config = require('./config/environment');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: config.clientUrl || '*',
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
