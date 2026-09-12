const Redis = require('ioredis');
const config = require('./environment');

let redisClient = null;
let isConnected = false;

const initRedis = () => {
  if (redisClient) return redisClient;

  const redisOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 3) {
        // Stop spamming if Redis is not running locally
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true // Don't block startup
  };

  try {
    if (config.redis.url) {
      redisClient = new Redis(config.redis.url, redisOptions);
    } else {
      redisClient = new Redis(redisOptions);
    }

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('[Redis] Connected successfully.');
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      // Suppress unhandled crash if Redis is unavailable in local dev
      // console.warn('[Redis] Connection notice (resilient mode active):', err.message);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    // Try connecting asynchronously
    redisClient.connect().catch((err) => {
      isConnected = false;
    });
  } catch (err) {
    isConnected = false;
  }

  return redisClient;
};

const getRedisClient = () => {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
};

const isRedisAvailable = () => isConnected;

module.exports = {
  initRedis,
  getRedisClient,
  isRedisAvailable
};
