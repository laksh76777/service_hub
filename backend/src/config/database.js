const mongoose = require('mongoose');
const config = require('./environment');

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('MongoDB already connected');
    return mongoose.connection;
  }

  const uri = config.mongodbUri;
  const dbName = config.mongodbDbName;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const conn = await mongoose.connect(uri, {
        dbName: dbName,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000
      });

      isConnected = true;
      console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting reconnection...');
        isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected successfully');
        isConnected = true;
      });

      return conn;
    } catch (error) {
      isConnected = false;
      console.warn(`[MongoDB] Connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt >= maxRetries) {
        console.error('Failed to connect to MongoDB Atlas after all retries:', error.message);
        throw error;
      }
      // Exponential backoff
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('MongoDB connection closed gracefully');
  }
};

const checkDbHealth = async () => {
  const readyStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const currentState = readyStateMap[mongoose.connection.readyState] || 'unknown';

  if (mongoose.connection.readyState !== 1) {
    return {
      isHealthy: false,
      state: currentState,
      name: mongoose.connection.name || config.mongodbDbName,
      error: 'Database is not connected'
    };
  }

  const startTime = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    const pingTimeMs = Date.now() - startTime;

    return {
      isHealthy: true,
      state: currentState,
      name: mongoose.connection.name,
      host: mongoose.connection.host,
      pingTimeMs: pingTimeMs
    };
  } catch (err) {
    return {
      isHealthy: false,
      state: currentState,
      name: mongoose.connection.name,
      error: err.message
    };
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  checkDbHealth
};
