const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME || 'servicehub',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'studio-9993233645-6a791',
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || null,
  paymentMode: process.env.PAYMENT_MODE || 'demo',
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || undefined,
    enableOfflineQueue: false
  },
  geminiApiKey: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
};

module.exports = config;

