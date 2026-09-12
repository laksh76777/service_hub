const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME || 'servicehub',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'studio-9993233645-6a791',
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || null
};

module.exports = config;

